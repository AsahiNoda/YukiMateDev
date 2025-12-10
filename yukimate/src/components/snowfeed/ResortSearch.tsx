import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import { supabase } from '@lib/supabase';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Resort {
  id: string;
  name: string;
  region: string;
}

interface ResortSection {
  title: string;
  data: Resort[];
}

interface ResortSearchProps {
  onSelectResort: (resortId: string, resortName: string, setAsHome?: boolean) => void;
  onClose: () => void;
  isFirstTime?: boolean;
  hasHomeResort?: boolean;
  isChangingHome?: boolean;
}

export function ResortSearch({ onSelectResort, onClose, isFirstTime = false, hasHomeResort = false, isChangingHome = false }: ResortSearchProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [searchQuery, setSearchQuery] = useState('');
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [filteredResorts, setFilteredResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);

  // エリアの順序を定義（北から南）
  const regionOrder = [
    'Hokkaido',
    'Tohoku',
    'Kanto',
    'Chubu',
    'Kansai',
    'Chugoku',
    'Shikoku',
    'Kyushu'
  ];

  // エリア名を日本語に変換
  const getRegionName = (region: string): string => {
    const regionNames: { [key: string]: string } = {
      'Hokkaido': '北海道',
      'Tohoku': '東北',
      'Kanto': '関東',
      'Chubu': '中部',
      'Kansai': '関西',
      'Chugoku': '中国',
      'Shikoku': '四国',
      'Kyushu': '九州'
    };
    return regionNames[region] || region;
  };

  // リゾートデータを取得
  useEffect(() => {
    const fetchResorts = async () => {
      try {
        const { data, error } = await supabase
          .from('resorts')
          .select('id, name, region')
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
      const filtered = resorts.filter((resort) =>
        resort.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredResorts(filtered);
    }
  }, [searchQuery, resorts]);

  // エリアごとにグループ化してセクションデータを作成
  const sectionData = useMemo(() => {
    // エリアごとにグループ化
    const grouped = filteredResorts.reduce((acc, resort) => {
      const region = resort.region || 'Other';
      if (!acc[region]) {
        acc[region] = [];
      }
      acc[region].push(resort);
      return acc;
    }, {} as { [key: string]: Resort[] });

    // セクション配列を作成し、北から南の順にソート
    const sections: ResortSection[] = Object.keys(grouped)
      .sort((a, b) => {
        const indexA = regionOrder.indexOf(a);
        const indexB = regionOrder.indexOf(b);
        // 見つからない場合は最後に配置
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
      .map(region => ({
        title: getRegionName(region),
        data: grouped[region]
      }));

    return sections;
  }, [filteredResorts]);

  const handleSelectResort = (resort: Resort) => {
    // If first time, directly set as home without confirmation
    if (isFirstTime) {
      onSelectResort(resort.id, resort.name, true);
      return;
    }

    // If changing home from button, show confirmation dialog
    if (isChangingHome) {
      Alert.alert(
        'ホームゲレンデに設定',
        `${resort.name}をホームゲレンデに設定しますか？`,
        [
          {
            text: 'キャンセル',
            style: 'cancel',
          },
          {
            text: 'はい',
            onPress: () => {
              onSelectResort(resort.id, resort.name, true);
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      // Normal search - just view the resort
      onSelectResort(resort.id, resort.name, false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
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
        <SectionList
          sections={sectionData}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resortItem, { borderBottomColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => handleSelectResort(item)}>
              <View style={styles.resortInfo}>
                <Text style={[styles.resortName, { color: colors.text }]}>{item.name}</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.icon} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconSymbol name="magnifyingglass" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                リゾートが見つかりませんでした
              </Text>
            </View>
          }
          stickySectionHeadersEnabled={true}
        />
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
    paddingTop: spacing.lg,
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
  sectionHeader: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resortItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  resortInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resortName: {
    fontSize: fontSize.md,
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
