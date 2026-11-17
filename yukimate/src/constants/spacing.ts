/**
 * Spacing constants for consistent layout
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
  // ---- UIリデザインの基本ルール：カード12／チップ・ボタン999 の2種類 ----
  card: 12,
  pill: 999,
  // 写真が主役の大きいカード（16〜24）
  photoCard: 16,
  photoCardLarge: 24,
} as const;

/** タップできる領域の最小サイズ（44×44） */
export const touchTarget = {
  min: 44,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
