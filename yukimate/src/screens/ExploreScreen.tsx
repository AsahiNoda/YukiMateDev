import { EventListCard } from '@/components/EventListCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useExplore, type ExploreFilters, type SortOptions } from '@/hooks/useExplore';
import { router, useLocalSearchParams } from 'expo-router';
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
import EventFlagIcon from '../../assets/images/icons/event-flag.svg';
import CameraIcon from '../../assets/images/icons/camera.svg';
import LessonIcon from '../../assets/images/icons/lesson.svg';
import GroupIcon from '../../assets/images/icons/group.svg';

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
  const params = useLocalSearchParams<{ filters?: string }>();

  // 検索とフィルター状態
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExploreFilters['category'] | null>(null);
  const [filters, setFilters] = useState<ExploreFilters>({});
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

  // フィルター適用時の処理
  useEffect(() => {
    if (params.filters) {
      try {
        const appliedFilters = JSON.parse(params.filters);
        setFilters(appliedFilters);
      } catch (error) {
        console.error('Error parsing filters:', error);
      }
    }
  }, [params.filters]);

  // 検索クエリとカテゴリをフィルターに統合
  const combinedFilters: ExploreFilters = {
    ...filters,
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
      pathname: '/(tabs)/search/event-detail',
      params: { eventId },
    } as any);
  };

  const handleFilterPress = () => {
    router.push({
      pathname: '/(tabs)/search/filter',
      params: { currentFilters: JSON.stringify(filters) },
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

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof ExploreFilters];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.values(value).some(v => v);
    return value !== undefined;
  }).length;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleFilterPress}
        >
          <IconSymbol name="line.3.horizontal.decrease.circle" size={24} color="#FFFFFF" />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search places, events, hosts"
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol name="xmark.circle.fill" size={18} color="#6B7280" />
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
              selectedCategory === category.key && styles.categoryButtonActive,
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
              color={selectedCategory === category.key ? '#FFFFFF' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.key && styles.categoryTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List/Map切り替え & 結果数 */}
      <View style={styles.controlsRow}>
        <Text style={styles.resultsText}>
          {status === 'success' ? `Showing ${events?.length || 0} results` : 'Loading...'}
        </Text>
        <View style={styles.viewControls}>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.viewButtonText, viewMode === 'list' && styles.viewButtonTextActive]}>
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'map' && styles.viewButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[styles.viewButtonText, viewMode === 'map' && styles.viewButtonTextActive]}>
              Map
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* イベントリスト */}
      {status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#5A7D9A" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centered}>
          <IconSymbol name="exclamationmark.triangle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>エラーが発生しました</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>再試行</Text>
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
              <IconSymbol name="magnifyingglass" size={64} color="#6B7280" />
              <Text style={styles.emptyText}>イベントが見つかりませんでした</Text>
              <Text style={styles.emptySubtext}>
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
              tintColor="#5A7D9A"
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ソート順を選択</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.modalOption,
                  sortOption.sortBy === option.key && styles.modalOptionActive,
                ]}
                onPress={() => handleSortSelect(option.key)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    sortOption.sortBy === option.key && styles.modalOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sortOption.sortBy === option.key && (
                  <IconSymbol name="checkmark" size={20} color="#5A7D9A" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* フローティングソートボタン */}
      <TouchableOpacity
        style={styles.sortFab}
        onPress={() => setShowSortModal(true)}
      >
        <IconSymbol name="arrow.up.arrow.down" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  filterButton: {
    position: 'relative',
    padding: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#5A7D9A',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
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
    color: '#FFFFFF',
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
    backgroundColor: '#2D3748',
    gap: 4,
  },
  categoryButtonActive: {
    backgroundColor: '#5A7D9A',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  categoryTextActive: {
    color: '#FFFFFF',
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
    color: '#9CA3AF',
  },
  viewControls: {
    flexDirection: 'row',
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 2,
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonActive: {
    backgroundColor: '#334155',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  viewButtonTextActive: {
    color: '#FFFFFF',
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
    color: '#9CA3AF',
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#5A7D9A',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
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
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#6B7280',
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
    backgroundColor: '#5A7D9A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5A7D9A',
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
    backgroundColor: '#2D3748',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#334155',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  modalOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
