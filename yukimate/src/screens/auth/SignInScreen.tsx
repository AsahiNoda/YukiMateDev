import { logHandled } from '@/lib/logHandled';
import { AuthNotice, AuthScaffold } from '@/components/auth/AuthScaffold';
import { PillButton } from '@/components/ui/PillButton';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { TextField } from '@/components/ui/TextField';
import { fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

/** 利用規約の版（規約を改定したら更新する。サインアップ時にアカウントへ記録） */
const TERMS_VERSION = '2026-11-19';
/** 確認メールの再送までの待ち時間（秒） */
const RESEND_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = 'signin' | 'signup' | 'reset';
/** existing：登録の途中（メール未確認）だったアカウントに確認メールを送り直した */
type Sent = { kind: 'signup' | 'reset'; email: string; existing?: boolean } | null;

/**
 * ログイン・新規登録・パスワードを忘れたとき（1画面で切り替える）。
 *
 * 新規登録の流れ（仕組みは以前と同じ）：
 *   メールアドレス＋規約に同意 → メールのリンク（slopelink://set-password）→ パスワード設定 → プロフィール作成
 * パスワードを忘れたとき：
 *   メールアドレス → メールのリンク（slopelink://reset-password）→ 新しいパスワード → ログイン
 *
 * 結果はアラートではなく画面の中で伝える（エラーは欄の下、送信後は「メールを確認」の画面）。
 */
export default function SignInScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<Sent>(null);
  const [cooldown, setCooldown] = useState(0);
  const [errors, setErrors] = useState<{ email?: string; password?: string; terms?: string; form?: string }>({});
  const [info, setInfo] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  // メールのリンクの期限切れ・無効で戻ってきたとき（RootLayout が linkError を付けて開く）
  const { linkError } = useLocalSearchParams<{ linkError?: string }>();
  useEffect(() => {
    if (!linkError) return;
    // 次にすることは「新規登録から同じメールアドレスで送り直す」なので、新規登録を開いておく
    setMode('signup');
    setErrors({ form: t('onboarding.linkExpiredSignIn') });
  }, [linkError, t]);

  // 再送までのカウントダウン
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setInfo(null);
  };

  const checkEmail = () => {
    const value = email.trim();
    if (!value) return t('onboarding.emailRequired');
    if (!EMAIL_PATTERN.test(value)) return t('onboarding.emailInvalid');
    return undefined;
  };

  // ---------- 送信処理（Supabase の呼び方は以前と同じ） ----------

  /** メールのエラーを画面の文言に（送りすぎ・その他） */
  const emailErrorMessage = (error: { message?: string; code?: string; status?: number }): string => {
    const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
    if (error.status === 429 || text.includes('rate limit') || text.includes('security purposes')) {
      return t('onboarding.tooManyEmails');
    }
    return t('onboarding.genericError');
  };

  const sendSignupLink = async (address: string) => {
    // メール確認のリンクを確実に届けるため、ログイン用のリンクも明示的に送る（以前と同じ）
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: 'slopelink://set-password', shouldCreateUser: false },
    });
    return error;
  };

  const handleSignUp = async () => {
    const emailError = checkEmail();
    const termsError = agreed ? undefined : t('onboarding.termsRequired');
    setErrors({ email: emailError, terms: termsError });
    if (emailError || termsError) return;

    const address = email.trim();
    setLoading(true);
    try {
      // 登録を終えているメールアドレス（プロフィールまで作成済み）は新規登録させず、ログインへ案内する
      // （20261130000000_signup_email_status.sql。関数がまだ無いときは、以前どおり下の流れで扱う）
      const { data: status, error: statusError } = await supabase.rpc('signup_email_status' as any, { p_email: address } as any);
      if (!statusError && status === 'registered') {
        logHandled('SignUp', 'already registered → sign in');
        setMode('signin');
        setErrors({});
        setInfo(t('onboarding.accountExists'));
        return;
      }

      // パスワードは次の画面（メールのリンクから）で決めるので、ここでは本人にも見えない仮のものを使う
      const dummyPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'Aa1!';
      const { data, error } = await supabase.auth.signUp({
        email: address,
        password: dummyPassword,
        options: {
          emailRedirectTo: 'slopelink://set-password',
          data: { terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION },
        },
      });
      // 登録済みのメールアドレス：このプロジェクトでは 422 user_already_exists が返る
      // （設定によっては、エラーではなく identities が空のユーザーが返る。どちらも同じに扱う）
      const alreadyRegistered =
        error?.code === 'user_already_exists' ||
        /already registered/i.test(error?.message ?? '') ||
        (!error && data?.user?.identities?.length === 0);
      if (error && !alreadyRegistered) throw error;

      // 登録済みのメールアドレス（リンクの期限切れで登録を終えられなかった人を含む）。
      // このプロジェクトはメール確認を省いているので、アカウントは作られた時点で確認済みになり、
      // 仮のパスワードのままログインできなくなる。→ パスワードを決める画面へのリンクを改めて送り、続きから進めてもらう
      // （プロフィールがあればホームへ、無ければプロフィール作成へ進む。メールを受け取れる本人だけが進める）
      if (alreadyRegistered) {
        logHandled('SignUp', 'already registered → sending set-password link');
        const linkError = await sendSignupLink(address);
        if (linkError) {
          setErrors({ form: emailErrorMessage(linkError) });
          return;
        }
        setSent({ kind: 'signup', email: address, existing: true });
        setCooldown(RESEND_SECONDS);
        return;
      }

      // メール確認なしでログインされた設定のときは、いったん抜けてリンクから進んでもらう
      if (data?.session) await supabase.auth.signOut();
      const linkError = await sendSignupLink(address);
      if (linkError) logHandled('SignUp', `link not sent: ${linkError.message}`);

      setSent({ kind: 'signup', email: address });
      setCooldown(RESEND_SECONDS);
    } catch (error: any) {
      logHandled('SignUp', error);
      setErrors({ form: emailErrorMessage(error ?? {}) });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    const emailError = checkEmail();
    const passwordError = password ? undefined : t('onboarding.passwordRequired');
    setErrors({ email: emailError, password: passwordError });
    setInfo(null);
    if (emailError || passwordError) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const message = error.message || '';
        if (message.includes('Invalid login credentials')) {
          setErrors({ form: t('onboarding.invalidCredentials') });
        } else if (message.includes('Email not confirmed')) {
          setErrors({ form: t('onboarding.emailNotConfirmed') });
        } else {
          setErrors({ form: t('onboarding.genericError') });
        }
        return;
      }
      // 画面の移動は RootLayout の onAuthStateChange に任せる（プロフィールの有無で行き先が変わる）
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const emailError = checkEmail();
    setErrors({ email: emailError });
    if (emailError) return;

    const address = email.trim();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: 'slopelink://reset-password' });
      if (error) throw error;
      setSent({ kind: 'reset', email: address });
      setCooldown(RESEND_SECONDS);
    } catch (error: any) {
      logHandled('ForgotPassword', error);
      setErrors({ form: emailErrorMessage(error ?? {}) });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!sent || cooldown > 0) return;
    setLoading(true);
    try {
      let error;
      if (sent.kind === 'signup') {
        // パスワードを決める画面へのリンクを送り直す（メール確認を省いた設定なので、確認メールではなくこちら）
        error = await sendSignupLink(sent.email);
      } else {
        error = (await supabase.auth.resetPasswordForEmail(sent.email, { redirectTo: 'slopelink://reset-password' })).error;
      }
      setInfo(error ? emailErrorMessage(error) : t('onboarding.resent'));
      if (!error) setCooldown(RESEND_SECONDS);
    } finally {
      setLoading(false);
    }
  };

  // ---------- 送信後：「メールを確認してください」 ----------

  if (sent) {
    return (
      <AuthScaffold
        title={t('onboarding.checkEmailTitle')}
        subtitle={t(sent.kind === 'signup' ? 'onboarding.checkEmailSignup' : 'onboarding.checkEmailReset', { email: sent.email })}
        step={sent.kind === 'signup' ? { current: 1, total: 4 } : undefined}
        onBack={() => {
          setSent(null);
          setInfo(null);
        }}
        footer={
          <Pressable
            onPress={() => {
              setSent(null);
              setInfo(null);
              switchMode('signin');
            }}
            style={styles.textButton}
            accessibilityRole="button"
          >
            <Text style={[styles.textButtonLabel, { color: c.tintText }]}>{t('onboarding.backToSignIn')}</Text>
          </Pressable>
        }
      >
        {info ? <AuthNotice text={info} tone="info" /> : null}
        <Text style={[styles.body, { color: c.textMuted }]}>
          {sent.existing ? `${t('onboarding.resumedSignup')}\n` : ''}
          {t('onboarding.checkEmailHint')}
        </Text>
        <PillButton
          title={cooldown > 0 ? t('onboarding.resendIn', { seconds: cooldown }) : t('onboarding.resend')}
          variant="secondary"
          onPress={handleResend}
          disabled={cooldown > 0}
          loading={loading}
          testID="auth-resend"
        />
        <Pressable
          onPress={() => {
            setSent(null);
            setInfo(null);
          }}
          style={styles.textButton}
          accessibilityRole="button"
        >
          <Text style={[styles.textButtonLabel, { color: c.tintText }]}>{t('onboarding.useDifferentEmail')}</Text>
        </Pressable>
      </AuthScaffold>
    );
  }

  // ---------- パスワードを忘れたとき ----------

  if (mode === 'reset') {
    return (
      <AuthScaffold
        title={t('onboarding.resetTitle')}
        subtitle={t('onboarding.resetSubtitle')}
        onBack={() => switchMode('signin')}
      >
        {errors.form ? <AuthNotice text={errors.form} /> : null}
        <TextField
          label={t('onboarding.emailLabel')}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          placeholder="name@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleReset}
          editable={!loading}
          testID="auth-reset-email"
        />
        <PillButton title={t('onboarding.resetButton')} onPress={handleReset} loading={loading} testID="auth-reset-submit" />
      </AuthScaffold>
    );
  }

  // ---------- ログイン／新規登録 ----------

  const isSignUp = mode === 'signup';

  return (
    <AuthScaffold
      showBrand
      title={isSignUp ? t('onboarding.signUpTitle') : t('onboarding.signInTitle')}
      subtitle={isSignUp ? t('onboarding.signUpSubtitle') : undefined}
    >
      <SegmentedToggle<'signin' | 'signup'>
        options={[
          { value: 'signin', label: t('onboarding.signInTab') },
          { value: 'signup', label: t('onboarding.signUpTab') },
        ]}
        value={isSignUp ? 'signup' : 'signin'}
        onChange={(v) => switchMode(v)}
        accessibilityLabel={t('onboarding.modeA11y')}
        fill
      />

      {info ? <AuthNotice text={info} tone="info" /> : null}
      {errors.form ? <AuthNotice text={errors.form} /> : null}

      <TextField
        label={t('onboarding.emailLabel')}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="name@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType={isSignUp ? 'emailAddress' : 'username'}
        returnKeyType={isSignUp ? 'done' : 'next'}
        onSubmitEditing={() => (isSignUp ? undefined : passwordRef.current?.focus())}
        editable={!loading}
        testID="auth-email"
      />

      {isSignUp ? (
        // 規約への同意（Apple Guideline 1.2）。チェックと文言をまとめて1つの押せる範囲にする
        <View style={styles.termsBlock}>
          <View style={styles.termsRow}>
            <Pressable
              onPress={() => setAgreed((v) => !v)}
              style={styles.checkbox}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel={t('auth.agreeToTermsA11y')}
              testID="signup-terms-checkbox"
            >
              <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={24} color={agreed ? c.tintText : c.textLabel} />
            </Pressable>
            <Text style={[styles.termsText, { color: c.textMuted }]} onPress={() => setAgreed((v) => !v)}>
              <Text style={[styles.link, { color: c.tintText }]} onPress={() => router.push('/terms-of-service' as any)}>
                {t('settings.termsOfService')}
              </Text>
              {t('auth.and')}
              <Text style={[styles.link, { color: c.tintText }]} onPress={() => router.push('/privacy-policy' as any)}>
                {t('settings.privacyPolicy')}
              </Text>
              {t('auth.agreeToTermsSuffix')}
            </Text>
          </View>
          {errors.terms ? <Text style={[styles.inlineError, { color: c.danger }]}>{errors.terms}</Text> : null}
        </View>
      ) : (
        <>
          <TextField
            ref={passwordRef}
            label={t('onboarding.passwordLabel')}
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            password
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSignIn}
            editable={!loading}
            testID="auth-password"
          />
          <Pressable onPress={() => switchMode('reset')} style={styles.forgot} accessibilityRole="button" testID="auth-forgot">
            <Text style={[styles.textButtonLabel, { color: c.tintText }]}>{t('onboarding.forgotPassword')}</Text>
          </Pressable>
        </>
      )}

      <PillButton
        title={isSignUp ? t('onboarding.signUpButton') : t('onboarding.signInButton')}
        onPress={isSignUp ? handleSignUp : handleSignIn}
        loading={loading}
        testID="auth-submit"
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: fontSize.sm,
    lineHeight: 21,
  },
  textButton: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  textButtonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  forgot: {
    minHeight: touchTarget.min - 8,
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },
  termsBlock: {
    gap: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  checkbox: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  termsText: {
    flex: 1,
    fontSize: fontSize.meta,
    lineHeight: 19,
  },
  link: {
    fontWeight: fontWeight.bold,
    textDecorationLine: 'underline',
  },
  inlineError: {
    fontSize: fontSize.xs,
    marginLeft: 2,
  },
});
