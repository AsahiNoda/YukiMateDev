import { fontSize } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** パスワードの決まり（utils/validation.ts の validatePassword と同じ） */
export const PASSWORD_RULES = [
  { key: 'length', test: (p: string) => p.length >= 8 },
  { key: 'upper', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', test: (p: string) => /[0-9]/.test(p) },
] as const;

export const passwordMeetsRules = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

/**
 * パスワードの決まりを、入力に合わせて満たした順に示す（失敗してから知らせるのではなく先に見せる）。
 * 色だけに頼らず、チェックの形でも分かるようにする。
 */
export function PasswordRules({ password }: { password: string }) {
  const c = useAppColors();
  const { t } = useTranslation();
  return (
    <View style={styles.list}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <View
            key={rule.key}
            style={styles.row}
            accessible
            accessibilityLabel={`${t(`onboarding.rule_${rule.key}`)}、${ok ? t('onboarding.ruleMet') : t('onboarding.ruleNotMet')}`}
          >
            <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={ok ? c.tintText : c.textLabel} />
            <Text style={[styles.text, { color: ok ? c.text : c.textLabel }]}>{t(`onboarding.rule_${rule.key}`)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontSize: fontSize.xs,
  },
});

export default PasswordRules;
