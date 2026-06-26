import { getAreaOrder } from '@/constants/areas';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { getResortName, getResortPrefecture } from '@/utils/resort-helpers';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useTranslation } from '@hooks/useTranslation';
import { supabase } from '@lib/supabase';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Resort {
  id: string;
  name: string;
  name_en: string | null;
  region: string | null;
  area: string;
}

interface ResortSearchProps {
  onSelectResort: (resortId: string, resortName: string, setAsHome?: boolean) => void;
  onClose: () => void;
  isFirstTime?: boolean;
  hasHomeResort?: boolean;
  isChangingHome?: boolean;
}

export function ResortSearch({ onSelectResort, onClose, isFirstTime = false, hasHomeResort = false, isChangingHome = false }: ResortSearchProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { locale } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [filteredResorts, setFilteredResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const AREA_ORDER = getAreaOrder(locale);

  // リゾートデータを取得
  useEffect(() => {
    const fetchResorts = async () => {
      try {
        const { data, error } = await supabase
          .from('resorts')
          .select('id, name, name_en, area, region')
          .order('name', { ascending: true });

        if (error) throw error;

        setResorts(data || []);
        setFilteredResorts(data || []);
      } catch (error) {
        console.error('Error fetching resorts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResorts();
  }, []);

  // 検索フィルタリング
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredResorts(resorts);
    } else {
      const filtered = resorts.filter((resort) => {
        const nameJP = resort.name.toLowerCase();
        const nameEN = resort.name_en?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return nameJP.includes(query) || nameEN.includes(query);
      });
      setFilteredResorts(filtered);
    }
  }, [searchQuery, resorts]);

  // エリアごとにグループ化
  const resortsByArea = useMemo(() => {
    if (filteredResorts.length === 0) return {};

    const grouped: Record<string, Resort[]> = {};
    filteredResorts.forEach((resort) => {
      // 英語の場合はregion、日本語の場合はareaを使用
      const areaKey = getResortPrefecture(resort, locale);
      const area = areaKey || 'その他';
      if (!grouped[area]) {
        grouped[area] = [];
      }
      grouped[area].push(resort);
    });

    // Sort areas by AREA_ORDER
    const sortedGrouped: Record<string, Resort[]> = {};
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
  }, [filteredResorts, AREA_ORDER, locale]);

  const handleSelectResort = (resort: Resort) => {
    const resortName = getResortName(resort, locale);

    // If first time, directly set as home without confirmation
    if (isFirstTime) {
      onSelectResort(resort.id, resortName, true);
      return;
    }

    // If changing home from button, show confirmation dialog
    if (isChangingHome) {
      Alert.alert(
        'ホームゲレンデに設定',
        `${resortName}をホームゲレンデに設定しますか？`,
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: 'はい',
            onPress: () => {
              onSelectResort(resort.id, resortName, true);
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      // Normal search - just view the resort
      onSelectResort(resort.id, resortName, false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 16) }]}>
        {!isFirstTime && (
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.accent} />
            <Text style={[styles.backButtonText, { color: colors.accent }]}>戻る</Text>
          </TouchableOpacity>
        )}
        {isFirstTime && <View style={styles.headerSpacer} />}
        <Text style={[styles.title, { color: colors.text }]}>
          {isFirstTime ? 'ホームゲレンデを設定' : 'リゾートを選択'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info Message for First-Time Users */}
      {isFirstTime && (
        <View style={[styles.infoBox, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
          <IconSymbol name="info.circle.fill" size={24} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            よく行くゲレンデをホームゲレンデとして設定しましょう。{'\n'}
            後で設定画面から変更できます。
          </Text>
        </View>
      )}

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="リゾート名で検索..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol name="xmark.circle.fill" size={20} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      {/* Resort List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {Object.keys(resortsByArea).length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="magnifyingglass" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                リゾートが見つかりませんでした
              </Text>
            </View>
          ) : (
            Object.entries(resortsByArea).map(([area, areaResorts]) => (
              <View key={area} style={styles.areaSection}>
                {/* Area Header (Toggle) */}
                <TouchableOpacity
                  style={styles.areaHeader}
                  onPress={() => setExpandedArea(expandedArea === area ? null : area)}
                >
                  <Text style={[styles.areaHeaderText, { color: colors.text }]}>
                    {area} ({areaResorts.length})
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
                    {areaResorts.map((resort) => (
                      <TouchableOpacity
                        key={resort.id}
                        style={[styles.resortItem, { backgroundColor: colors.background }]}
                        onPress={() => handleSelectResort(resort)}
                      >
                        <Text style={[styles.resortName, { color: colors.text }]}>
                          {getResortName(resort, locale)}
                        </Text>
                        <IconSymbol name="chevron.right" size={18} color={colors.icon} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.md,
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    zIndex: 20,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 80, // Same width as back button to center title
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    padding: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  areaSection: {
    marginBottom: spacing.xs,
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  areaHeaderText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  resortListContainer: {
    paddingLeft: spacing.md,
  },
  resortItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  resortName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
