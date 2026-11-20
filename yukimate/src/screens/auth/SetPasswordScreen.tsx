import { logHandled } from '@/lib/logHandled';
import { AuthNotice, AuthScaffold } from '@/components/auth/AuthScaffold';
import { PasswordRules, passwordMeetsRules } from '@/components/auth/PasswordRules';
import { PillButton } from '@/components/ui/PillButton';
import { TextField } from '@/components/ui/TextField';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@lib/supabase';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { TextInput } from 'react-native';

/**
 * 新規登録の2歩目：メールのリンク（slopelink://set-password）から開き、パスワードを決める。
 * 決まりは先に見せ、満たしたものから印が付く。終わったらそのままプロフィール作成へ（アラートは出さない）。
 */
export default function SetPasswordScreen() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const confirmRef = useRef<TextInput>(null);
  // 入力したパスワードが今のものと同じだった（登録済みのアカウントでリンクを開き直したとき）
  const [samePassword, setSamePassword] = useState(false);

  /** パスワードが決まったあと：プロフィールがもうある人（リンクを開き直した人など）はホームへ */
  const goNext = async () => {
    let hasProfile = false;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('user_id').eq('user_id', user.id).maybeSingle();
        hasProfile = !!data;
      }
    } catch {
      hasProfile = false;
    }
    router.replace(hasProfile ? '/(tabs)/home' : '/profile-setup');
  };

  const handleSubmit = async () => {
    const passwordError = passwordMeetsRules(password) ? undefined : t('onboarding.passwordRulesNotMet');
    const confirmError = !passwordError && password !== confirm ? t('onboarding.passwordMismatch') : undefined;
    setErrors({ password: passwordError, confirm: confirmError });
    setSamePassword(false);
    if (passwordError || confirmError) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await goNext();
    } catch (error: any) {
      logHandled('SetPassword', error);
      const message: string = error?.message || '';
      // 今と同じパスワード（Supabase：same_password）。欄の下で知らせ、このまま進む道も出す
      if (error?.code === 'same_password' || message.includes('different from the old')) {
        setSamePassword(true);
        setErrors({ password: t('onboarding.samePasswordAlreadySet') });
        return;
      }
      setErrors({
        form:
          message.includes('session') || message.includes('expired') || message.includes('invalid')
            ? t('onboarding.linkExpired')
            : t('onboarding.genericError'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      title={t('onboarding.setPasswordTitle')}
      subtitle={t('onboarding.setPasswordSubtitle')}
      step={{ current: 2, total: 4 }}
    >
      {errors.form ? <AuthNotice text={errors.form} /> : null}
      <TextField
        // 初めて決めるパスワードなので「新しい」は付けない（再設定の画面は「新しいパスワード」）
        label={t('onboarding.passwordLabel')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        password
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!loading}
        testID="set-password-new"
      />
      <PasswordRules password={password} />
      <TextField
        ref={confirmRef}
        label={t('onboarding.confirmPasswordLabel')}
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        password
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        editable={!loading}
        testID="set-password-confirm"
      />
      <PillButton title={t('onboarding.setPasswordButton')} onPress={handleSubmit} loading={loading} testID="set-password-submit" />
      {samePassword ? (
        <PillButton
          title={t('onboarding.keepPasswordContinue')}
          variant="secondary"
          onPress={goNext}
          testID="set-password-keep"
        />
      ) : null}
    </AuthScaffold>
  );
}
