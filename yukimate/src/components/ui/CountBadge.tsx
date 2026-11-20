import { borderRadius, fontSize, fontWeight } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * 未読などの件数バッジ（0 のときは何も出さない。100 以上は 99+）。
 * タブバーのバッジと同じ色（badge / badgeText）。
 */
export function CountBadge({ count }: { count: number }) {
  const c = useAppColors();
  const { t } = useTranslation();
  if (!count || count <= 0) return null;
  return (
    <View
      style={[styles.badge, { backgroundColor: c.badge }]}
      accessible
      accessibilityLabel={t('chat.unreadA11y', { count })}
    >
      <Text style={[styles.text, { color: c.badgeText }]}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
  },
});

export default CountBadge;
