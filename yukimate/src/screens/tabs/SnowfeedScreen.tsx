import { HomeWeatherCard } from '@/components/home/HomeWeatherCard';
import { ResortPostCard } from '@/components/resort/ResortPostCard';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { deleteOwnPost, reportPost, useResortPage, type ResortRef } from '@/hooks/useResortPage';
import { REPORT_REASON_KEYS } from '@/components/ReportSheet';
import type { ResortPageOptions, ResortPageTab } from '@/navigation/resortPage';
import { buildTodayColumns } from '@/utils/hourlyWeather';
import { getResortName } from '@/utils/resort-helpers';
import { PostCreateModal } from '@components/snowfeed/PostCreateModal';
import { ResortSearch } from '@components/snowfeed/ResortSearch';
import { WeatherForecast } from '@components/snowfeed/WeatherForecast';
import { Ionicons } from '@expo/vector-icons';
import { useSnowfeed } from '@hooks/useSnowfeed';
import { useTranslation } from '@hooks/useTranslation';
import { getAuthUser, supabase } from '@lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import type { SnowfeedPost } from '@types';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SnowfeedScreenProps extends ResortPageOptions {
  /** 表示するゲレンデ。省略時はホームゲレンデ（未設定なら設定から始める） */
  resortId?: string;
}

const TABS: ResortPageTab[] = ['posts', 'forecast', 'ratings'];
const TAB_LABEL_KEYS: Record<ResortPageTab, string> = {
  posts: 'resortPage.tabPosts',
  forecast: 'resortPage.tabForecast',
  ratings: 'resortPage.tabRatings',
};

/**
 * ゲレンデページ（旧 Snowfeed タブ）。app/resort から開くスタック画面。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Snowfeed.html（天気カードはホームの案Dと同じ）
 * - ヘッダー：戻る／ゲレンデ名▾（ゲレンデの一覧を開く。名前の横の ♡ でお気に入り、家のボタンでホームゲレンデにする）
 * - ホームゲレンデとお気に入りのチップ
 * - 天気（案D）→ このゲレンデのイベント → 投稿／予報／評価 → 下部の「ゲレンデの今を投稿」
 * TODO(ui-redesign)：投稿の場所タグとフィルター（雪質／混雑・リフト）は、feed_posts に項目ができたら追加する。
 */
