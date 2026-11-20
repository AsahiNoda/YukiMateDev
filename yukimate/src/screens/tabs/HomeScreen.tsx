import { ApplicationStatusRow } from '@/components/home/ApplicationStatusRow';
import { FEATURED_CARD_WIDTH, FeaturedEventCard } from '@/components/home/FeaturedEventCard';
import { HomeTopSlider, type HomeSlide } from '@/components/home/HomeTopSlider';
import { HomeWeatherCard } from '@/components/home/HomeWeatherCard';
import { NextPlanCard, useDaysLabel } from '@/components/home/NextPlanCard';
import { NoPlanCard } from '@/components/home/NoPlanCard';
import { RecommendedEventRow } from '@/components/home/RecommendedEventRow';
import { ResortNowSection } from '@/components/home/ResortNowSection';
import { WeeklySnowChart } from '@/components/home/WeeklySnowChart';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { usePendingRequestCount } from '@/hooks/usePendingRequestCount';
import { useTranslation } from '@/hooks/useTranslation';
import { resortPageHref } from '@/navigation/resortPage';
import { buildTodayColumns, POWDER_ALERT_CM, snowUntilTomorrowMorning } from '@/utils/hourlyWeather';
import { getResortName } from '@/utils/resort-helpers';
import { useHomeData } from '@hooks/useHomeData';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import HomeBgMountain from '../../../assets/images/home-bg-mountain.svg';

/** ホーム背景の山の絵（viewBox 404x339）。画面幅より少し大きくして左右・上下にはみ出させる */
const WINDOW_WIDTH = Dimensions.get('window').width;
const MOUNTAIN_WIDTH = WINDOW_WIDTH * 1.2;
const MOUNTAIN_HEIGHT = MOUNTAIN_WIDTH * (339.35 / 404.48);
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const pad = (n: number) => String(n).padStart(2, '0');
const toDateParam = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 同じ条件で開き直したときにも、開いた先が条件を付け直すための値 */
const requestId = () => String(Date.now());

