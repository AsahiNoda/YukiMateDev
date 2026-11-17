import { Chip } from '@/components/ui/Chip';
import { getAreaOrder } from '@/constants/areas';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useResortPreferences } from '@/hooks/useResortPreferences';
import { getResortName, getResortPrefecture } from '@/utils/resort-helpers';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@hooks/useTranslation';
import { supabase } from '@lib/supabase';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  /** 初めてホームゲレンデを決めるとき（閉じられない・選ぶとホームになる） */
  isFirstTime?: boolean;
  hasHomeResort?: boolean;
  /** 選ぶとホームゲレンデにする（確認あり） */
  isChangingHome?: boolean;
  /** 見出し（省略時は「ゲレンデを選択」） */
  title?: string;
  /** 今選んでいるゲレンデ（チェックを付ける） */
  selectedId?: string | null;
  /** 一覧の先頭に「すべてのゲレンデ」などを出す（さがすのゲレンデ絞り込み） */
  allOption?: { label: string; selected: boolean; onSelect: () => void };
  /** 各行に「ホームゲレンデにする」ボタンを出す（ゲレンデページの切り替え） */
  showHomeAction?: boolean;
  /** ホームゲレンデを変えたとき */
  onHomeChanged?: (resortId: string, resortName: string) => void;
}

/**
 * ゲレンデの一覧（選択画面）。
 * - 上に検索欄、その下に「ホームゲレンデ」「お気に入り」、続いてエリアごとの一覧（開閉）
 * - 名前の横の ♡ でお気に入りに登録・解除（お気に入り専用の画面は作らない）
 * - showHomeAction のときは、家のボタンでホームゲレンデにできる
 * - Android の pageSheet は全画面なので、ステータスバーの分を空ける
 */
