import { PillButton } from '@/components/ui/PillButton';
import { EventListCard } from '@/components/EventListCard';
import { ResortSearch } from '@/components/snowfeed/ResortSearch';
import { Chip } from '@/components/ui/Chip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { ACTIVITY_TYPES, type ActivityType } from '@/constants/activities';
import { getAreaOrder } from '@/constants/areas';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useExplore, type ExploreFilters, type SortOptions } from '@/hooks/useExplore';
import { useResorts } from '@/hooks/useResorts';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { resortPageHref } from '@/navigation/resortPage';
import { DATE_PRESETS, getDateRange, getDayRange, type DatePreset } from '@/utils/dateRanges';
import { formatEventDate } from '@/utils/formatEventDate';
import { categoryLabel, levelLabel } from '@/utils/eventDisplay';
import { getResortName, getResortPrefecture } from '@/utils/resort-helpers';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = ['event', 'lesson', 'filming', 'group'] as const;
const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
type LevelFilter = (typeof LEVELS)[number];

/** 検索欄・絞り込みの列・件数と並び替えの列の間隔（どこも同じにする） */
const SECTION_GAP = 14;

const SORT_OPTIONS = [
  { key: 'date', labelKey: 'explore.sortDateAsc' },
  { key: 'popular', labelKey: 'explore.sortPopular' },
  { key: 'newest', labelKey: 'explore.sortNewest' },
];

/** 外から条件を付けて開くとき（ホームの「◯件をさがすで見る」など） */
export interface ExploreInitialFilters {
  datePreset?: DatePreset;
  soloOnly?: boolean;
  resortId?: string;
  /** 同じ条件で開き直したときにも付け直すための値 */
  requestId?: string;
}

interface ExploreScreenProps {
  /** 上部に出すヘッダー（「さがす」タイトルとリスト／スワイプの切り替え）。SearchScreen から渡す */
  header?: React.ReactNode;
  /** 最初に付けておく条件。変わったら（＝別の入口から開き直したら）付け直す */
  initialFilters?: ExploreInitialFilters;
}

