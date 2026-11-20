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

/**
 * 角の丸み。直書きせずここから使う（docs/ui-redesign/README.md「1. デザインの基本ルール」）。
 *   sm 4   … 小さな印・バー
 *   md 8   … サムネイル・入力の中の小物
 *   card 12 … ふつうのカード・入力欄
 *   xl 16  … 写真が主役のカード
 *   glass 20 … ホームの天気カードと同じガラス調のカード
 *   sheet 24 … 下から出るシート・大きい写真カード
 *   pill 999 … ボタン・チップ
 *   round  … 丸（アバター・丸ボタン）
 */
export const borderRadius = {
  sm: 4,
  md: 8,
  card: 12,
  xl: 16,
  glass: 20,
  sheet: 24,
  pill: 999,
  round: 9999,
  // 以前の名前（同じ値）
  lg: 12,
  photoCard: 16,
  photoCardLarge: 24,
} as const;

/** タップできる領域の最小サイズ（44×44） */
export const touchTarget = {
  min: 44,
} as const;

/**
 * 文字の大きさ。直書きせずここから使う。
 *   xxs 11 … 時刻・補足　xs 12 … ラベル　meta 13 … 一覧の2行目・説明
 *   sm 14 … 小さめの本文　body 15 … 本文・カードの見出し　md 16 … 入力・強めの本文
 *   lg 18 … 画面の見出し　xl 20 　xxl 24 … セクションの大見出し　title 28 　xxxl 32
 *   display 52 … 天気の気温　displayLarge 72 … 1画面に1つだけの大きな数字・記号
 */
export const fontSize = {
  xxs: 11,
  xs: 12,
  meta: 13,
  sm: 14,
  body: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 28,
  xxxl: 32,
  display: 52,
  displayLarge: 72,
} as const;

export const fontWeight = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};