/**
 * ホーム（docs/ui-redesign/README.md「3. ホーム」）。上から：
 * ヘッダー（アプリ名だけ）→ 天気（案D）／次の予定のスライド → 予定がないときの入口 → 申請ステータス
 * → 週間の雪予報 → 今週末の特集 → あなたに合いそう → ゲレンデの今
 * クイックアクション（保存／マイ投稿／作成）、右上の＋と歯車は削除した（保存・主催はマイページへ）。
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();

  // ホームに戻ってきたら、申請の件数（返事待ち・届いたリクエスト）を取り直す
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['home', 'myPendingApplications'] });
    }, [queryClient])
  );
  const state = useHomeData();
  const resort = state.favorites.find((f) => f.id === state.selectedResortId) ?? null;
  const feed = useHomeFeed(resort);
  const receivedRequests = usePendingRequestCount();
  const daysLabel = useDaysLabel();
  const [refreshing, setRefreshing] = useState(false);

  const sliderWidth = WINDOW_WIDTH - spacing.md * 2;
  const resortName = resort ? getResortName(resort, locale) : null;

  const columns = useMemo(() => (feed.hourly ? buildTodayColumns(feed.hourly, new Date()) : null), [feed.hourly]);
  const powderCm = useMemo(() => {
    if (!feed.hourly) return null;
    const cm = snowUntilTomorrowMorning(feed.hourly, new Date());
    return cm >= POWDER_ALERT_CM ? Math.round(cm) : null;
  }, [feed.hourly]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['home'] });
    setRefreshing(false);
  }, [queryClient]);

  // ---- 遷移 ----
  const openResortPage = (tab: 'forecast' | 'posts') => router.push(resortPageHref(resort?.id, tab));
  const openEvent = (eventId: string) => router.push({ pathname: '/event-detail', params: { eventId } });
  const openSearch = (filters: { date?: string; solo?: boolean; resortId?: string }) =>
    router.navigate({
      pathname: '/(tabs)/search',
      params: {
        view: 'list',
        date: filters.date ?? '',
        solo: filters.solo ? '1' : '',
        resortId: filters.resortId ?? '',
        t: requestId(),
      },
    });
  const openCreate = (preset?: { date?: Date; startTime?: string }) =>
    router.navigate({
      pathname: '/(tabs)/create',
      params: {
        eventId: '',
        presetDate: preset?.date ? toDateParam(preset.date) : '',
        presetStartTime: preset?.startTime ?? '',
        presetResortId: preset ? resort?.id ?? '' : '',
        t: requestId(),
      },
    });
  const openMyEvents = () => router.push('/my-posts' as any);
  const openRequests = () =>
    router.navigate({
      pathname: '/(tabs)/chat',
      params: { tab: receivedRequests > 0 ? 'requests' : 'chats', t: requestId() },
    });

  // ---- 読み込み中・エラー ----
  if (state.status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.tintText} />
        <Text style={[styles.loadingText, { color: c.chipText }]}>{t('home.loadingConditions')}</Text>
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Text style={[styles.errorText, { color: c.danger }]}>{t('home.loadFailed')}</Text>
        <Text style={[styles.loadingText, { color: c.chipText }]}>{state.error}</Text>
      </View>
    );
  }

  const weather = state.data.weather as any;

  // ---- 上部のスライド：1枚目＝天気、2枚目＝次の予定（参加が確定したイベントがあるときだけ） ----
  const slides: HomeSlide[] = [];
  if (resort && !weather && state.data.weatherLoading) {
    // 天気を取得中（ホームの他の部分は先に表示する）
    slides.push({
      key: 'weather',
      label: t('homeFeed.slideWeather'),
      render: (height) => (
        <View style={[styles.weatherUnavailable, { backgroundColor: c.card, minHeight: height ?? 180 }]}>
          <ActivityIndicator color={c.tintText} />
          <Text style={[styles.setupText, { color: c.chipText }]}>{t('home.loadingConditions')}</Text>
        </View>
      ),
    });
  } else if (resort && !weather) {
    // 天気を取得できなかったとき（オフライン・Open-Meteo の障害など）
    slides.push({
      key: 'weather',
      label: t('homeFeed.slideWeather'),
      render: (height) => (
        <View style={[styles.weatherUnavailable, { backgroundColor: c.card, minHeight: height }]}>
          <Ionicons name="cloud-offline-outline" size={28} color={c.textLabel} />
          <Text style={[styles.setupTitle, { color: c.text }]}>{resortName}</Text>
          <Text style={[styles.setupText, { color: c.chipText }]}>{t('homeFeed.weatherUnavailable')}</Text>
          <PillButton title={t('common.retry')} icon="refresh" variant="secondary" onPress={onRefresh} />
        </View>
      ),
    });
  }
  if (resort && weather) {
    slides.push({
      key: 'weather',
      label: t('homeFeed.slideWeather'),
      render: () => (
        <HomeWeatherCard
          showMountain={false}
          weather={{ ...weather, resortName: weather.resortName ?? resortName ?? '' }}
          columns={columns}
          onPressMore={() => openResortPage('forecast')}
        />
      ),
    });
  }
  if (feed.nextPlan) {
    const plan = feed.nextPlan;
    slides.push({
      key: 'nextPlan',
      label: `${t('homeFeed.slideNextPlan')} ・ ${daysLabel(plan.startAt)}`,
      render: () => (
        <NextPlanCard
          plan={plan}
          onOpenChat={() => router.push(`/event-chat/${plan.id}` as any)}
          onOpenDetail={() => openEvent(plan.id)}
          onOpenMyEvents={openMyEvents}
        />
      ),
    });
  }

  // 一致したスタイルの表示名
  const styleLabel = (s: string) => {
    const label = t(`ridingStyles.${s}`);
    return label === `ridingStyles.${s}` ? s : label;
  };
  const rec = feed.recommended;
  const reasonItems = [
    ...(rec.level ? [t(`levels.${rec.level}`)] : []),
    ...rec.styles.slice(0, 2).map(styleLabel),
  ].map((text) => t('homeFeed.quoted', { text }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) + 4 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.tintText} />}
    >
      {/* ヘッダー：アプリ名と、右上にお問い合わせ（ゲレンデ名・歯車・投稿の＋は削除） */}
      <View style={styles.headerRow}>
        <Text style={[styles.appName, { color: c.text }]} accessibilityRole="header">
          Slope Link
        </Text>
        <Pressable
          onPress={() => router.push('/inquiry' as any)}
          style={({ pressed }) => [styles.headerIconButton, { backgroundColor: c.chipBackground }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={t('inquiry.title')}
          testID="home-inquiry"
        >
          <Ionicons name="mail-outline" size={20} color={c.text} />
        </Pressable>
      </View>

      {/* お気に入りゲレンデが複数あるときの切り替え */}
      {state.favorites.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resortChips} style={styles.resortChipsScroll}>
          {state.favorites.map((fav) => (
            <Chip
              key={fav.id}
              label={getResortName(fav, locale)}
              icon={fav.isHome ? 'home' : undefined}
              accessibilityLabel={fav.isHome ? `${getResortName(fav, locale)}（${t('chips.home')}）` : undefined}
              selected={fav.id === state.selectedResortId}
              onPress={() => state.setSelectedResortId(fav.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* ゲレンデ未登録 */}
      {!resort ? (
        <View style={[styles.setupCard, { backgroundColor: c.card }]}>
          <Ionicons name="location-outline" size={28} color={c.tintText} />
          <Text style={[styles.setupTitle, { color: c.text }]}>{t('home.noHomeResort')}</Text>
          <Text style={[styles.setupText, { color: c.chipText }]}>{t('home.setHomeResortFromSnowfeed')}</Text>
          <PillButton title={t('snowfeed.setHomeResortButton')} icon="location-outline" onPress={() => router.push(resortPageHref())} />
        </View>
      ) : null}

      {/* 天気／次の予定 */}
      {slides.length > 0 ? (
        <View style={styles.sliderBlock}>
          {/* ホーム画面の背景の山（天気カードより大きく、画面の端まで・上下にもはみ出す）。
              横スライダーの中に置くと切れるので、スライダーの外の後ろに置く */}
          <View style={styles.homeMountain} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <HomeBgMountain
              width={MOUNTAIN_WIDTH}
              height={MOUNTAIN_HEIGHT}
              preserveAspectRatio="xMidYMid meet"
              style={{ opacity: 0.6 }}
            />
          </View>
          <HomeTopSlider slides={slides} width={sliderWidth} />
        </View>
      ) : null}

      {/* お気に入りゲレンデの天気（ホーム＋♡のゲレンデを見比べる） */}
      {resort ? (
        <Pressable
          onPress={() => router.push('/favorite-weather' as any)}
          style={styles.favWeatherLink}
          accessibilityRole="link"
          testID="home-favorite-weather"
        >
          <Ionicons name="heart-outline" size={16} color={c.tintText} />
          <Text style={[styles.favWeatherText, { color: c.tintText }]}>{t('favoriteWeather.open')}</Text>
          <Ionicons name="chevron-forward" size={14} color={c.tintText} />
        </Pressable>
      ) : null}

      {/* 予定がないとき：次の予定の位置に入口カード */}
      {resort && feed.nextPlanLoaded && !feed.nextPlan ? (
        <View style={styles.block}>
          <NoPlanCard
            soloCount={feed.soloWeekendCount}
            resortName={resortName}
            onSearch={() => openSearch({ date: 'thisWeekend', solo: true, resortId: resort.id })}
            onCreate={() => openCreate()}
            onOpenMyEvents={openMyEvents}
          />
        </View>
      ) : null}

      {/* 申請ステータス */}
      <View style={styles.statusRow}>
        <ApplicationStatusRow pending={feed.myPendingApplications} received={receivedRequests} onPress={openRequests} />
      </View>

      {/* 週間の雪予報 */}
      {feed.dailySnow && feed.dailySnow.length > 0 ? (
        <View style={styles.section}>
          <WeeklySnowChart days={feed.dailySnow} />
        </View>
      ) : null}

      {/* 注目の投稿（ゲレンデに関係なく、新しく投稿されたこれからのイベント）。週間の雪予報の次に置く */}
      {feed.featuredPosts.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={t('home.featuredPosts')} linkLabel={t('actions.seeAll')} onPressLink={() => openSearch({})} />
          <FlatList
            horizontal
            data={feed.featuredPosts}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => <FeaturedEventCard event={item} onPress={() => openEvent(item.id)} />}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={FEATURED_CARD_WIDTH + 14}
            decelerationRate="fast"
            style={styles.bleed}
            contentContainerStyle={styles.bleedContent}
          />
        </View>
      ) : null}

      {/* ◯◯の投稿（このゲレンデでこれから開催されるイベント） */}
      {resort ? (
        <View style={styles.section}>
          <SectionHeader
            title={t('homeFeed.featuredTitle', { resort: resortName ?? '' })}
            linkLabel={feed.featured.length > 0 ? t('actions.seeAll') : undefined}
            onPressLink={() => openSearch({ resortId: resort.id })}
          />
          {feed.featured.length > 0 ? (
            <FlatList
              horizontal
              data={feed.featured}
              keyExtractor={(e) => e.id}
              renderItem={({ item }) => <FeaturedEventCard event={item} onPress={() => openEvent(item.id)} />}
              ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
              showsHorizontalScrollIndicator={false}
              snapToInterval={FEATURED_CARD_WIDTH + 14}
              decelerationRate="fast"
              style={styles.bleed}
              contentContainerStyle={styles.bleedContent}
            />
          ) : feed.featuredLoaded ? (
            // 0件のときは「自分で作る」の入口
            <View style={[styles.emptyFeatured, { backgroundColor: c.card, borderColor: c.dashedBorder }]}>
              <View style={styles.emptyFeaturedText}>
                <Text style={[styles.emptyTitle, { color: c.text }]}>{t('homeFeed.featuredEmpty')}</Text>
                <Text style={[styles.emptySub, { color: c.chipText }]}>{t('homeFeed.featuredEmptySubtitle')}</Text>
              </View>
              <PillButton title={t('actions.createYourself')} size="sm" icon="add" onPress={() => openCreate()} />
            </View>
          ) : (
            <ActivityIndicator color={c.tintText} />
          )}
        </View>
      ) : null}

      {/* あなたに合いそう */}
      {rec.events.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title={t('homeFeed.recommendedTitle')}
            linkLabel={t('homeFeed.seeMore')}
            onPressLink={() => openSearch({})}
          />
          {reasonItems.length > 0 ? (
            <Text style={[styles.reason, { color: c.textLabel }]}>
              {t('homeFeed.recommendedFrom', { items: reasonItems.join('') })}
            </Text>
          ) : null}
          <View style={styles.recList}>
            {rec.events.map((e) => {
              const tags = e.tags.map((x) => x.toLowerCase());
              const matched = rec.styles.filter((s) => tags.includes(s.toLowerCase())).map(styleLabel);
              return <RecommendedEventRow key={e.id} event={e} matchedStyles={matched} onPress={() => openEvent(e.id)} />;
            })}
          </View>
        </View>
      ) : null}

      {/* ゲレンデの今 */}
      {resort ? (
        <View style={styles.section}>
          <SectionHeader title={t('homeFeed.resortNow')} linkLabel={t('homeFeed.viewPosts')} onPressLink={() => openResortPage('posts')} />
          <ResortNowSection
            powderCm={powderCm}
            posts={feed.resortPosts}
            onPressPost={() => openResortPage('posts')}
            onMakeEarlyGroup={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              openCreate({ date: tomorrow, startTime: '08:00' });
            }}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function SectionHeader({ title, linkLabel, onPressLink }: { title: string; linkLabel?: string; onPressLink?: () => void }) {
  const c = useAppColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: c.text }]} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {linkLabel && onPressLink ? (
        <Pressable onPress={onPressLink} hitSlop={12} accessibilityRole="link">
          <Text style={[styles.sectionLink, { color: c.tintText }]}>{linkLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.heavy,
    letterSpacing: 0.3,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resortChipsScroll: {
    flexGrow: 0,
    marginHorizontal: -spacing.md,
    marginBottom: 14,
  },
  resortChips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  weatherUnavailable: {
    borderRadius: borderRadius.glass,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  setupCard: {
    borderRadius: borderRadius.glass,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  setupTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  setupText: {
    fontSize: fontSize.meta,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  sliderBlock: {
    marginBottom: 6,
  },
  homeMountain: {
    position: 'absolute',
    top: -MOUNTAIN_HEIGHT * 0.22,
    left: -spacing.md - (MOUNTAIN_WIDTH - WINDOW_WIDTH) / 2,
    width: MOUNTAIN_WIDTH,
    height: MOUNTAIN_HEIGHT,
  },
  favWeatherLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  favWeatherText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.semibold,
  },
  block: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusRow: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: 26,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    gap: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  sectionLink: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
  },
  bleed: {
    marginHorizontal: -spacing.md,
  },
  bleedContent: {
    paddingHorizontal: spacing.md,
  },
  emptyFeatured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 14,
  },
  emptyFeaturedText: {
    flex: 1,
    gap: 2,
  },
  emptyTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  emptySub: {
    fontSize: fontSize.xs,
  },
  reason: {
    fontSize: fontSize.xs,
    marginTop: -4,
    marginBottom: 10,
  },
  recList: {
    gap: 10,
  },
});
