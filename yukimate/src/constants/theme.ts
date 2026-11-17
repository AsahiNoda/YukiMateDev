/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 * 
 * Color Palette: Charcoal Navy (案A)
 * - 背景色: 深みのあるチャコールネイビー (#1A202C, #242B38)
 * - カード背景: 背景より少し明るいトーン (#2D3748, #374151)
 * - メインカラー: 落ち着いたスレートブルー (#5A7D9A)
 * - アクセント: 上品なシャンパンゴールド (#D4AF37, #C0B283)
 * - テキスト: オフホワイト、ライトグレー (#F7FAFC, #E2E8F0)
 */

import { Platform } from 'react-native';

// 案A: チャコール・ネイビー パレット
const tintColorLight = '#5A7D9A'; // 落ち着いたスレートブルー
const tintColorDark = '#F7FAFC'; // オフホワイト
const accentGold = '#D4AF37'; // シャンパンゴールド

export const Colors = {
  light: {
    text: '#11181C',
    background: 'rgba(236, 250, 255, 1)',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Extended colors for Phase 2
    textSecondary: '#687076',
    backgroundSecondary: '#F3F4F6',
    backgroundTertiary: '#E5E7EB',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    accent: accentGold,
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    card: '#F7FAFC',
    // Role badge colors
    roleDeveloper: '#22c55e', // グリーン
    roleOfficial: '#eab308', // イエロー
    roleUser: '#06b6d4', // シアン
    // ---- UIリデザイン（2026/11）トークン。コントラストは背景 #ECFAFF / #F7FAFC 上で計測 ----
    textMuted: '#4A5568', // 弱い本文 7.0:1
    textLabel: '#687076', // 無効・ラベル 4.7:1
    tintText: '#3D6382', // 文字用ティント（リンク・選択中タブ・日付）6.0:1
    primaryButton: '#3D6382', // 主要ボタンの地
    primaryButtonText: '#FFFFFF', // 主要ボタンの文字 6.3:1
    secondaryButtonBorder: '#9BA1A6', // 枠線ボタンの線
    chipBackground: '#E5E7EB', // 中立チップの地
    chipText: '#1F2937', // 中立チップの文字 11.9:1
    tintChipBackground: 'rgba(61, 99, 130, 0.12)',
    tintChipText: '#3D6382', // 5.3:1
    successChipBackground: 'rgba(16, 185, 129, 0.14)',
    successChipText: '#047857', // 4.8:1
    warningChipBackground: 'rgba(245, 158, 11, 0.16)',
    warningChipText: '#92400E', // 6.2:1
    gold: '#8A6A12', // 価格と★登録ユーザー専用。ライトでは濃いめにして 4.7:1
    danger: '#C53030', // 削除・危険の文字 5.1:1
    divider: '#E5E7EB',
    // 写真の上に置くチップ（写真の明暗に関わらずダーク地＋白文字）
    photoOverlayBackground: 'rgba(26, 32, 44, 0.85)',
    photoOverlayText: '#F7FAFC',
    // タブバー・バッジ・シート
    tabBarBackground: 'rgba(247, 250, 252, 0.96)',
    badge: '#DC2626', // 白文字 4.8:1（#EF4444 だと 3.8:1 で不足）
    badgeText: '#FFFFFF',
    sheetBackground: '#FFFFFF',
    scrim: 'rgba(0, 0, 0, 0.4)',
    // ホーム（リデザイン）
    glassCardBackground: 'rgba(255, 255, 255, 0.6)',
    glassCardBorder: 'rgba(255, 255, 255, 0.7)',
    glassDivider: 'rgba(17, 24, 28, 0.1)',
    hourHighlightBackground: 'rgba(61, 99, 130, 0.12)',
    hourHighlightText: '#2C4A63',
    freshDot: '#2F855A',
    accentSurface: '#E3EEF6', // パウダーアラートの地
    accentSurfaceBorder: '#B7D0E4',
    softTintChipBackground: '#E3EEF6', // 予定がないときの条件チップ
    softTintChipText: '#2C4A63',
    dashedBorder: '#9BA1A6',
    attentionDot: '#C05621', // 届いたリクエストの点（色だけに頼らず文言でも伝える）
    weeklyBar: '#B7D0E4', // 週間の雪予報の棒（最大の日は tintText）
    weekendFrame: 'rgba(61, 99, 130, 0.1)',
    photoOverlayTint: '#8FB3D1', // 写真の上（暗いグラデーション）の日付。テーマに関わらず同じ
    photoGradientEnd: 'rgba(10, 14, 22, 0.85)',
  },
  dark: {
    text: '#F7FAFC', // オフホワイト
    background: 'rgba(26, 32, 44, 1)', // 深みのあるチャコールネイビー
    tint: tintColorLight, // スレートブルー
    icon: '#d3f1ffe0',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorLight, // スレートブルー
    // Extended colors for Phase 2
    textSecondary: '#E2E8F0', // ライトグレー
    backgroundSecondary: '#2D3748', // カード背景（少し明るいトーン）
    backgroundTertiary: '#374151', // より明るいトーン
    border: '#374151',
    borderLight: '#2D3748',
    accent: accentGold, // シャンパンゴールド
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    card: '#242B38', // カード背景
    // Role badge colors
    roleDeveloper: '#22c55e', // グリーン
    roleOfficial: '#eab308', // イエロー
    roleUser: '#06b6d4', // シアン
    // ---- UIリデザイン（2026/11）トークン。docs/ui-redesign/README.md「1. デザインの基本ルール」 ----
    textMuted: '#CBD5E0', // 弱い本文
    textLabel: '#9BA1A6', // 無効・ラベル 5.4:1（カード上）
    tintText: '#8FB3D1', // 文字用ティント（リンク・選択中タブ・日付）6.4:1。#5A7D9A を文字に使わない
    primaryButton: '#8FB3D1', // 主要ボタンの地
    primaryButtonText: '#1A202C', // 主要ボタンの文字 7.4:1
    secondaryButtonBorder: '#4A5568', // 枠線ボタンの線
    chipBackground: '#2D3748', // 中立チップ・二次背景
    chipText: '#E2E8F0', // 9.7:1
    tintChipBackground: 'rgba(143, 179, 209, 0.16)',
    tintChipText: '#8FB3D1', // 4.7:1
    successChipBackground: 'rgba(16, 185, 129, 0.16)', // 「残り3人」など
    successChipText: '#6EE7B7', // 7.2:1
    warningChipBackground: 'rgba(245, 158, 11, 0.16)', // 「残り1人」「混雑」など
    warningChipText: '#FCD34D', // 7.4:1
    gold: accentGold, // 価格と★登録ユーザー専用 6.8:1
    danger: '#FC8181', // アカウント削除の文字だけ 6.7:1
    divider: '#374151',
    photoOverlayBackground: 'rgba(26, 32, 44, 0.85)',
    photoOverlayText: '#F7FAFC',
    // タブバー・バッジ・シート（New-Home.html 下部の <nav>）
    tabBarBackground: 'rgba(26, 32, 44, 0.96)',
    badge: '#DC2626', // 白文字 4.8:1（#EF4444 だと 3.8:1 で不足）
    badgeText: '#FFFFFF',
    sheetBackground: '#242B38',
    scrim: 'rgba(0, 0, 0, 0.6)',
    // ホーム（リデザイン）：New-Home-Weather.html / New-Home-Snow.html / New-Home-NoPlan.html
    glassCardBackground: 'rgba(20, 30, 50, 0.6)',
    glassCardBorder: 'rgba(255, 255, 255, 0.15)',
    glassDivider: 'rgba(255, 255, 255, 0.12)',
    hourHighlightBackground: 'rgba(143, 179, 209, 0.14)',
    hourHighlightText: '#B7D0E4',
    freshDot: '#68D391',
    accentSurface: '#24364A',
    accentSurfaceBorder: '#3E5A76',
    softTintChipBackground: '#2F4256',
    softTintChipText: '#D3E4F1',
    dashedBorder: '#5A6B80',
    attentionDot: '#F6AD55',
    weeklyBar: '#4A6A88',
    weekendFrame: 'rgba(143, 179, 209, 0.12)',
    photoOverlayTint: '#8FB3D1', // 写真の上（暗いグラデーション）の日付。テーマに関わらず同じ
    photoGradientEnd: 'rgba(10, 14, 22, 0.85)',
  },
};

export type ThemeColors = typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
