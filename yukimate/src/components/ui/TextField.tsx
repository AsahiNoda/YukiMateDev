import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  /** 入力欄の上に常に出すラベル（プレースホルダーだけにしない） */
  label: string;
  /** 入力欄の下の補足（エラーが無いときだけ出す） */
  hint?: string;
  /** 入力欄の下のエラー。あると枠と文字が強調される */
  error?: string | null;
  /** パスワード：伏せ字と「表示／隠す」の切り替え */
  password?: boolean;
}

/**
 * ラベル付きの入力欄（ログイン・新規登録・パスワード・プロフィール作成で共通）。
 *   - ラベルは常に表示（Material / Atlassian：プレースホルダーをラベル代わりにしない）
 *   - エラーはその欄のすぐ下に出す（アラートで出さない）
 *   - パスワードは「表示」で中身を確認できる（HIG：パスワード管理アプリの自動入力も効くよう textContentType を渡す）
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, password, editable = true, ...rest },
  ref
) {
  const c = useAppColors();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? c.danger : focused ? c.tintText : c.glassCardBorder;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.box,
          { backgroundColor: c.backgroundSecondary, borderColor },
          !editable && { opacity: 0.6 },
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          secureTextEntry={password ? !revealed : rest.secureTextEntry}
          placeholderTextColor={c.textLabel}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, { color: c.text }]}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
        />
        {password ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            style={styles.reveal}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('onboarding.hidePassword') : t('onboarding.showPassword')}
          >
            <Text style={[styles.revealText, { color: c.tintText }]}>
              {revealed ? t('onboarding.hide') : t('onboarding.show')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.message, { color: c.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.message, { color: c.textLabel }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.semibold,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.min + 6,
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md - 2,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 12,
  },
  reveal: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  revealText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
  },
  message: {
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
});

export default TextField;
