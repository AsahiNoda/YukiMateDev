import { borderRadius, fontSize, fontWeight, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SegmentedToggleProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /** 横幅いっぱいに広げ、選択肢を等分する（ログイン／新規登録など） */
  fill?: boolean;
}

/**
 * 2〜3択の切り替え（「リスト／スワイプ」など）。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Explore.html のヘッダー右。
 */
export function SegmentedToggle<T extends string>({ options, value, onChange, accessibilityLabel, fill }: SegmentedToggleProps<T>) {
  const c = useAppColors();
  // 見た目の高さは約34。上下に hitSlop を足してタップ領域を44にする
  const slop = (touchTarget.min - SEGMENT_HEIGHT - PADDING * 2) / 2 + PADDING;

  return (
    <View
      style={[styles.container, { backgroundColor: c.chipBackground }, fill && styles.fill]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            hitSlop={{ top: slop, bottom: slop }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={[styles.segment, fill && styles.segmentFill, selected && { backgroundColor: c.background }]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? c.text : c.chipText, fontWeight: selected ? fontWeight.bold : fontWeight.normal },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PADDING = 3;
const SEGMENT_HEIGHT = 30;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: PADDING,
  },
  segment: {
    height: SEGMENT_HEIGHT,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.meta,
  },
  fill: {
    alignSelf: 'stretch',
  },
  segmentFill: {
    flex: 1,
  },
});

export default SegmentedToggle;