export function ResortSearch({
  onSelectResort,
  onClose,
  isFirstTime = false,
  isChangingHome = false,
  title,
  selectedId = null,
  allOption,
  showHomeAction = false,
  onHomeChanged,
}: ResortSearchProps) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t, locale } = useTranslation();
  const prefs = useResortPreferences();
  const [searchQuery, setSearchQuery] = useState('');
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const AREA_ORDER = getAreaOrder(locale);

  useEffect(() => {
    supabase
      .from('resorts')
      .select('id, name, name_en, area, region')
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Error fetching resorts:', error);
        setResorts((data as Resort[]) || []);
        setLoading(false);
      });
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(
    () =>
      query
        ? resorts.filter((r) => r.name.toLowerCase().includes(query) || (r.name_en ?? '').toLowerCase().includes(query))
        : [],
    [resorts, query]
  );

  const homeResort = resorts.find((r) => r.id === prefs.homeId) ?? null;
  const favoriteResorts = resorts.filter((r) => prefs.favoriteIds.has(r.id) && r.id !== prefs.homeId);

  const resortsByArea = useMemo(() => {
    const grouped: Record<string, Resort[]> = {};
    resorts.forEach((resort) => {
      const area = getResortPrefecture(resort, locale) || t('resortPicker.otherArea');
      (grouped[area] ??= []).push(resort);
    });
    const ordered: [string, Resort[]][] = [];
    AREA_ORDER.forEach((area) => grouped[area] && ordered.push([area, grouped[area]]));
    Object.keys(grouped)
      .filter((a) => !AREA_ORDER.includes(a))
      .sort()
      .forEach((a) => ordered.push([a, grouped[a]]));
    return ordered;
  }, [resorts, AREA_ORDER, locale, t]);

  const select = (resort: Resort) => {
    const name = getResortName(resort, locale);
    if (isFirstTime) {
      onSelectResort(resort.id, name, true);
      return;
    }
    if (isChangingHome) {
      Alert.alert(t('resortPage.setAsHomeConfirmTitle'), t('resortPage.setAsHomeConfirmMessage', { resort: name }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.ok'), onPress: () => onSelectResort(resort.id, name, true) },
      ]);
      return;
    }
    onSelectResort(resort.id, name, false);
  };

  const toggleFavorite = async (resort: Resort) => {
    const ok = await prefs.toggleFavorite(resort.id);
    if (!ok) Alert.alert(t('resortPage.favoriteFailed'));
  };

  const makeHome = (resort: Resort) => {
    const name = getResortName(resort, locale);
    Alert.alert(t('resortPage.setAsHomeConfirmTitle'), t('resortPage.setAsHomeConfirmMessage', { resort: name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        onPress: async () => {
          const ok = await prefs.setHome(resort.id);
          if (ok) {
            onHomeChanged?.(resort.id, name);
            Alert.alert(t('resortPage.homeChanged', { resort: name }));
          } else {
            Alert.alert(t('resortPage.homeChangeFailed'));
          }
        },
      },
    ]);
  };

  const renderRow = (resort: Resort, opts: { showArea?: boolean } = {}) => {
    const name = getResortName(resort, locale);
    const isHome = resort.id === prefs.homeId;
    const isFav = prefs.favoriteIds.has(resort.id);
    const isSelected = resort.id === selectedId;
    return (
      <View key={resort.id} style={[styles.row, { borderBottomColor: c.divider }]}>
        <Pressable
          onPress={() => select(resort)}
          style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={isHome ? `${name}（${t('chips.home')}）` : name}
        >
          <View style={styles.rowText}>
            <View style={styles.rowTitleLine}>
              <Text style={[styles.rowName, { color: c.text, fontWeight: isSelected ? fontWeight.bold : fontWeight.normal }]} numberOfLines={1}>
                {name}
              </Text>
              {isHome ? <Chip label={t('chips.home')} tone="tint" icon="home" /> : null}
            </View>
            {opts.showArea ? (
              <Text style={[styles.rowArea, { color: c.textLabel }]}>{getResortPrefecture(resort, locale)}</Text>
            ) : null}
          </View>
          {isSelected ? <Ionicons name="checkmark" size={20} color={c.tintText} /> : null}
        </Pressable>
        {showHomeAction && !isHome && !isFirstTime ? (
          <Pressable
            onPress={() => makeHome(resort)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('resortPage.setAsHome', { resort: name })}
          >
            <Ionicons name="home-outline" size={20} color={c.textLabel} />
          </Pressable>
        ) : null}
        {!isFirstTime ? (
          <Pressable
            onPress={() => toggleFavorite(resort)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityState={{ selected: isFav }}
            accessibilityLabel={isFav ? t('resortPage.removeFavorite') : t('resortPage.addFavorite')}
            testID={`resort-fav-${resort.id}`}
          >
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? c.tintText : c.textLabel} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        {!isFirstTime ? (
          <Pressable onPress={onClose} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header" numberOfLines={1}>
          {isFirstTime ? t('snowfeed.setHomeResortButton') : title ?? t('resortPicker.title')}
        </Text>
        <View style={styles.iconButton} />
      </View>

      {isFirstTime ? (
        <View style={[styles.info, { backgroundColor: c.tintChipBackground }]}>
          <Ionicons name="information-circle" size={20} color={c.tintText} />
          <Text style={[styles.infoText, { color: c.text }]}>{t('resortPicker.firstTimeInfo')}</Text>
        </View>
      ) : null}

      {/* 検索 */}
      <View style={[styles.search, { backgroundColor: c.chipBackground }]}>
        <Ionicons name="search" size={18} color={c.textLabel} />
        <TextInput
          style={[styles.searchInput, { color: c.text }]}
          placeholder={t('resortPicker.searchPlaceholder')}
          placeholderTextColor={c.textLabel}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
            <Ionicons name="close-circle" size={18} color={c.textLabel} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={c.tintText} style={styles.loading} />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
          {query ? (
            searchResults.length > 0 ? (
              searchResults.map((r) => renderRow(r, { showArea: true }))
            ) : (
              <Text style={[styles.empty, { color: c.textLabel }]}>{t('resortPicker.noResults')}</Text>
            )
          ) : (
            <>
              {allOption ? (
                <Pressable
                  onPress={allOption.onSelect}
                  style={[styles.row, styles.rowMain, { borderBottomColor: c.divider }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: allOption.selected }}
                >
                  <Text style={[styles.rowName, styles.rowText, { color: c.text, fontWeight: allOption.selected ? fontWeight.bold : fontWeight.normal }]}>
                    {allOption.label}
                  </Text>
                  {allOption.selected ? <Ionicons name="checkmark" size={20} color={c.tintText} /> : null}
                </Pressable>
              ) : null}

              {homeResort && !isFirstTime ? (
                <>
                  <Text style={[styles.section, { color: c.textLabel }]}>{t('resortPage.homeSection')}</Text>
                  {renderRow(homeResort)}
                </>
              ) : null}

              {!isFirstTime ? (
                <>
                  <Text style={[styles.section, { color: c.textLabel }]}>{t('resortPage.favoritesSection')}</Text>
                  {favoriteResorts.length > 0 ? (
                    favoriteResorts.map((r) => renderRow(r, { showArea: true }))
                  ) : (
                    <Text style={[styles.hint, { color: c.textLabel }]}>{t('resortPicker.favoritesHint')}</Text>
                  )}
                </>
              ) : null}

              <Text style={[styles.section, { color: c.textLabel }]}>{t('resortPicker.byArea')}</Text>
              {resortsByArea.map(([area, list]) => {
                const open = expandedArea === area;
                return (
                  <View key={area}>
                    <Pressable
                      onPress={() => setExpandedArea(open ? null : area)}
                      style={[styles.areaHeader, { borderBottomColor: c.divider }]}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                    >
                      <Text style={[styles.areaName, { color: c.text }]}>{area}</Text>
                      <Text style={[styles.areaCount, { color: c.textLabel }]}>{list.length}</Text>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.textLabel} />
                    </Pressable>
                    {open ? <View style={styles.areaList}>{list.map((r) => renderRow(r))}</View> : null}
                  </View>
                );
              })}
            </>
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
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
  iconButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md - 4,
    borderRadius: borderRadius.card,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: 12,
    minHeight: touchTarget.min,
    borderRadius: borderRadius.card,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
  },
  loading: {
    marginTop: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    marginTop: spacing.md + 2,
    marginBottom: 2,
  },
  hint: {
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    flex: 1,
    minHeight: touchTarget.min + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowName: {
    flexShrink: 1,
    fontSize: 16,
  },
  rowArea: {
    fontSize: 12,
    marginTop: 1,
  },
  areaHeader: {
    minHeight: touchTarget.min + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  areaName: {
    flex: 1,
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  areaCount: {
    fontSize: 13,
  },
  areaList: {
    paddingLeft: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 14,
  },
});

export default ResortSearch;
