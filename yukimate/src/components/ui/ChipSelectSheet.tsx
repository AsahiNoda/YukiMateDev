import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChipSelectSheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (values: T[]) => void;
  onClose: () => void;
  /** 「すべて解除」 */
  clearLabel: string;
  /** 「完了」 */
  doneLabel: string;
}

/**
 * 下から出る、いくつでも選べるシート。選択肢は丸いチップで並べ、押すたびにすぐ反映する
 * （1つだけ選ぶものは OptionSheet）。
 */
export function ChipSelectSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onChange,
  onClose,
  clearLabel,
  doneLabel,
}: ChipSelectSheetProps<T>) {
  const c = useAppColors();
  const insets = useSafeAreaInsets();

  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} accessibilityLabel={doneLabel} />
      <View style={[styles.sheet, { backgroundColor: c.sheetBackground, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
            {title}
          </Text>
          {selected.length > 0 ? (
            <Pressable onPress={() => onChange([])} hitSlop={8} accessibilityRole="button" style={styles.clear}>
              <Text style={[styles.clearText, { color: c.tintText }]}>{clearLabel}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.chips}>
          {options.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={selected.includes(option.value)}
              onPress={() => toggle(option.value)}
              testID={`chip-option-${option.value}`}
            />
          ))}
        </View>
        <PillButton title={doneLabel} onPress={onClose} style={styles.done} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md - 4,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  clear: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
  },
  clearText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: spacing.md - 4,
  },
  done: {
    marginTop: spacing.lg,
  },
});

export default ChipSelectSheet;
