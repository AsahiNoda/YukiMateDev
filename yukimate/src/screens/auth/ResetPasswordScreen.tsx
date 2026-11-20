import { logHandled } from '@/lib/logHandled';
import { AuthNotice, AuthScaffold } from '@/components/auth/AuthScaffold';
import { PasswordRules, passwordMeetsRules } from '@/components/auth/PasswordRules';
import { PillButton } from '@/components/ui/PillButton';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@lib/supabase';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TextInput } from 'react-native';

/** パスワード更新の応答を待つ上限（USER_UPDATED が先に届いていれば成功として扱う） */
const UPDATE_TIMEOUT_MS = 15000;
/** リンクから開いたときに、セッションが届くまで待つ時間 */
const SESSION_WAIT_MS = 5000;

/**
 * パスワードの再設定：メールのリンク（slopelink://reset-password）から開き、新しいパスワードを決める。
 * 終わったらログアウトして「ログインへ」の画面を出す（アラートではなく画面で伝える）。
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const confirmRef = useRef<TextInput>(null);
  // 更新の応答が遅くても、USER_UPDATED が届いていれば成功（以前と同じ扱い）
  const userUpdatedRef = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED') userUpdatedRef.current = true;
    });
    return () => subscription.unsubscribe();
  }, []);

  // リンクが無効・期限切れならセッションが来ない
  useEffect(() => {
    if (session) {
      setLinkExpired(false);
      return;
    }
    const timer = setTimeout(() => setLinkExpired(true), SESSION_WAIT_MS);
    return () => clearTimeout(timer);
  }, [session]);

  const handleSubmit = async () => {
    const passwordError = passwordMeetsRules(password) ? undefined : t('onboarding.passwordRulesNotMet');
    const confirmError = !passwordError && password !== confirm ? t('onboarding.passwordMismatch') : undefined;
    setErrors({ password: passwordError, confirm: confirmError });
    if (passwordError || confirmError) return;
    if (!session) {
      setLinkExpired(true);
      return;
    }

    setLoading(true);
    userUpdatedRef.current = false;
    try {
      const timeout = new Promise<{ timedOut: true }>((resolve) =>
        setTimeout(() => resolve({ timedOut: true }), UPDATE_TIMEOUT_MS)
      );
      const result: any = await Promise.race([supabase.auth.updateUser({ password }), timeout]);

      if (result?.timedOut) {
        if (!userUpdatedRef.current) throw new Error('timeout');
      } else if (result?.error) {
        throw result.error;
      }

      // 新しいパスワードでログインし直してもらう
      await supabase.auth.signOut();
      setDone(true);
    } catch (error: any) {
      const message: string = error?.message || '';
      logHandled('ResetPassword', message);
      if (error?.code === 'same_password' || message.includes('same password') || message.includes('different from the old')) {
        // 欄のすぐ下で知らせる（どの入力を直せばよいか分かるように）
        setErrors({ password: t('onboarding.samePassword') });
      } else if (message === 'timeout') {
        setErrors({ form: t('onboarding.networkSlow') });
      } else if (message.includes('session') || message.includes('expired') || message.includes('invalid')) {
        setLinkExpired(true);
      } else {
        setErrors({ form: t('onboarding.genericError') });
      }
    } finally {
      setLoading(false);
    }
  };

  // 途中でやめたときも、リンクで入った一時的なログインは残さない（以前と同じ）
  const toSignIn = async () => {
    if (session) await supabase.auth.signOut().catch(() => {});
    router.replace('/(auth)/sign-in');
  };

  if (done) {
    return (
      <AuthScaffold title={t('onboarding.resetDoneTitle')} subtitle={t('onboarding.resetDoneSubtitle')}>
        <PillButton title={t('onboarding.goToSignIn')} onPress={toSignIn} testID="reset-done-signin" />
      </AuthScaffold>
    );
  }

  if (linkExpired) {
    return (
      <AuthScaffold title={t('onboarding.linkExpiredTitle')} subtitle={t('onboarding.linkExpired')} onBack={toSignIn}>
        <PillButton title={t('onboarding.goToSignIn')} onPress={toSignIn} testID="reset-expired-signin" />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title={t('onboarding.newPasswordTitle')} subtitle={t('onboarding.newPasswordSubtitle')} onBack={toSignIn}>
      {!session ? <ActivityIndicator /> : null}
      {errors.form ? <AuthNotice text={errors.form} /> : null}
      <TextField
        label={t('onboarding.newPasswordLabel')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        password
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!loading && !!session}
        testID="reset-password-new"
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
        editable={!loading && !!session}
        testID="reset-password-confirm"
      />
      <PillButton
        title={t('onboarding.saveNewPassword')}
        onPress={handleSubmit}
        loading={loading}
        disabled={!session}
        testID="reset-password-submit"
      />
    </AuthScaffold>
  );
}
