import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@lib/supabase';
import { validateEmail, validatePassword } from '@/utils/validation';

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        console.log('✅ [SignIn] Signed in successfully:', data.user?.email);
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
      Alert.alert(t('common.error'), error.message || t('auth.resetPasswordFailed'));
    } finally {
      console.log('✅ [ForgotPassword] Setting loading state to false');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
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

          {/* メインボタン */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.tint }, loading && styles.buttonDisabled]}
            onPress={handleEmailPasswordAuth}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              {loading ? t('common.processing') : mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
            </Text>
          </TouchableOpacity>

          {/* パスワードを忘れた場合 (サインインモード時のみ表示) */}
          {mode === 'signin' && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.tint }]}>
                {t('auth.forgotPasswordLink')}
              </Text>
            </TouchableOpacity>
          )}

          {/* モード切替 */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              {mode === 'signin'
                ? t('auth.dontHaveAccount')
                : t('auth.alreadyHaveAccount')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is set dynamically
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    // color is set dynamically
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    // color is set dynamically
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    // color is set dynamically
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    // backgroundColor, borderColor, color are set dynamically
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    // backgroundColor is set dynamically
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    // color is set dynamically
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 12,
    alignItems: 'center',
  },
  linkText: {
    // color is set dynamically
    fontSize: 14,
  },
  forgotPasswordText: {
    // color is set dynamically
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