export default function ExploreScreen({ header, initialFilters }: ExploreScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const c = useAppColors();
  const { t, locale } = useTranslation();

  // 検索とフィルター状態
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExploreFilters['category'] | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityType | null>(null);
  const [sortOption, setSortOption] = useState<SortOptions>({
    sortBy: 'date',
    order: 'asc',
  });

  // 日付：今日・明日・今週末、または日にちを選ぶ（端末の日付ピッカー）
  const [datePreset, setDatePreset] = useState<DatePreset | null>(null);
  const [pickedDay, setPickedDay] = useState<Date | null>(null);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LevelFilter | null>(null);
  const [soloOnly, setSoloOnly] = useState(false);

  // UI状態
  const [showSortModal, setShowSortModal] = useState(false);
  const [openSheet, setOpenSheet] = useState<'date' | 'category' | 'level' | 'activity' | null>(null);
  const [selectedResort, setSelectedResort] = useState<string | null>(null);

  // 外から渡された条件を付ける（同じ条件で開き直したときも付け直す）
  const initialKey = initialFilters ? JSON.stringify(initialFilters) : '';
  useEffect(() => {
    if (!initialFilters) return;
    setPickedDay(null);
    setDatePreset(initialFilters.datePreset ?? null);
    setSoloOnly(!!initialFilters.soloOnly);
    setSelectedResort(initialFilters.resortId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);
  const [showResortModal, setShowResortModal] = useState(false);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  // リゾート一覧を取得
  const resortsState = useResorts();

  // エリアの並び順（北から南）
  // エリアの並び順（北から南）
  const AREA_ORDER = getAreaOrder(locale);

  // Group resorts by area
  const resortsByArea = React.useMemo(() => {
    if (resortsState.status !== 'success') return {};

    const grouped: Record<string, typeof resortsState.resorts> = {};
    resortsState.resorts.forEach((resort) => {
      // 英語の場合はregion、日本語の場合はareaを使用
      const areaKey = getResortPrefecture(resort, locale);
      if (!grouped[areaKey]) {
        grouped[areaKey] = [];
      }
      grouped[areaKey].push(resort);
    });

    // Sort areas by AREA_ORDER
    const sortedGrouped: Record<string, typeof resortsState.resorts> = {};
    AREA_ORDER.forEach((area) => {
      if (grouped[area]) {
        sortedGrouped[area] = grouped[area];
      }
    });
    // Add any areas not in AREA_ORDER at the end
    Object.keys(grouped)
      .filter((area) => !AREA_ORDER.includes(area))
      .sort()
      .forEach((area) => {
        sortedGrouped[area] = grouped[area];
      });

    return sortedGrouped;
  }, [resortsState, locale]);

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 検索クエリとフィルターを統合。
  // 配列・オブジェクトを毎回作り直すと useExplore が描画のたびに再取得するので、useMemo で固定する
  const resortIds = useMemo(() => (selectedResort ? [selectedResort] : undefined), [selectedResort]);
  const dateRange = useMemo(
    () => (pickedDay ? getDayRange(pickedDay) : datePreset ? getDateRange(datePreset) : undefined),
    [datePreset, pickedDay]
  );
  const dateChipLabel = pickedDay
    ? formatEventDate(pickedDay, t, { withTime: false })
    : datePreset
      ? t(`dateFormat.${datePreset}`)
      : null;
  const combinedFilters: ExploreFilters = {
    keyword: debouncedQuery || undefined,
    category: selectedCategory ? selectedCategory : undefined,
    resortIds,
    skillLevel: levelFilter ?? undefined,
    dateRange,
    soloOnly: soloOnly || undefined,
    activities: activityFilter ? [activityFilter] : undefined,
  };

  const selectedResortName =
    selectedResort && resortsState.status === 'success'
      ? (() => {
          const r = resortsState.resorts.find((x) => x.id === selectedResort);
          return r ? getResortName(r, locale) : null;
        })()
      : null;
  const sortLabel = t(SORT_OPTIONS.find((o) => o.key === sortOption.sortBy)?.labelKey ?? 'explore.sortDateAsc');

  // データ取得
  const { status, events, hasMore, refetch, loadMore } = useExplore(
    combinedFilters,
    sortOption
  ) as any;

  const handleEventPress = (eventId: string) => {
    router.push({
      pathname: '/event-detail',
      params: { eventId },
    } as any);
  };

  const handleSortSelect = (key: string) => {
    const option = SORT_OPTIONS.find(o => o.key === key);
    if (option) {
      setSortOption({
        sortBy: key as SortOptions['sortBy'],
        order: key === 'date' ? 'asc' : 'desc',
      });
      setShowSortModal(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ヘッダー */}
      <View style={{ paddingTop: Math.max(insets.top, 10) }}>
        {header}
      </View>

      {/* 検索バー */}
      <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('explore.searchPlaceholder')}
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol name="xmark.circle.fill" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      {/* フィルター：ゲレンデ・日付・カテゴリ・レベル（選択中は塗り） */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        <Chip
          label={selectedResortName ?? t('search.filterResort')}
          selected={!!selectedResort}
          showCaret
          onPress={() => setShowResortModal(true)}
          testID="filter-resort"
        />
        <Chip
          label={dateChipLabel ?? t('search.filterDate')}
          selected={!!dateChipLabel}
          showCaret
          onPress={() => setOpenSheet('date')}
          testID="filter-date"
        />
        <Chip
          label={selectedCategory ? categoryLabel(selectedCategory, t) : t('search.filterCategory')}
          selected={!!selectedCategory}
          showCaret
          onPress={() => setOpenSheet('category')}
          testID="filter-category"
        />
        <Chip
          label={activityFilter ? t(`activities.${activityFilter}`) : t('activities.label')}
          selected={!!activityFilter}
          showCaret
          onPress={() => setOpenSheet('activity')}
          testID="filter-activity"
        />
        <Chip
          label={levelFilter ? levelLabel(levelFilter, t) ?? t('search.filterLevel') : t('search.filterLevel')}
          selected={!!levelFilter}
          showCaret
          onPress={() => setOpenSheet('level')}
          testID="filter-level"
        />
        <Chip
          label={t('chips.soloOk')}
          selected={soloOnly}
          icon={soloOnly ? 'checkmark' : undefined}
          onPress={() => setSoloOnly((v) => !v)}
          testID="filter-solo"
        />
      </ScrollView>

      {/* 件数と並び替え（右下の並び替えボタンは廃止） */}
      <View style={styles.countRow}>
        <View style={styles.countLeft}>
          <Text style={[styles.countText, { color: c.chipText }]}>
            {status === 'success' ? t('search.resultsCount', { count: events?.length || 0 }) : t('explore.loading')}
          </Text>
          {selectedResort ? (
            // ゲレンデで絞り込み中は、ゲレンデページ（予報）への入口。README「6. Snowfeed」入口 #5
            <TouchableOpacity
              onPress={() => router.push(resortPageHref(selectedResort, 'forecast'))}
              style={styles.resortInfoLink}
              hitSlop={{ top: 12, bottom: 12 }}
              accessibilityRole="link"
            >
              <Text style={[styles.resortInfoText, { color: c.tintText }]}>{t('search.resortInfo')}</Text>
              <Ionicons name="chevron-forward" size={14} color={c.tintText} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => setShowSortModal(true)}
          style={styles.sortButton}
          hitSlop={{ top: 12, bottom: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`${t('explore.sortTitle')}: ${sortLabel}`}
          testID="sort-button"
        >
          <Ionicons name="swap-vertical" size={16} color={c.chipText} />
          <Text style={[styles.countText, { color: c.chipText }]}>{sortLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* イベントリスト */}
      {status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('explore.loadingEvents')}</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centered}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{t('explore.errorOccurred')}</Text>
          <PillButton title={t('explore.retry')} icon="refresh" variant="secondary" onPress={refetch} />
        </View>
      )}

      {status === 'success' && (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventListCard
              event={item}
              onPress={() => handleEventPress(item.id)}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <IconSymbol name="magnifyingglass" size={64} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('explore.noEventsFound')}</Text>
              <Text style={[styles.emptySubtext, { color: colors.icon }]}>
                {t('explore.changeSearchCriteria')}
              </Text>
            </View>
          )}
          onEndReached={() => {
            if (hasMore) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={colors.tint}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ゲレンデの絞り込み（ゲレンデの一覧。♡ でお気に入り、ホームとお気に入りが上に並ぶ） */}
      <Modal
        visible={showResortModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResortModal(false)}
      >
        <ResortSearch
          title={t('search.filterResort')}
          selectedId={selectedResort}
          allOption={{
            label: t('explore.allResorts'),
            selected: !selectedResort,
            onSelect: () => {
              setSelectedResort(null);
              setShowResortModal(false);
            },
          }}
          onSelectResort={(id) => {
            setSelectedResort(id);
            setShowResortModal(false);
          }}
          onClose={() => setShowResortModal(false)}
        />
      </Modal>

      {/* 並び替え */}
      <OptionSheet
        visible={showSortModal}
        title={t('explore.sortTitle')}
        selected={sortOption.sortBy}
        options={SORT_OPTIONS.map((o) => ({ value: o.key as SortOptions['sortBy'], label: t(o.labelKey) }))}
        onSelect={(key) => handleSortSelect(key)}
        onClose={() => setShowSortModal(false)}
        closeLabel={t('common.cancel')}
      />

      {/* 日付 */}
      <OptionSheet<DatePreset | 'pick' | null>
        visible={openSheet === 'date'}
        title={t('search.filterDate')}
        selected={pickedDay ? 'pick' : datePreset}
        options={[
          { value: null, label: t('search.anyDate') },
          ...DATE_PRESETS.map((p) => ({ value: p, label: t(`dateFormat.${p}`) })),
          {
            value: 'pick',
            label: pickedDay
              ? `${t('search.pickDate')}（${formatEventDate(pickedDay, t, { withTime: false })}）`
              : t('search.pickDate'),
          },
        ]}
        onSelect={(value) => {
          setOpenSheet(null);
          if (value === 'pick') {
            // シートが閉じてから日付ピッカーを出す（iOS でモーダルが重なると出ないため）
            setTimeout(() => setShowDayPicker(true), 350);
            return;
          }
          setPickedDay(null);
          setDatePreset(value);
        }}
        onClose={() => setOpenSheet(null)}
        closeLabel={t('common.cancel')}
      />
      <DatePickerSheet
        visible={showDayPicker}
        title={t('search.pickDate')}
        value={pickedDay}
        minimumDate={new Date()}
        onConfirm={(day) => {
          setShowDayPicker(false);
          setDatePreset(null);
          setPickedDay(day);
        }}
        onCancel={() => setShowDayPicker(false)}
        confirmLabel={t('common.ok')}
        cancelLabel={t('common.cancel')}
      />

      {/* カテゴリ */}
      <OptionSheet<NonNullable<ExploreFilters['category']> | null>
        visible={openSheet === 'category'}
        title={t('search.filterCategory')}
        selected={selectedCategory ?? null}
        options={[
          { value: null, label: t('search.anyCategory') },
          ...CATEGORIES.map((key) => ({ value: key, label: categoryLabel(key, t) })),
        ]}
        onSelect={(value) => {
          setSelectedCategory(value);
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
        closeLabel={t('common.cancel')}
      />

      {/* アクティビティ */}
      <OptionSheet<ActivityType | null>
        visible={openSheet === 'activity'}
        title={t('activities.label')}
        selected={activityFilter}
        options={[
          { value: null, label: t('activities.any') },
          ...ACTIVITY_TYPES.map((key) => ({ value: key, label: t(`activities.${key}`) })),
        ]}
        onSelect={(value) => {
          setActivityFilter(value);
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
        closeLabel={t('common.cancel')}
      />

      {/* レベル */}
      <OptionSheet<LevelFilter | null>
        visible={openSheet === 'level'}
        title={t('search.filterLevel')}
        selected={levelFilter}
        options={[
          { value: null, label: t('levels.all') },
          ...LEVELS.map((key) => ({ value: key, label: levelLabel(key, t) ?? key })),
        ]}
        onSelect={(value) => {
          setLevelFilter(value);
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
        closeLabel={t('common.cancel')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is set dynamically in the component
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor is set dynamically in the component
    marginHorizontal: spacing.md,
    marginBottom: SECTION_GAP,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: borderRadius.card,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    // color is set dynamically in the component
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: borderRadius.xl,
    // backgroundColor is set dynamically in the component
    gap: 4,
  },
  categoryButtonActive: {
    // backgroundColor is set dynamically in the component
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    // color is set dynamically in the component
  },
  categoryTextActive: {
    // color is set dynamically in the component
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultsText: {
    fontSize: fontSize.meta,
    // color is set dynamically in the component
  },
  resortFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor is set dynamically in the component
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  resortFilterText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.semibold,
    // color is set dynamically in the component
  },
  listContent: {
    paddingBottom: 150,
  },
  // 検索欄・絞り込み・件数と並び替えの間は同じ間隔（SECTION_GAP）。
  // 横スクロールの contentContainer に付けた margin は Android で高さに入らないので、外側に付ける
  // ScrollView は既定で縮む（flexShrink: 1）ので、下のリストに押されてチップが潰れ・重ならないよう縮ませない
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: SECTION_GAP,
  },
  filterRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: SECTION_GAP,
  },
  countLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  countText: {
    fontSize: fontSize.meta,
  },
  resortInfoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  resortInfoText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    // color is set dynamically in the component
    fontSize: fontSize.md,
  },
  errorText: {
    marginTop: 16,
    // color is set dynamically in the component
    fontSize: fontSize.md,
    marginBottom: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    // color is set dynamically in the component
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    // color is set dynamically in the component
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  sortFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    // backgroundColor and shadowColor are set dynamically in the component
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 90,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    // backgroundColor is set dynamically in the component
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    padding: 24,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    // color is set dynamically in the component
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: borderRadius.card,
    marginBottom: 8,
  },
  areaSection: {
    marginBottom: 8,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  areaHeaderText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    // color is set dynamically in the component
  },
  resortListContainer: {
    paddingLeft: 8,
  },
  resortItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  resortItemActive: {
    // backgroundColor is set dynamically in the component
  },
  resortItemText: {
    fontSize: fontSize.body,
    // color is set dynamically in the component
  },
  resortItemTextActive: {
    // color is set dynamically in the component
    fontWeight: fontWeight.semibold,
  },
  modalOptionActive: {
    // backgroundColor is set dynamically in the component
  },
  modalOptionText: {
    fontSize: fontSize.md,
    // color is set dynamically in the component
  },
  modalOptionTextActive: {
    // color is set dynamically in the component
    fontWeight: fontWeight.semibold,
  },
  modalOptionSubtext: {
    fontSize: fontSize.xs,
    marginTop: 2,
    // color is set dynamically in the component
  },
  modalLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    // color is set dynamically in the component
  },
  homeResortOption: {
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  homeResortContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeResortText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    // color is set dynamically in the component
  },
});
