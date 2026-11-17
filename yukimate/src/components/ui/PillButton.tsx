import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

export type PillButtonVariant = 'primary' | 'secondary' | 'danger';
export type PillButtonSize = 'md' | 'sm';

interface PillButtonProps {
  /** 翻訳済みの文言（t() を通したもの） */
  title: string;
  onPress: () => void;
  /**
   * primary: ティント地＋紺文字（主要ボタン）
   * secondary: 枠線のみ（「詳細」「自分で作る」など）
   * danger: 文字だけ赤（アカウント削除など）
   */
  variant?: PillButtonVariant;
  /** md: 文字14px／sm: 文字13px。どちらも高さは44 */
  size?: PillButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  /** 「新着2」などのバッジ。主要ボタンの中に表示する */
  badge?: string;
  loading?: boolean;
  disabled?: boolean;
  /** 横幅いっぱいに伸ばす（flex: 1） */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * ピル型（角丸999）のボタン。高さ44でタップ領域の基準を満たす。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Home-Slide2.html の「チャットを開く」「詳細」。
 */
export function PillButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  badge,
  loading = false,
  disabled = false,
  fill = false,
  style,
  accessibilityLabel,
  testID,
}: PillButtonProps) {
  const c = useAppColors();

  const backgroundColor = variant === 'primary' ? c.primaryButton : 'transparent';
  const textColor =
    variant === 'primary' ? c.primaryButtonText : variant === 'danger' ? c.danger : c.text;
  const borderColor = variant === 'secondary' ? c.secondaryButtonBorder : 'transparent';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor, borderColor },
        fill && styles.fill,
        (pressed || isDisabled) && { opacity: isDisabled ? 0.5 : 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={textColor} /> : null}
          <Text
            numberOfLines={1}
            style={[styles.text, { color: textColor, fontSize: size === 'sm' ? 13 : fontSize.sm }]}
          >
            {title}
          </Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: variant === 'primary' ? c.primaryButtonText : c.primaryButton }]}>
              <Text style={[styles.badgeText, { color: variant === 'primary' ? c.primaryButton : c.primaryButtonText }]}>
                {badge}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget.min,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  md: {
    paddingHorizontal: spacing.md + 2, // 18
  },
  sm: {
    paddingHorizontal: spacing.md - 2, // 14
  },
  fill: {
    flex: 1,
  },
  text: {
    fontWeight: fontWeight.bold,
  },
  badge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: 7,
    minHeight: 18,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
});

export default PillButton;
