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
    background: '#fff',
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
    card: '#F7FAFC',
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
    warning: '#fae631ff',
    card: '#242B38', // カード背景
  },
};

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
