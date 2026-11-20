import { borderRadius, fontSize, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ApplicationStatusRowProps {
  /** 自分の申請で返事待ちの数 */
  pending: number;
  /** 自分のイベントに届いたリクエストの数 */
  received: number;
  onPress: () => void;
}

/**
 * 「申請 返事待ち ◯件 ｜ 届いたリクエスト ◯件」の1行。0件の項目は出さず、両方0なら行ごと出さない。
 * 届いたリクエストは点の色に加えて文言でも伝える（色だけに頼らない）。
 */
export function ApplicationStatusRow({ pending, received, onPress }: ApplicationStatusRowProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  if (pending <= 0 && received <= 0) return null;

  const parts: string[] = [];
  if (pending > 0) parts.push(t('homeFeed.pendingApplications', { count: pending }));
  if (received > 0) parts.push(t('homeFeed.receivedRequests', { count: received }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={parts.join('、')}
      style={({ pressed }) => [styles.row, { borderColor: c.chipBackground }, pressed && { opacity: 0.7 }]}
      testID="home-application-status"
    >
      <View style={styles.textRow}>
        {pending > 0 ? (
          <Text style={[styles.text, { color: c.textMuted }]}>{t('homeFeed.pendingApplications', { count: pending })}</Text>
        ) : null}
        {pending > 0 && received > 0 ? <Text style={[styles.text, { color: c.secondaryButtonBorder }]}>｜</Text> : null}
        {received > 0 ? (
          <View style={styles.received}>
            <View style={[styles.dot, { backgroundColor: c.attentionDot }]} />
            <Text style={[styles.text, { color: c.textMuted }]}>{t('homeFeed.receivedRequests', { count: received })}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.textLabel} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  text: {
    fontSize: fontSize.meta,
  },
  received: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.round,
  },
});

export default ApplicationStatusRow;
