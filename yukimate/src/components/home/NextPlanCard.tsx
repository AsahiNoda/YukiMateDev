import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { NextPlan } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import { levelLabel } from '@/utils/eventDisplay';
import { daysUntil, formatEventDate } from '@/utils/formatEventDate';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface NextPlanCardProps {
  plan: NextPlan;
  onOpenChat: () => void;
  onOpenDetail: () => void;
  /** 自分の投稿（主催したイベント）の一覧へ */
  onOpenMyEvents: () => void;
}

/** 「あと◯日」「今日」「明日」 */
export function useDaysLabel() {
  const { t } = useTranslation();
  return (startAt: string) => {
    const days = daysUntil(startAt);
    if (days <= 0) return t('dateFormat.today');
    if (days === 1) return t('dateFormat.tomorrow');
    return t('dateFormat.daysUntil', { days });
  };
}

/**
 * ホーム上部スライドの2枚目：次の予定（参加が確定したイベント）。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Home-Slide2.html
 * TODO(ui-redesign)：「チャットを開く」の新着数バッジは、既読の記録ができたら出す（今はスキーマにない）。
 */
export function NextPlanCard({ plan, onOpenChat, onOpenDetail, onOpenMyEvents }: NextPlanCardProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const daysLabel = useDaysLabel()(plan.startAt);

  // 終わりの時刻（同じ日なら「〜15:00」）
  const end = plan.endAt ? new Date(plan.endAt) : null;
  const endLabel =
    end && end.toDateString() === new Date(plan.startAt).toDateString()
      ? `〜${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`
      : '';
  const level = levelLabel(plan.levelRequired, t);

  // ラベルと値の行（アイコンは使わず、ラベルの列で揃える）
  const rows: { key: string; label: string; value: string }[] = [
    { key: 'date', label: t('homeFeed.dateTime'), value: `${formatEventDate(plan.startAt, t)}${endLabel}` },
    ...(plan.resortName ? [{ key: 'resort', label: t('homeFeed.resortLabel'), value: plan.resortName }] : []),
    ...(plan.meetingPlace ? [{ key: 'meeting', label: t('homeFeed.meetingPlace'), value: plan.meetingPlace }] : []),
    {
      key: 'host',
      label: t('homeFeed.hostLabel'),
      value: plan.isHost ? t('homeFeed.hostYou') : plan.hostName,
    },
    ...(level ? [{ key: 'level', label: t('homeFeed.levelLabel'), value: level }] : []),
  ];
  const membersText = plan.otherMembers > 0 ? t('homeFeed.youPlus', { count: plan.otherMembers }) : t('homeFeed.justYou');

  return (
    // 天気カード（HomeWeatherCard）と同じガラス調：後ろの山の背景が透けて見える
    <View style={[styles.card, { borderColor: c.glassCardBorder }]}>
      <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassCardBackground }]} />
      <View>
        <View style={styles.topRow}>
          <Text style={[styles.kicker, { color: c.tintText }]}>{t('homeFeed.slideNextPlan')}</Text>
          <View style={[styles.daysPill, { backgroundColor: c.primaryButton }]}>
            <Text style={[styles.daysText, { color: c.primaryButtonText }]}>{daysLabel}</Text>
          </View>
        </View>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {plan.title}
        </Text>
        <View style={styles.rows}>
          {rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <Text style={[styles.rowLabel, { color: c.textMuted }]}>{row.label}</Text>
              <Text style={[styles.rowText, { color: c.text }]} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
          {/* メンバー：写真を重ねて並べる */}
          <View style={styles.row} accessible accessibilityLabel={`${t('homeFeed.members')} ${membersText}`}>
            <Text style={[styles.rowLabel, { color: c.textMuted }]}>{t('homeFeed.members')}</Text>
            {plan.memberAvatars.length > 0 ? (
              <View style={styles.avatars}>
                {plan.memberAvatars.map((url, i) => (
                  <Image
                    key={i}
                    source={url ? { uri: url } : undefined}
                    style={[
                      styles.avatar,
                      { backgroundColor: c.chipBackground, borderColor: c.background, marginLeft: i === 0 ? 0 : -6 },
                    ]}
                  />
                ))}
              </View>
            ) : null}
            <Text style={[styles.rowText, { color: c.text }]} numberOfLines={1}>
              {membersText}
            </Text>
          </View>
        </View>
      </View>
      <View>
        <View style={styles.actions}>
          <PillButton title={t('actions.openChat')} icon="chatbubble-outline" onPress={onOpenChat} fill />
          <PillButton title={t('actions.details')} variant="secondary" onPress={onOpenDetail} />
        </View>
        <MyEventsLink onPress={onOpenMyEvents} style={styles.myEventsLink} />
      </View>
    </View>
  );
}

/** 「自分の投稿一覧」（主催したイベント）へのリンク。次の予定・予定がないときのカードで使う */
export function MyEventsLink({ onPress, style }: { onPress: () => void; style?: object }) {
  const c = useAppColors();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      accessibilityRole="link"
      style={({ pressed }) => [styles.linkRow, style, pressed && { opacity: 0.7 }]}
      testID="home-my-events-link"
    >
      <Text style={[styles.linkText, { color: c.tintText }]}>{t('homeFeed.myEventsLink')}</Text>
      <Ionicons name="chevron-forward" size={14} color={c.tintText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 2,
    minHeight: 24,
  },
  linkText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
  },
  myEventsLink: {
    marginTop: 10,
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.glass,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: spacing.md,
    justifyContent: 'space-between',
    gap: spacing.md - 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  kicker: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  daysPill: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  daysText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.heavy,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
    lineHeight: 24,
    marginBottom: 10,
  },
  rows: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    width: 64,
    fontSize: fontSize.meta,
  },
  rowText: {
    flex: 1,
    fontSize: fontSize.meta,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.round,
    borderWidth: 1.5,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default NextPlanCard;
