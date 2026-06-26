import { EventListCard } from '@/components/EventListCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getAreaOrder } from '@/constants/areas';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useExplore, type ExploreFilters, type SortOptions } from '@/hooks/useExplore';
import { useProfile } from '@/hooks/useProfile';
import { useResorts } from '@/hooks/useResorts';
import { useTranslation } from '@/hooks/useTranslation';
import { getResortName, getResortPrefecture } from '@/utils/resort-helpers';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

// カテゴリアイコンのインポート
import CameraIcon from '../../assets/images/icons/camera.svg';
import EventFlagIcon from '../../assets/images/icons/event-flag.svg';
import GroupIcon from '../../assets/images/icons/group.svg';
import LessonIcon from '../../assets/images/icons/lesson.svg';

const CATEGORIES = [
  { key: 'event', labelKey: 'explore.categoryEvent', IconComponent: EventFlagIcon },
  { key: 'lesson', labelKey: 'explore.categoryLesson', IconComponent: LessonIcon },
  { key: 'filming', labelKey: 'explore.categoryFilming', IconComponent: CameraIcon },
  { key: 'group', labelKey: 'explore.categoryGroup', IconComponent: GroupIcon },
];

const SORT_OPTIONS = [
  { key: 'date', labelKey: 'explore.sortDateAsc' },
  { key: 'popular', labelKey: 'explore.sortPopular' },
  { key: 'newest', labelKey: 'explore.sortNewest' },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t, locale } = useTranslation();

  // 検索とフィルター状態
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExploreFilters['category'] | null>(null);
  const [sortOption, setSortOption] = useState<SortOptions>({
    sortBy: 'date',
    order: 'asc',
  });

  // UI状態
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedResort, setSelectedResort] = useState<string | null>(null);
  const [showResortModal, setShowResortModal] = useState(false);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  // リゾート一覧を取得
  const resortsState = useResorts();

  // ユーザープロフィールを取得してホームゲレンデを取得
  const profileState = useProfile();

  // ホームリゾートを取得
  const homeResort = React.useMemo(() => {
    if (profileState.status === 'success' && profileState.data.homeResortId && resortsState.status === 'success') {
      return resortsState.resorts.find(r => r.id === profileState.data.homeResortId);
    }
    return null;
  }, [profileState, resortsState]);

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

  // 検索クエリとカテゴリをフィルターに統合
  const combinedFilters: ExploreFilters = {
    keyword: debouncedQuery || undefined,
    category: selectedCategory ? selectedCategory : undefined,
    resortIds: selectedResort ? [selectedResort] : undefined,
  };

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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={{ flex: 1 }} />
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

      {/* カテゴリタブ */}
      <View style={styles.categoriesContainer}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              { backgroundColor: colors.backgroundSecondary },
              selectedCategory === category.key && [styles.categoryButtonActive, { backgroundColor: colors.tint }],
            ]}
            onPress={() => {
              // 既に選択されているカテゴリをタップした場合は選択解除
              if (selectedCategory === category.key) {
                setSelectedCategory(null);
              } else {
                setSelectedCategory(category.key as ExploreFilters['category']);
              }
            }}
          >
            <category.IconComponent
              width={16}
              height={16}
              color={selectedCategory === category.key ? colors.text : colors.icon}
            />
            <Text
              style={[
                styles.categoryText,
                { color: colors.icon },
                selectedCategory === category.key && [styles.categoryTextActive, { color: colors.text }],
              ]}
            >
              {t(category.labelKey as any)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* スキー場フィルター & 結果数 */}
      <View style={styles.controlsRow}>
        <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
          {status === 'success' ? t('explore.resultsCount').replace('${count}', (events?.length || 0).toString()) : t('explore.loading')}
        </Text>
        <TouchableOpacity
          style={[styles.resortFilter, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setShowResortModal(true)}
        >
          <Text style={[styles.resortFilterText, { color: colors.icon }]}>
            {selectedResort && resortsState.status === 'success'
              ? resortsState.resorts.find(r => r.id === selectedResort)?.name || t('explore.resortFilter')
              : t('explore.resortFilter')}
          </Text>
          <IconSymbol name="chevron.down" size={14} color={colors.icon} />
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
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.tint }]} onPress={refetch}>
            <Text style={[styles.retryButtonText, { color: colors.text }]}>{t('explore.retry')}</Text>
          </TouchableOpacity>
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

      {/* スキー場選択モーダル */}
      <Modal
        visible={showResortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResortModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowResortModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('explore.resortFilter')}</Text>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* ホームゲレンデセクション */}
              {homeResort && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.icon }]}>
                    {t('explore.homeResort')}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      styles.homeResortOption,
                      { backgroundColor: colors.backgroundTertiary },
                      selectedResort === homeResort.id && { backgroundColor: colors.tint + '20' },
                    ]}
                    onPress={() => {
                      setSelectedResort(homeResort.id);
                      setShowResortModal(false);
                    }}
                  >
                    <View style={styles.homeResortContent}>
                      <IconSymbol name="house.fill" size={18} color={colors.tint} />
                      <Text
                        style={[
                          styles.homeResortText,
                          { color: colors.text },
                        ]}
                      >
                        {homeResort.name}
                      </Text>
                    </View>
                    {selectedResort === homeResort.id && (
                      <IconSymbol name="checkmark" size={20} color={colors.tint} />
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* すべて表示オプション */}
              <Text style={[styles.sectionLabel, { color: colors.icon }]}>
                {t('explore.allResorts')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  !selectedResort && [styles.modalOptionActive, { backgroundColor: colors.backgroundTertiary }],
                ]}
                onPress={() => {
                  setSelectedResort(null);
                  setShowResortModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: colors.textSecondary },
                    !selectedResort && [styles.modalOptionTextActive, { color: colors.text }],
                  ]}
                >
                  {t('explore.resortFilterAll')}
                </Text>
                {!selectedResort && (
                  <IconSymbol name="checkmark" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>

              {/* リゾート一覧（エリア別トグル） */}
              {resortsState.status === 'loading' && (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              )}
              {resortsState.status === 'success' && Object.entries(resortsByArea).map(([area, resorts]) => (
                <View key={area} style={styles.areaSection}>
                  {/* Area Header (Toggle) */}
                  <TouchableOpacity
                    style={styles.areaHeader}
                    onPress={() => setExpandedArea(expandedArea === area ? null : area)}
                  >
                    <Text style={[styles.areaHeaderText, { color: colors.text }]}>
                      {area} ({resorts.length})
                    </Text>
                    <IconSymbol
                      name={expandedArea === area ? 'chevron.up' : 'chevron.down'}
                      size={20}
                      color={colors.icon}
                    />
                  </TouchableOpacity>

                  {/* Resort List (Collapsible) */}
                  {expandedArea === area && (
                    <View style={styles.resortListContainer}>
                      {resorts.map((resort) => (
                        <TouchableOpacity
                          key={resort.id}
                          style={[
                            styles.resortItem,
                            selectedResort === resort.id && [styles.resortItemActive, { backgroundColor: colors.backgroundTertiary }],
                          ]}
                          onPress={() => {
                            setSelectedResort(resort.id);
                            setShowResortModal(false);
                            setExpandedArea(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.resortItemText,
                              { color: colors.textSecondary },
                              selectedResort === resort.id && [styles.resortItemTextActive, { color: colors.text }],
                            ]}
                          >
                            {getResortName(resort, locale)}
                          </Text>
                          {selectedResort === resort.id && (
                            <IconSymbol name="checkmark" size={16} color={colors.tint} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ソートモーダル */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('explore.sortTitle')}</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.modalOption,
                  sortOption.sortBy === option.key && [styles.modalOptionActive, { backgroundColor: colors.backgroundTertiary }],
                ]}
                onPress={() => handleSortSelect(option.key)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: colors.textSecondary },
                    sortOption.sortBy === option.key && [styles.modalOptionTextActive, { color: colors.text }],
                  ]}
                >
                  {t(option.labelKey as any)}
                </Text>
                {sortOption.sortBy === option.key && (
                  <IconSymbol name="checkmark" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* フローティングソートボタン */}
      <TouchableOpacity
        style={[styles.sortFab, { backgroundColor: colors.tint, shadowColor: colors.tint }]}
        onPress={() => setShowSortModal(true)}
      >
        <IconSymbol name="arrow.up.arrow.down" size={20} color={colors.text} />
      </TouchableOpacity>
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
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
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
    borderRadius: 16,
    // backgroundColor is set dynamically in the component
    gap: 4,
  },
  categoryButtonActive: {
    // backgroundColor is set dynamically in the component
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 13,
    // color is set dynamically in the component
  },
  resortFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor is set dynamically in the component
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  resortFilterText: {
    fontSize: 13,
    fontWeight: '600',
    // color is set dynamically in the component
  },
  listContent: {
    paddingBottom: 150,
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
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    // color is set dynamically in the component
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    // backgroundColor is set dynamically in the component
    borderRadius: 8,
  },
  retryButtonText: {
    // color is set dynamically in the component
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    // color is set dynamically in the component
    fontSize: 14,
    textAlign: 'center',
  },
  sortFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
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
    borderRadius: 12,
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
    borderRadius: 8,
    marginBottom: 4,
  },
  areaHeaderText: {
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 8,
    marginBottom: 4,
  },
  resortItemActive: {
    // backgroundColor is set dynamically in the component
  },
  resortItemText: {
    fontSize: 15,
    // color is set dynamically in the component
  },
  resortItemTextActive: {
    // color is set dynamically in the component
    fontWeight: '600',
  },
  modalOptionActive: {
    // backgroundColor is set dynamically in the component
  },
  modalOptionText: {
    fontSize: 16,
    // color is set dynamically in the component
  },
  modalOptionTextActive: {
    // color is set dynamically in the component
    fontWeight: '600',
  },
  modalOptionSubtext: {
    fontSize: 12,
    marginTop: 2,
    // color is set dynamically in the component
  },
  modalLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
    // color is set dynamically in the component
  },
});
