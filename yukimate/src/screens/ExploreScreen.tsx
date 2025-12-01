import { EventListCard } from '@/components/EventListCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useExplore, type ExploreFilters, type SortOptions } from '@/hooks/useExplore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
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
  { key: 'event', label: 'イベント', IconComponent: EventFlagIcon },
  { key: 'lesson', label: 'レッスン', IconComponent: LessonIcon },
  { key: 'filming', label: '撮影', IconComponent: CameraIcon },
  { key: 'group', label: '仲間', IconComponent: GroupIcon },
];

const SORT_OPTIONS = [
  { key: 'date', label: '日付が近い順' },
  { key: 'popular', label: '人気順' },
  { key: 'newest', label: '新着順' },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

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
          placeholder="検索"
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
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List/Map切り替え & 結果数 */}
      <View style={styles.controlsRow}>
        <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
          {status === 'success' ? `${events?.length || 0} 件の検索結果を表示中` : 'ロード中...'}
        </Text>
        <View style={[styles.viewControls, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'list' && [styles.viewButtonActive, { backgroundColor: colors.backgroundTertiary }]]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.viewButtonText, { color: colors.icon }, viewMode === 'list' && [styles.viewButtonTextActive, { color: colors.text }]]}>
              リスト
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'map' && [styles.viewButtonActive, { backgroundColor: colors.backgroundTertiary }]]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[styles.viewButtonText, { color: colors.icon }, viewMode === 'map' && [styles.viewButtonTextActive, { color: colors.text }]]}>
              地図
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* イベントリスト */}
      {status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>読み込み中...</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centered}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>エラーが発生しました</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.tint }]} onPress={refetch}>
            <Text style={[styles.retryButtonText, { color: colors.text }]}>再試行</Text>
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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>イベントが見つかりませんでした</Text>
              <Text style={[styles.emptySubtext, { color: colors.icon }]}>
                検索条件を変更してみてください
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

      {/* ソートモーダル */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>ソート順を選択</Text>
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
                  {option.label}
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
  viewControls: {
    flexDirection: 'row',
    // backgroundColor is set dynamically in the component
    borderRadius: 8,
    padding: 2,
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonActive: {
    // backgroundColor is set dynamically in the component
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    // color is set dynamically in the component
  },
  viewButtonTextActive: {
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
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
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
});
