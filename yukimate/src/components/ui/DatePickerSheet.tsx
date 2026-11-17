import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DatePickerSheetProps {
  visible: boolean;
  title: string;
  /** date：日付（既定）／time：時刻 */
  mode?: 'date' | 'time';
  value: Date | null;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  confirmLabel: string;
  cancelLabel: string;
}

/**
 * 日付または時刻を選ぶ。端末の標準のピッカーを使う。
 * - Android：標準のカレンダー／時計のダイアログ
 * - iOS：下から出るシートにカレンダー／時刻のドラムを表示し、「OK」で確定
 */
export function DatePickerSheet({
  visible,
  title,
  mode = 'date',
  value,
  minimumDate,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
}: DatePickerSheetProps) {
  const c = useAppColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  useEffect(() => {
    if (visible) setDraft(value ?? new Date());
    // value は呼び出し側で毎回作り直されることがあるので、時刻の値で比較する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, value?.getTime()]);

  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={draft}
        mode={mode}
        display={mode === 'time' ? 'clock' : 'calendar'}
        is24Hour
        minimumDate={mode === 'date' ? minimumDate : undefined}
        onChange={(event: DateTimePickerEvent, date?: Date) => {
          if (event.type === 'set' && date) onConfirm(date);
          else onCancel();
        }}
      />
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onCancel} accessibilityLabel={cancelLabel} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.sheetBackground, paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
          {title}
        </Text>
        <DateTimePicker
          value={draft}
          mode={mode}
          display={mode === 'time' ? 'spinner' : 'inline'}
          minimumDate={mode === 'date' ? minimumDate : undefined}
          style={mode === 'time' ? styles.timeSpinner : undefined}
          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
          accentColor={c.tintText}
          onChange={(_event: DateTimePickerEvent, date?: Date) => {
            if (date) setDraft(date);
          }}
        />
        <View style={styles.actions}>
          <PillButton title={cancelLabel} variant="secondary" onPress={onCancel} fill />
          <PillButton title={confirmLabel} onPress={() => onConfirm(draft)} fill />
        </View>
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
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  timeSpinner: {
    alignSelf: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    marginTop: spacing.sm,
  },
});

export default DatePickerSheet;
