import { ResortSearch } from '@/components/snowfeed/ResortSearch';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useFavoriteResortsWeather, type ResortWeatherRow } from '@/hooks/useFavoriteResortsWeather';
import { useTranslation } from '@/hooks/useTranslation';
import { resortPageHref } from '@/navigation/resortPage';
import { weatherIconFor, weatherLabelKey } from '@/utils/weatherCode';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SortKey = 'default' | 'snow';

/** 新雪がこれ以上なら「新雪」の印を付ける（ホームの「新雪の朝」と同じ考え方） */
const FRESH_SNOW_CM = 10;

/**
 * お気に入りゲレンデの天気（ホームの天気カードの下の「お気に入りの天気」から開く）。
 * ホームゲレンデ＋♡を付けたゲレンデを1画面で見比べる。タップでそのゲレンデのページ（予報タブ）。
 * ♡ の追加・解除はこの画面の「ゲレンデを追加」からも（いつものゲレンデの一覧を開く）。
 */
export default function FavoriteResortsWeatherScreen() {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t } = useTranslation();
  const { rows, loading, error, refreshing, refetch, hasAny } = useFavoriteResortsWeather();
  const [sort, setSort] = useState<SortKey>('default');
  const [showPicker, setShowPicker] = useState(false);

  const sorted = useMemo(() => {
    if (sort === 'default') return rows;
    return [...rows].sort((a, b) => {
      const sa = (a.weather?.newSnowCm ?? -1) + (a.snowTomorrowCm ?? 0);
      const sb = (b.weather?.newSnowCm ?? -1) + (b.snowTomorrowCm ?? 0);
      return sb - sa;
    });
  }, [rows, sort]);

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]} accessibilityRole="header">
          {t('favoriteWeather.title')}
        </Text>
        <View style={styles.flex} />
        <Pressable
          onPress={() => setShowPicker(true)}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={t('favoriteWeather.add')}
          testID="favorite-weather-add"
        >
          <Ionicons name="add" size={26} color={c.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refetch()} tintColor={c.tintText} />}
      >
        {hasAny && rows.length > 1 ? (
          <View style={styles.sortRow}>
            <SegmentedToggle<SortKey>
              options={[
                { value: 'default', label: t('favoriteWeather.sortDefault') },
                { value: 'snow', label: t('favoriteWeather.sortSnow') },
              ]}
              value={sort}
              onChange={setSort}
              accessibilityLabel={t('favoriteWeather.sortLabel')}
            />
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.tintText} />
        ) : error ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: c.chipText }]}>{t('homeFeed.weatherUnavailable')}</Text>
            <PillButton title={t('common.retry')} icon="refresh" variant="secondary" onPress={() => refetch()} />
          </View>
        ) : !hasAny ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={32} color={c.textLabel} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>{t('favoriteWeather.emptyTitle')}</Text>
            <Text style={[styles.emptyText, { color: c.chipText }]}>{t('favoriteWeather.emptyText')}</Text>
            <PillButton title={t('favoriteWeather.add')} icon="heart-outline" onPress={() => setShowPicker(true)} />
          </View>
        ) : (
          <>
            {sorted.map((row) => (
              <WeatherRow key={row.id} row={row} />
            ))}
            <Text style={[styles.footnote, { color: c.textLabel }]}>{t('favoriteWeather.footnote')}</Text>
          </>
        )}
      </ScrollView>

      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPicker(false)}>
        <ResortSearch
          title={t('favoriteWeather.add')}
          onSelectResort={(id) => {
            setShowPicker(false);
            router.push(resortPageHref(id, 'forecast'));
          }}
          onClose={() => {
            setShowPicker(false);
            refetch();
          }}
          hasHomeResort
        />
      </Modal>
    </View>
  );
}

function WeatherRow({ row }: { row: ResortWeatherRow }) {
  const c = useAppColors();
  const { t } = useTranslation();
  const w = row.weather;
  const Icon = weatherIconFor(w?.weatherCode);
  const fresh = (w?.newSnowCm ?? 0) >= FRESH_SNOW_CM;

  const a11y = w
    ? t('favoriteWeather.rowA11y', {
        name: row.name,
        condition: t(weatherLabelKey(w.weatherCode)),
        temp: Math.round(w.tempC),
        snow: Math.round(w.newSnowCm),
      })
    : `${row.name} ${t('homeFeed.weatherUnavailable')}`;

  return (
    <Pressable
      onPress={() => router.push(resortPageHref(row.id, 'forecast'))}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.glassCardBackground, borderColor: c.glassCardBorder, opacity: pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      testID={`favorite-weather-${row.id}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
              {row.name}
            </Text>
            {row.isHome ? <Chip label={t('favoriteWeather.home')} tone="tint" icon="home" /> : null}
          </View>
          <Text style={[styles.condition, { color: c.textMuted }]}>
            {w ? t(weatherLabelKey(w.weatherCode)) : t('homeFeed.weatherUnavailable')}
          </Text>
        </View>
        {w ? (
          <View style={styles.tempBlock}>
            <Icon width={36} height={36} color={c.text} />
            <Text style={[styles.temp, { color: c.text }]}>{Math.round(w.tempC)}°</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={c.textLabel} />
      </View>

      {w ? (
        <View style={[styles.stats, { borderTopColor: c.glassDivider }]}>
          <Stat label={t('favoriteWeather.newSnow')} value={`${Math.round(w.newSnowCm)}cm`} highlight={fresh} />
          <Stat
            label={t('favoriteWeather.tomorrow')}
            value={row.snowTomorrowCm != null ? `${Math.round(row.snowTomorrowCm)}cm` : '—'}
          />
          <Stat label={t('favoriteWeather.next3Days')} value={row.snow3DaysCm != null ? `${Math.round(row.snow3DaysCm)}cm` : '—'} />
          <Stat label={t('favoriteWeather.wind')} value={`${Math.round(w.windMs)}m/s`} />
        </View>
      ) : null}
    </Pressable>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const c = useAppColors();
  return (
    <View style={styles.stat}>
      <View style={styles.statLabelRow}>
        <Text style={[styles.statLabel, { color: highlight ? c.hourHighlightText : c.textLabel }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: highlight ? c.hourHighlightText : c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  sortRow: { alignItems: 'flex-start', marginBottom: spacing.xs },
  card: { borderRadius: borderRadius.glass, borderWidth: 1.5, padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameBlock: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 1 },
  condition: { fontSize: fontSize.meta },
  tempBlock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  temp: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },
  stat: { flex: 1, gap: 2 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: fontSize.xxs },
  statValue: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  emptyText: { fontSize: fontSize.sm, lineHeight: 21, textAlign: 'center' },
  footnote: { fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
});
