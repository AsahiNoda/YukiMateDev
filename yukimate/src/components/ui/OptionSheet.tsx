import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface OptionSheetOption<T> {
  value: T;
  label: string;
}

interface OptionSheetProps<T> {
  visible: boolean;
  title: string;
  options: OptionSheetOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  /** 閉じるボタンの文言（t('common.cancel') など） */
  closeLabel: string;
}

/**
 * 下から出る1つ選ぶシート（フィルターの「日付」「カテゴリ」「レベル」「並び替え」など）。
 */
export function OptionSheet<T extends string | null>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  closeLabel,
}: OptionSheetProps<T>) {
  const c = useAppColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} accessibilityLabel={closeLabel} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.sheetBackground, paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
          {title}
        </Text>
        <ScrollView style={styles.list}>
          {options.map((option) => {
            const isSelected = option.value === selected;
            return (
              <Pressable
                key={String(option.value)}
                onPress={() => onSelect(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                style={({ pressed }) => [
                  styles.option,
                  { borderBottomColor: c.divider },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: c.text, fontWeight: isSelected ? fontWeight.bold : fontWeight.normal },
                  ]}
                >
                  {option.label}
                </Text>
                {isSelected ? <Ionicons name="checkmark" size={20} color={c.tintText} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable onPress={onClose} style={styles.close} accessibilityRole="button">
          <Text style={[styles.closeText, { color: c.tintText }]}>{closeLabel}</Text>
        </Pressable>
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
    maxHeight: '70%',
    borderTopLeftRadius: borderRadius.photoCard,
    borderTopRightRadius: borderRadius.photoCard,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    minHeight: touchTarget.min + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: fontSize.md,
  },
  close: {
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  closeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

export default OptionSheet;
