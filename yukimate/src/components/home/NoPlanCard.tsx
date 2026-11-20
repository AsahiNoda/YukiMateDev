import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { MyEventsLink } from './NextPlanCard';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface NoPlanCardProps {
  /** 今週末・一人参加OK・このゲレンデのイベント数 */
  soloCount: number;
  resortName: string | null;
  onSearch: () => void;
  onCreate: () => void;
  /** 自分の投稿（主催したイベント）の一覧へ */
  onOpenMyEvents: () => void;
}

/**
 * 予定がないときの入口カード（点線枠）。ホーム上部のスライドの2枚目（天気の裏）に出す。見た目の仕様：docs/ui-redesign/mockups/New-Home-NoPlan.html
 * 0件のときは「自分で作る」を主ボタンにする。
 */
export function NoPlanCard({ soloCount, resortName, onSearch, onCreate, onOpenMyEvents }: NoPlanCardProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const hasEvents = soloCount > 0;
  const conditions = [t('dateFormat.thisWeekend'), t('chips.soloOk'), ...(resortName ? [resortName] : [])];

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.dashedBorder }]}>
      <View>
      <View style={styles.kickerRow}>
        <Text style={[styles.kicker, { color: c.textLabel }]}>{t('homeFeed.slideNextPlan')}</Text>
        <MyEventsLink onPress={onOpenMyEvents} />
      </View>
      <Text style={[styles.title, { color: c.text }]}>{t('homeFeed.noPlanTitle')}</Text>
      {resortName ? (
        <Text style={[styles.subtitle, { color: c.chipText }]}>
          {hasEvents ? t('homeFeed.noPlanSoloCount', { count: soloCount }) : t('homeFeed.noPlanSoloNone')}
        </Text>
      ) : null}
      <View style={styles.chips}>
        {conditions.map((label) => (
          <View key={label} style={[styles.chip, { backgroundColor: c.softTintChipBackground }]}>
            <Text style={[styles.chipText, { color: c.softTintChipText }]}>{label}</Text>
          </View>
        ))}
      </View>
      </View>
      <View style={styles.actions}>
        {hasEvents ? (
          <>
            <PillButton title={t('homeFeed.seeInExplore', { count: soloCount })} icon="search" onPress={onSearch} fill />
            <PillButton title={t('actions.createYourself')} variant="secondary" onPress={onCreate} />
          </>
        ) : (
          <>
            <PillButton title={t('actions.createYourself')} icon="add" onPress={onCreate} fill />
            <PillButton title={t('search.title')} variant="secondary" onPress={onSearch} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ホーム上部のスライド（天気の裏）に入るので、天気カードと同じ高さいっぱいに広げる
  card: {
    flex: 1,
    justifyContent: 'space-between',
    borderRadius: borderRadius.glass,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.md,
  },
  kickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kicker: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
    lineHeight: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  chip: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: fontSize.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default NoPlanCard;
