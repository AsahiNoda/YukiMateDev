import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ActionSheetAction {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** 削除など（赤い文字） */
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
  cancelLabel: string;
}

/** 下から出る操作の一覧（投稿の「…」メニューや通報の理由など） */
export function ActionSheet({ visible, title, actions, onClose, cancelLabel }: ActionSheetProps) {
  const c = useAppColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} accessibilityLabel={cancelLabel} />
      <View style={[styles.sheet, { backgroundColor: c.sheetBackground, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {title ? (
          <Text style={[styles.title, { color: c.textLabel }]} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, { borderBottomColor: c.divider }, pressed && { opacity: 0.7 }]}
          >
            {action.icon ? (
              <Ionicons name={action.icon} size={20} color={action.destructive ? c.danger : c.text} />
            ) : null}
            <Text style={[styles.actionText, { color: action.destructive ? c.danger : c.text }]}>{action.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
          <Text style={[styles.cancelText, { color: c.tintText }]}>{cancelLabel}</Text>
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
    borderTopLeftRadius: borderRadius.photoCard,
    borderTopRightRadius: borderRadius.photoCard,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  action: {
    minHeight: touchTarget.min + 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: fontSize.md,
  },
  cancel: {
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

export default ActionSheet;
