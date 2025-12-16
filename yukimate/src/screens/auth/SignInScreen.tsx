import { router } from 'expo-router';
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
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@lib/supabase';
import { validateEmail, validatePassword } from '@/utils/validation';

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { enableGuestMode } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleEmailPasswordAuth = async () => {
    // メールアドレスのバリデーション
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      Alert.alert(t('common.error'), emailValidation.error);
      return;
    }

    // パスワードのバリデーション
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      // サインアップ時のみ厳格なバリデーション
      if (mode === 'signup') {
        Alert.alert(t('common.error'), passwordValidation.error);
        return;
      }
      // サインイン時は基本的なチェックのみ
      if (!password || password.trim() === '') {
        Alert.alert(t('common.error'), t('auth.enterPassword'));
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        // サインアップ
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data?.user?.identities?.length === 0) {
          Alert.alert(t('common.error'), 'このメールアドレスは既に登録されています');
          return;
        }

        Alert.alert(
          t('auth.confirmEmailSent'),
          t('auth.checkEmailMessage'),
          [{ text: t('common.ok') }]
        );
      } else {
        // サインイン
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        console.log('✅ Signed in successfully:', data.user?.email);
        // RootLayout の onAuthStateChange が自動的にリダイレクトするまで待つ
        // 明示的なナビゲーションは行わない（競合を避けるため）
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert(t('common.error'), error.message || '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    // メールアドレスのバリデーション
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      Alert.alert(t('common.error'), emailValidation.error);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });

      if (error) throw error;

      Alert.alert(t('auth.checkEmail'), 'マジックリンクを送信しました');
    } catch (error: any) {
      console.error('Magic link error:', error);
      Alert.alert(t('common.error'), error.message || 'マジックリンクの送信に失敗しました');
    } finally {
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

          {/* 区切り線 */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{t('common.or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* マジックリンクボタン */}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: colors.tint }, loading && styles.buttonDisabled]}
            onPress={handleMagicLink}
            disabled={loading}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
              {t('auth.magicLink')}{mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
            </Text>
          </TouchableOpacity>

          {/* ゲストとして続行 */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              enableGuestMode();
              router.replace('/(tabs)/home');
            }}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>{t('auth.continueAsGuest')}</Text>
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
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    // borderColor is set dynamically
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    // color is set dynamically
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    // backgroundColor is set dynamically
  },
  dividerText: {
    // color is set dynamically
    paddingHorizontal: 16,
    fontSize: 14,
  },
});
