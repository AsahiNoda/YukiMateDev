import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { fontSize, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import ExploreScreen, { type ExploreInitialFilters } from '@/screens/ExploreScreen';
import { DATE_PRESETS, type DatePreset } from '@/utils/dateRanges';
import { useLocalSearchParams } from 'expo-router';
import DiscoverScreen from '@/screens/tabs/DiscoverScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type SearchViewMode = 'list' | 'swipe';

/** 以前は最後に選んだ表示をここに保存していた。残っている値は使わず消す */
const LEGACY_VIEW_MODE_KEY = '@search_view_mode';

/**
 * 「さがす」タブ。上部の「スワイプ／リスト」で Discover（スワイプ）と Explore（リスト）を切り替える。
 * アプリを開いて最初に「さがす」を押したときは、常にスワイプから表示する。
 * （同じ起動中はタブを移動しても、選んでいた表示のまま）
 * 見た目の仕様：docs/ui-redesign/mockups/New-Explore.html、New-Discover.html のヘッダー。
 */
export default function SearchScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const [mode, setMode] = useState<SearchViewMode>('swipe');

  useEffect(() => {
    AsyncStorage.removeItem(LEGACY_VIEW_MODE_KEY).catch(() => {});
  }, []);

  // ほかの画面から条件付きで開くとき：/(tabs)/search?view=list&date=thisWeekend&solo=1&resortId=...&t=...
  // （t は同じ条件で開き直したときも付け直すための値）
  const params = useLocalSearchParams<{ view?: string; date?: string; solo?: string; resortId?: string; t?: string }>();
  const initialFilters = useMemo<ExploreInitialFilters | undefined>(() => {
    if (!params.date && !params.solo && !params.resortId) return undefined;
    return {
      datePreset: DATE_PRESETS.includes(params.date as DatePreset) ? (params.date as DatePreset) : undefined,
      soloOnly: params.solo === '1',
      resortId: params.resortId || undefined,
      requestId: params.t,
    };
  }, [params.date, params.solo, params.resortId, params.t]);

  useEffect(() => {
    if (params.view === 'list' || params.view === 'swipe') setMode(params.view);
  }, [params.view, params.t]);

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
        {t('search.title')}
      </Text>
      <SegmentedToggle
        value={mode}
        onChange={setMode}
        options={[
          { value: 'swipe', label: t('search.viewSwipe') },
          { value: 'list', label: t('search.viewList') },
        ]}
      />
    </View>
  );

  if (mode === 'list') {
    return <ExploreScreen header={header} initialFilters={initialFilters} />;
  }

  return <DiscoverScreen header={header} onSwitchToList={() => setMode('list')} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 4,
    minHeight: 44,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
});
