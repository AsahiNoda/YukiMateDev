import { borderRadius, fontSize, fontWeight, touchTarget } from '@/constants/spacing';
import { ThemeColors } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

/**
 * neutral: 中立（「無料」「上級」など。上級を赤で示さない）
 * tint:    ティント（「一人参加OK」「ホスト」）
 * success: 成功系（「残り3人」）
 * warning: 注意系（「残り1人」「混雑」）— 色だけに頼らず、文言でも状態を伝えること
 * outline: 枠線のみ（プロフィールのレベル・スタイル）
 * overlay: 写真の上に置く（日付・レベル・参加人数）
 * starred: ★登録ユーザーが参加（金色の地。参加を決める大事な手がかりなので目立たせる。写真の上でも読める）
 */
export type ChipTone = 'neutral' | 'tint' | 'success' | 'warning' | 'outline' | 'overlay' | 'starred';

interface ChipProps {
  /** 翻訳済みの文言（t() を通したもの） */
  label: string;
  tone?: ChipTone;
  icon?: keyof typeof Ionicons.glyphMap;
  /** フィルター用：押せるチップにする。高さ44未満なので hitSlop でタップ領域を補う */
  onPress?: () => void;
  /** フィルター用：選択中は主要ボタンと同じ塗り */
  selected?: boolean;
  /** 末尾に ▾ を付ける（ドロップダウンのフィルター） */
  showCaret?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

function toneColors(c: ThemeColors, tone: ChipTone) {
  switch (tone) {
    case 'tint':
      return { bg: c.tintChipBackground, fg: c.tintChipText, border: 'transparent' };
    case 'success':
      return { bg: c.successChipBackground, fg: c.successChipText, border: 'transparent' };
    case 'warning':
      return { bg: c.warningChipBackground, fg: c.warningChipText, border: 'transparent' };
    case 'outline':
      return { bg: 'transparent', fg: c.chipText, border: c.secondaryButtonBorder };
    case 'overlay':
      return { bg: c.photoOverlayBackground, fg: c.photoOverlayText, border: 'transparent' };
    case 'starred':
      // 金色の地に、主要ボタンと同じ文字色（ライト：白／ダーク：紺）
      return { bg: c.gold, fg: c.primaryButtonText, border: 'transparent' };
    case 'neutral':
    default:
      return { bg: c.chipBackground, fg: c.chipText, border: 'transparent' };
  }
}

/**
 * ピル型のチップ。表示だけのラベル（小）と、押せるフィルター（大）の両方に使う。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Explore.html のフィルター行とカード内のチップ。
 */
export function Chip({
  label,
  tone = 'neutral',
  icon,
  onPress,
  selected = false,
  showCaret = false,
  style,
  accessibilityLabel,
  testID,
}: ChipProps) {
  const c = useAppColors();
  const isFilter = !!onPress;
  const base = toneColors(c, tone);
  const colors = selected
    ? { bg: c.primaryButton, fg: c.primaryButtonText, border: 'transparent' }
    : base;

  const content = (
    <>
      {icon ? <Ionicons name={icon} size={isFilter ? 14 : 12} color={colors.fg} /> : null}
      <Text
        numberOfLines={1}
        style={[
          isFilter ? styles.filterText : styles.labelText,
          { color: colors.fg },
          selected && styles.selectedText,
        ]}
      >
        {label}
      </Text>
      {showCaret ? <Ionicons name="chevron-down" size={12} color={colors.fg} /> : null}
    </>
  );

  const containerStyle = [
    styles.base,
    isFilter ? styles.filter : styles.label,
    { backgroundColor: colors.bg, borderColor: colors.border },
    style,
  ];

  if (!isFilter) {
    return (
      <View style={containerStyle} accessibilityLabel={accessibilityLabel} testID={testID}>
        {content}
      </View>
    );
  }

  // フィルターチップの見た目は高さ約34。上下5ずつ hitSlop を足して44にする
  const slop = Math.max(0, (touchTarget.min - FILTER_HEIGHT) / 2);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: slop, bottom: slop, left: 0, right: 0 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      testID={testID}
      style={({ pressed }) => [containerStyle, pressed && { opacity: 0.8 }]}
    >
      {content}
    </Pressable>
  );
}

const FILTER_HEIGHT = 34;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    gap: 4,
  },
  label: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  filter: {
    minHeight: FILTER_HEIGHT,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  labelText: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
  },
  filterText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.normal,
  },
  selectedText: {
    fontWeight: fontWeight.bold,
  },
});

export default Chip;
