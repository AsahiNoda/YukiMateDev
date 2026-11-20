import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CreateMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  /** iOS：シートが閉じ終わったとき（続けて別のモーダルを開くときに使う） */
  onDismiss?: () => void;
  onCreateEvent: () => void;
  onPostResortNow: () => void;
}

/**
 * 中央の「作成」タブを押したときに出す選択シート。
 * 「作る」の入口をここに1つにまとめる（docs/ui-redesign/README.md「2. ナビゲーションの変更」）。
 */
export function CreateMenuSheet({ visible, onClose, onDismiss, onCreateEvent, onPostResortNow }: CreateMenuSheetProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const options = [
    {
      key: 'event',
      icon: 'people-outline' as const,
      title: t('createMenu.createEvent'),
      description: t('createMenu.createEventDescription'),
      onPress: onCreateEvent,
    },
    {
      key: 'post',
      icon: 'camera-outline' as const,
      title: t('createMenu.postResortNow'),
      description: t('createMenu.postResortNowDescription'),
      onPress: onPostResortNow,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onDismiss={onDismiss}>
      <Pressable
        style={[styles.scrim, { backgroundColor: c.scrim }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.sheetBackground, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: c.secondaryButtonBorder }]} />
        <Text style={[styles.title, { color: c.text }]}>{t('createMenu.title')}</Text>

        {options.map((option) => (
          <Pressable
            key={option.key}
            onPress={option.onPress}
            accessibilityRole="button"
            accessibilityLabel={option.title}
            accessibilityHint={option.description}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: c.chipBackground },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.optionIcon, { backgroundColor: c.primaryButton }]}>
              <Ionicons name={option.icon} size={22} color={c.primaryButtonText} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: c.text }]}>{option.title}</Text>
              <Text style={[styles.optionDescription, { color: c.textLabel }]}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textLabel} />
          </Pressable>
        ))}

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.cancelText, { color: c.tintText }]}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.photoCard,
    borderTopRightRadius: borderRadius.photoCard,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm + 2,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    padding: spacing.md - 2,
    borderRadius: borderRadius.card,
    minHeight: touchTarget.min + 20,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  optionDescription: {
    fontSize: fontSize.meta,
  },
  cancel: {
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

export default CreateMenuSheet;
