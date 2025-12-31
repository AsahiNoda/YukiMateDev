import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/contexts/LocaleContext';
import { supabase } from '@lib/supabase';
import { validateEmail, validatePassword } from '@/utils/validation';

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleEmailPasswordAuth = async () => {
    console.log('🔐 [SignIn] Starting authentication...', { mode, email });

    // メールアドレスのバリデーション
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      console.log('❌ [SignIn] Email validation failed:', emailValidation.error);
      Alert.alert(t('common.error'), emailValidation.error);
      return;
    }

    // パスワードのバリデーション
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      // サインアップ時のみ厳格なバリデーション
      if (mode === 'signup') {
        console.log('❌ [SignIn] Password validation failed:', passwordValidation.error);
        Alert.alert(t('common.error'), passwordValidation.error);
        return;
      }
      // サインイン時は基本的なチェックのみ
      if (!password || password.trim() === '') {
        console.log('❌ [SignIn] Password is empty');
        Alert.alert(t('common.error'), t('auth.enterPassword'));
        return;
      }
    }

    console.log('⏳ [SignIn] Setting loading state to true');
    setLoading(true);
    try {
      if (mode === 'signup') {
        // サインアップ
        console.log('📝 [SignIn] Calling signUp...');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data?.user?.identities?.length === 0) {
          console.log('⚠️  [SignIn] Account already exists');
          Alert.alert(t('common.error'), t('auth.accountAlreadyExists'));
          return;
        }

        console.log('✅ [SignIn] SignUp successful, confirmation email sent');
        Alert.alert(
          t('auth.confirmEmailSent'),
          t('auth.checkEmailMessage'),
          [{ text: t('common.ok') }]
        );
      } else {
        // サインイン
        console.log('🔑 [SignIn] Calling signInWithPassword...');
        console.log('📧 [SignIn] Email:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('❌ [SignIn] Sign in error:', error);
          throw error;
        }

        console.log('✅ [SignIn] Signed in successfully');
        console.log('📧 [SignIn] User email:', data.user?.email);
        console.log('🆔 [SignIn] User ID:', data.user?.id);
        console.log('⏳ [SignIn] Waiting for RootLayout onAuthStateChange to handle navigation...');
        // RootLayout の onAuthStateChange が自動的にリダイレクトするまで待つ
        // 明示的なナビゲーションは行わない（競合を避けるため）
      }
    } catch (error: any) {
      console.error('❌ [SignIn] Auth error:', error);
      Alert.alert(t('common.error'), error.message || t('auth.authenticationFailed'));
    } finally {
      console.log('✅ [SignIn] Setting loading state to false');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    console.log('🔐 [ForgotPassword] Starting password reset flow...');

    // メールアドレスのバリデーション
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      console.log('❌ [ForgotPassword] Email validation failed:', emailValidation.error);
      Alert.alert(t('common.error'), t('auth.enterEmailForReset'));
      return;
    }

    console.log('📧 [ForgotPassword] Email validated:', email);
    setLoading(true);

    try {
      console.log('⏳ [ForgotPassword] Calling resetPasswordForEmail...');
      console.log('🔗 [ForgotPassword] Redirect URL: slopelink://reset-password');

      // アプリ内のパスワードリセット画面にリダイレクト
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'slopelink://reset-password',
      });

      console.log('📊 [ForgotPassword] Response received');
      console.log('📊 [ForgotPassword] Data:', data);
      console.log('📊 [ForgotPassword] Error:', error);

      if (error) {
        console.error('❌ [ForgotPassword] Supabase error:', error);
        throw error;
      }

      console.log('✅ [ForgotPassword] Reset email sent successfully');
      Alert.alert(
        t('auth.resetPasswordEmailSent'),
        t('auth.resetPasswordEmailMessage'),
        [{ text: t('common.ok') }]
      );
    } catch (error: any) {
      console.error('❌ [ForgotPassword] Password reset error:', error);
      console.error('❌ [ForgotPassword] Error name:', error.name);
      console.error('❌ [ForgotPassword] Error message:', error.message);
      console.error('❌ [ForgotPassword] Error stack:', error.stack);

      // より詳細なエラーメッセージを提供
      let errorMessage = error.message || t('auth.resetPasswordFailed');
      if (error.message?.includes('Error sending recovery email')) {
        errorMessage = t('auth.emailServiceNotConfigured');
      }

      Alert.alert(t('common.error'), errorMessage);
    } finally {
      console.log('✅ [ForgotPassword] Setting loading state to false');
      setLoading(false);
    }
  };

  const toggleLanguage = async () => {
    try {
      await setLocale(locale === 'ja' ? 'en' : 'ja');
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 言語切り替えボタン */}
      <TouchableOpacity
        style={styles.languageButton}
        onPress={toggleLanguage}
        disabled={loading}
      >
        <Text style={[styles.languageButtonText, { color: colors.text }]}>
          🌐 {locale === 'ja' ? 'EN' : 'JP'}
        </Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ロゴ */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>❄️</Text>
            <Text style={[styles.logoText, { color: colors.text }]}>YukiMate</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>{t('auth.tagline')}</Text>
          </View>

          {/* フォーム */}
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>
              {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder={t('auth.email')}
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
                placeholder={t('auth.password')}
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'signin' ? 'password' : 'new-password'}
                editable={!loading}
              />
            </View>

            {/* パスワードを忘れた場合 (サインインモード時のみ表示) */}
            {mode === 'signin' && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={[styles.forgotPasswordText, { color: colors.tint }]}>
                  {t('auth.forgotPasswordLink')}
                </Text>
              </TouchableOpacity>
            )}

            {/* メインボタン */}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: colors.tint }, loading && styles.buttonDisabled]}
              onPress={handleEmailPasswordAuth}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {loading ? t('common.processing') : mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
              </Text>
            </TouchableOpacity>

            {/* モード切替 */}
            <View style={styles.switchModeContainer}>
              <Text style={[styles.switchModeText, { color: colors.textSecondary }]}>
                {mode === 'signin'
                  ? t('auth.dontHaveAccount')?.split('はこちら')[0]
                  : t('auth.alreadyHaveAccount')?.split('はこちら')[0]}
              </Text>
              <TouchableOpacity
                onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                disabled={loading}
              >
                <Text style={[styles.switchModeLink, { color: colors.tint }]}>
                  {mode === 'signin' ? t('auth.signUp') : t('auth.signIn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  languageButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 56,
  },
  logoIcon: {
    fontSize: 72,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  inputContainer: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    fontSize: 16,
    marginBottom: 14,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButton: {
    // backgroundColor is set dynamically
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  switchModeText: {
    fontSize: 15,
  },
  switchModeLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});