export default function SnowfeedScreen({ resortId: routeResortId, initialTab }: SnowfeedScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();

  const [home, setHome] = useState<ResortRef | null>(null);
  const [selected, setSelected] = useState<ResortRef | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showFirstTimeSearch, setShowFirstTimeSearch] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [tab, setTab] = useState<ResortPageTab>(initialTab ?? 'posts');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showPostCreate, setShowPostCreate] = useState(false);
  const [menuPost, setMenuPost] = useState<SnowfeedPost | null>(null);
  const [reportTarget, setReportTarget] = useState<SnowfeedPost | null>(null);
  // 「参考になった」を押したあとの表示（投稿ID → 押した状態と件数）。
  // 件数は投稿を読み込んだ時点の値なので、押した直後はここで持ち、投稿を読み直したら消す
  // （以前は「押したかどうか」だけ先に読み直され、件数との差が打ち消されて 0 に戻っていた）
  const [helpfulOverrides, setHelpfulOverrides] = useState<Record<string, { on: boolean; count: number }>>({});

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  // ホームゲレンデと、表示するゲレンデを決める
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await getAuthUser();
        let homeRef: ResortRef | null = null;
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('home_resort:resorts!profiles_home_resort_id_fkey(id, name, name_en)')
            .eq('user_id', user.id)
            .maybeSingle();
          const r = (profile as any)?.home_resort;
          const resort = Array.isArray(r) ? r[0] : r;
          if (resort?.id) homeRef = { id: resort.id, name: getResortName(resort, locale) };
        }
        if (cancelled) return;
        setHome(homeRef);

        if (routeResortId) {
          const { data: routeResort } = await supabase
            .from('resorts')
            .select('id, name, name_en')
            .eq('id', routeResortId)
            .single();
          if (cancelled) return;
          if (routeResort) {
            setSelected({ id: routeResort.id, name: getResortName(routeResort, locale) });
            return;
          }
        }
        if (homeRef) {
          setSelected(homeRef);
        } else {
          setIsFirstTime(true);
          setShowFirstTimeSearch(true);
        }
      } catch (error) {
        console.error('Error loading resort data:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeResortId, locale]);

  const snowfeedState = useSnowfeed(selected?.id ?? null, refreshKey);
  const posts = snowfeedState.status === 'success' ? snowfeedState.data.posts : [];
  // 投稿を読み直したら、件数は新しい値を使う
  useEffect(() => {
    if (snowfeedState.status === 'success') setHelpfulOverrides({});
  }, [snowfeedState]);
  const page = useResortPage(selected?.id ?? null, selected?.name ?? null, posts.map((p) => p.id));
  const columns = useMemo(() => (page.hourly ? buildTodayColumns(page.hourly, new Date()) : null), [page.hourly]);

  const isHome = !!home && selected?.id === home.id;

  // ホームゲレンデ → お気に入りの順にチップで出す（＋ボタンは作らない。お気に入りは ♡ で登録）
  const quickResorts: (ResortRef & { isHome?: boolean })[] = [
    ...(home ? [{ ...home, isHome: true }] : []),
    ...page.favorites.filter((f) => f.id !== home?.id),
  ];

  // ---- 操作 ----
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  const showResort = (resort: ResortRef) => {
    setSelected(resort);
    setHelpfulOverrides({});
    setSwitcherOpen(false);
  };

  const saveHomeResort = async (resort: ResortRef) => {
    const {
      data: { user },
    } = await getAuthUser();
    if (!user) return false;
    const { error } = await supabase.from('profiles').update({ home_resort_id: resort.id }).eq('user_id', user.id);
    if (error) return false;
    setHome(resort);
    // ホームの天気・特集などを新しいホームゲレンデで取り直す
    queryClient.invalidateQueries({ queryKey: ['home'] });
    return true;
  };

  const handleFirstTimeSelect = async (id: string, name: string) => {
    const resort = { id, name };
    setShowFirstTimeSearch(false);
    setIsFirstTime(false);
    setSelected(resort);
    const ok = await saveHomeResort(resort);
    if (!ok) Alert.alert(t('resortPage.homeChangeFailed'));
  };

  const helpfulOn = (post: SnowfeedPost) => helpfulOverrides[post.id]?.on ?? page.myHelpful.has(post.id);
  const displayCount = (post: SnowfeedPost) => helpfulOverrides[post.id]?.count ?? post.likeCount;

  const handleToggleHelpful = async (post: SnowfeedPost) => {
    const on = helpfulOn(post);
    const count = displayCount(post);
    const previous = helpfulOverrides[post.id];
    setHelpfulOverrides((o) => ({ ...o, [post.id]: { on: !on, count: Math.max(0, count + (on ? -1 : 1)) } }));
    const ok = await page.toggleHelpful(post.id, on);
    if (!ok) {
      setHelpfulOverrides((o) => {
        const next = { ...o };
        if (previous) next[post.id] = previous;
        else delete next[post.id];
        return next;
      });
      Alert.alert(t('resortPage.helpfulFailed'));
    }
  };

  const handleDelete = (post: SnowfeedPost) => {
    setMenuPost(null);
    Alert.alert(t('resortPage.deleteConfirmTitle'), t('resortPage.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (!page.userId) return;
          const result = await deleteOwnPost(post.id, page.userId);
          if (result.success) {
            setRefreshKey((k) => k + 1);
            queryClient.invalidateQueries({ queryKey: ['home', 'resortPosts'] });
          } else {
            Alert.alert(t('resortPage.deleteFailed'));
          }
        },
      },
    ]);
  };

  const handleReport = async (post: SnowfeedPost, reasonKey: string) => {
    setReportTarget(null);
    if (!page.userId) return;
    const result = await reportPost(post.id, page.userId, t(reasonKey));
    if (result.success) {
      Alert.alert(t('resortPage.reportThanks'), t('resortPage.reportThanksMessage'));
    } else {
      Alert.alert(t('resortPage.reportFailed'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    await queryClient.invalidateQueries({ queryKey: ['resortPage'] });
    setRefreshing(false);
  };

  const openEvents = () =>
    router.navigate({
      pathname: '/(tabs)/search',
      params: { view: 'list', resortId: selected?.id ?? '', date: '', solo: '', t: String(Date.now()) },
    });

  // ---- 初回（ホームゲレンデ未設定） ----
  if (!selected && !isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <Pressable
          style={[styles.floatingBack, { top: Math.max(insets.top, 16) }]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <View style={styles.centered}>
          <Ionicons name="location-outline" size={56} color={c.textLabel} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>
            {isFirstTime ? t('snowfeed.setHomeResort') : t('snowfeed.selectResort')}
          </Text>
          <Text style={[styles.emptyText, { color: c.chipText }]}>
            {isFirstTime ? t('snowfeed.setHomeResortSubtitle') : t('snowfeed.selectResortSubtitle')}
          </Text>
          <PillButton title={t('snowfeed.setHomeResortButton')} icon="search" onPress={() => setShowFirstTimeSearch(true)} />
        </View>
        <Modal visible={showFirstTimeSearch} animationType="slide" presentationStyle="pageSheet">
          <ResortSearch
            onSelectResort={handleFirstTimeSelect}
            onClose={() => setShowFirstTimeSearch(false)}
            isFirstTime={isFirstTime}
            hasHomeResort={!!home}
          />
        </Modal>
      </View>
    );
  }

  if (!selected) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.tintText} />
      </View>
    );
  }

  const weather = snowfeedState.status === 'success' ? snowfeedState.data.weather : null;
  const rating = snowfeedState.status === 'success' ? snowfeedState.data.rating : null;
  const bottomBarHeight = touchTarget.min + spacing.md + Math.max(insets.bottom, spacing.sm);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* ヘッダー：戻る／ゲレンデ名▾／♡ */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={handleBack} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <Pressable
          onPress={() => setSwitcherOpen(true)}
          style={styles.titleButton}
          accessibilityRole="button"
          accessibilityLabel={`${selected.name}, ${t('resortPage.switchTitle')}`}
          testID="resort-switcher"
        >
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {selected.name}
          </Text>
          {isHome ? <Chip label={t('chips.home')} tone="tint" /> : null}
          <Ionicons name="chevron-down" size={18} color={c.text} />
        </Pressable>
        {/* お気に入りの ♡ はゲレンデの一覧（切り替え）の名前の横に置く */}
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomBarHeight + spacing.md }}
        // 下に引っ張って更新（天気・予報・投稿などを取れなかったときに手動で取り直す）
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.tintText} />}
      >
        {/* ホームゲレンデとお気に入り */}
        {quickResorts.length > 1 || (quickResorts.length === 1 && !quickResorts.some((r) => r.id === selected.id)) ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
            {quickResorts.map((r) => (
              <Chip
                key={r.id}
                label={r.name}
                icon={r.isHome ? 'home' : 'heart'}
                accessibilityLabel={r.isHome ? `${r.name}（${t('chips.home')}）` : r.name}
                selected={r.id === selected.id}
                onPress={() => showResort(r)}
              />
            ))}
          </ScrollView>
        ) : null}

        {/* 天気（ホームと同じ案D） */}
        <View style={styles.weatherBlock}>
          {snowfeedState.status === 'loading' ? (
            <ActivityIndicator color={c.tintText} />
          ) : weather && weather.tempC !== null ? (
            <HomeWeatherCard
              title={t('resortPage.currentConditions')}
              weather={{
                resortName: selected.name,
                temperatureC: weather.tempC,
                newSnowCm: weather.newSnowCm ?? 0,
                windSpeedMs: weather.windMs ?? 0,
                visibility: weather.visibility,
                weatherCode: weather.weatherCode,
              }}
              columns={columns}
            />
          ) : (
            <View style={[styles.unavailable, { backgroundColor: c.card }]}>
              <Ionicons name="cloud-offline-outline" size={24} color={c.textLabel} />
              <Text style={[styles.emptyText, { color: c.chipText }]}>{t('homeFeed.weatherUnavailable')}</Text>
            </View>
          )}
        </View>

        {/* このゲレンデのイベント */}
        <Pressable
          onPress={openEvents}
          style={({ pressed }) => [styles.eventsBanner, { backgroundColor: c.card }, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          testID="resort-events-banner"
        >
          <View style={[styles.eventsIcon, { backgroundColor: c.tintChipBackground }]}>
            <Ionicons name="people" size={20} color={c.tintText} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.bannerTitle, { color: c.text }]}>{t('resortPage.eventsBannerTitle')}</Text>
            <Text style={[styles.bannerSub, { color: c.chipText }]}>
              {t('resortPage.eventsBannerCounts', { weekend: page.eventCounts.weekend, solo: page.eventCounts.solo })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textLabel} />
        </Pressable>

        {/* ページ内タブ */}
        <View style={[styles.tabs, { borderBottomColor: c.divider }]} accessibilityRole="tablist">
          {TABS.map((key) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, { borderBottomColor: active ? c.tintText : 'transparent' }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, { color: active ? c.text : c.textLabel, fontWeight: active ? fontWeight.bold : fontWeight.medium }]}>
                  {t(TAB_LABEL_KEYS[key])}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 投稿 */}
        {tab === 'posts' ? (
          snowfeedState.status === 'loading' ? (
            <ActivityIndicator color={c.tintText} style={styles.tabLoading} />
          ) : snowfeedState.status === 'error' ? (
            <Text style={[styles.tabEmpty, { color: c.danger }]}>{t('snowfeed.loadError')}</Text>
          ) : posts.length === 0 ? (
            <Text style={[styles.tabEmpty, { color: c.textLabel }]}>{t('snowfeed.noPosts')}</Text>
          ) : (
            posts.map((post) => (
              <ResortPostCard
                key={post.id}
                post={{ ...post, likeCount: displayCount(post) }}
                helpfulOn={helpfulOn(post)}
                onToggleHelpful={() => handleToggleHelpful(post)}
                onOpenMenu={() => setMenuPost(post)}
              />
            ))
          )
        ) : null}

        {/* 予報 */}
        {tab === 'forecast' ? (
          <View style={styles.tabBody}>
            {page.forecastLoading ? (
              <ActivityIndicator color={c.tintText} style={styles.tabLoading} />
            ) : (
              <WeatherForecast forecast={page.forecast} />
            )}
          </View>
        ) : null}

        {/* 評価 */}
        {tab === 'ratings' ? (
          <View style={styles.tabBody}>
            {rating && rating.votesCount > 0 ? (
              <View style={[styles.ratingCard, { backgroundColor: c.card }]}>
                <View style={styles.ratingHeader}>
                  <Text style={[styles.bannerTitle, { color: c.text }]}>{t('resortPage.ratingsTitle')}</Text>
                  <Text style={[styles.bannerSub, { color: c.textLabel }]}>{t('resortPage.votes', { count: rating.votesCount })}</Text>
                </View>
                {([
                  ['resortPage.ratingPowder', rating.powder],
                  ['resortPage.ratingCarving', rating.carving],
                  ['resortPage.ratingFamily', rating.family],
                  ['resortPage.ratingPark', rating.park],
                  ['resortPage.ratingNight', rating.night],
                ] as [string, number | null][])
                  .filter(([, v]) => v !== null)
                  .map(([key, value]) => (
                    <View key={key} style={styles.ratingRow} accessible accessibilityLabel={`${t(key)} ${value!.toFixed(1)} / 5`}>
                      <Text style={[styles.ratingLabel, { color: c.chipText }]}>{t(key)}</Text>
                      <View style={[styles.ratingTrack, { backgroundColor: c.chipBackground }]}>
                        <View style={[styles.ratingBar, { width: `${(value! / 5) * 100}%`, backgroundColor: c.tintText }]} />
                      </View>
                      <Text style={[styles.ratingValue, { color: c.text }]}>{value!.toFixed(1)}</Text>
                    </View>
                  ))}
                {rating.overall !== null ? (
                  <View style={[styles.overallRow, { borderTopColor: c.divider }]}>
                    <Text style={[styles.bannerTitle, { color: c.text }]}>{t('resortPage.ratingOverall')}</Text>
                    <Text style={[styles.overallValue, { color: c.tintText }]}>{rating.overall.toFixed(1)} / 5.0</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.tabEmpty, { color: c.textLabel }]}>{t('resortPage.noRatings')}</Text>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* 下部に固定：ゲレンデの今を投稿（右下の丸いボタンは廃止） */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: c.background, borderTopColor: c.divider, paddingBottom: Math.max(insets.bottom, spacing.sm) },
        ]}
      >
        <PillButton title={t('resortPage.postResortNow')} icon="camera" onPress={() => setShowPostCreate(true)} fill testID="resort-post" />
      </View>

      {/* ゲレンデの切り替え（♡ でお気に入り、家のボタンでホームゲレンデにする） */}
      <Modal
        visible={switcherOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSwitcherOpen(false)}
      >
        <ResortSearch
          title={t('resortPage.switchTitle')}
          selectedId={selected.id}
          showHomeAction
          hasHomeResort={!!home}
          onSelectResort={(id, name) => showResort({ id, name })}
          onHomeChanged={(id, name) => setHome({ id, name })}
          onClose={() => setSwitcherOpen(false)}
        />
      </Modal>

      {/* 投稿の「…」：自分の投稿は削除、ほかの人の投稿は通報 */}
      <ActionSheet
        visible={!!menuPost}
        onClose={() => setMenuPost(null)}
        cancelLabel={t('common.cancel')}
        actions={
          menuPost && menuPost.userId === page.userId
            ? [{ label: t('resortPage.deletePost'), icon: 'trash-outline', destructive: true, onPress: () => handleDelete(menuPost) }]
            : menuPost
              ? [
                  {
                    label: t('resortPage.reportPost'),
                    icon: 'flag-outline',
                    onPress: () => {
                      const target = menuPost;
                      setMenuPost(null);
                      setTimeout(() => setReportTarget(target), 350);
                    },
                  },
                ]
              : []
        }
      />
      <ActionSheet
        visible={!!reportTarget}
        title={t('resortPage.reportTitle')}
        onClose={() => setReportTarget(null)}
        cancelLabel={t('common.cancel')}
        actions={REPORT_REASON_KEYS.map((key) => ({
          label: t(key),
          onPress: () => reportTarget && handleReport(reportTarget, key),
        }))}
      />

      <PostCreateModal
        visible={showPostCreate}
        resortId={selected.id}
        resortName={selected.name}
        onClose={() => setShowPostCreate(false)}
        onPostCreated={() => {
          setShowPostCreate(false);
          setTab('posts');
          setRefreshKey((k) => k + 1);
          queryClient.invalidateQueries({ queryKey: ['home', 'resortPosts'] });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm + 4,
  },
  floatingBack: {
    position: 'absolute',
    left: spacing.sm,
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: 6,
    gap: 4,
  },
  iconButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleButton: {
    flex: 1,
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 19,
    fontWeight: '900',
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  weatherBlock: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 18,
  },
  unavailable: {
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventsBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.card,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    minHeight: touchTarget.min + 12,
  },
  eventsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  bannerSub: {
    fontSize: 12,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
  },
  tabBody: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  tabLoading: {
    marginTop: spacing.lg,
  },
  tabEmpty: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  ratingCard: {
    borderRadius: borderRadius.card,
    padding: spacing.md,
    gap: 10,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ratingLabel: {
    width: 84,
    fontSize: 13,
  },
  ratingTrack: {
    flex: 1,
    height: 8,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    borderRadius: borderRadius.pill,
  },
  ratingValue: {
    width: 32,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 4,
  },
  overallValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switcher: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  switcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  switcherTitle: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  setHomeButton: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  switcherRow: {
    minHeight: touchTarget.min + 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  switcherRowText: {
    flex: 1,
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
    marginTop: spacing.md,
  },
  searchOther: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
