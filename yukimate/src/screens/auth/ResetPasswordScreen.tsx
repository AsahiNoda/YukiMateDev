import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { validatePassword } from '@/utils/validation';
import { supabase } from '@lib/supabase';

export default function ResetPasswordScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
  const { session } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // セッションの有効性を確認
  useEffect(() => {
    console.log('🔍 [ResetPassword] Checking session from AuthContext...');
    console.log('🔍 [ResetPassword] Session exists:', !!session);

    if (session) {
      console.log('✅ [ResetPassword] Valid session found from AuthContext');
      console.log('📧 [ResetPassword] User email:', session.user.email);
      console.log('🆔 [ResetPassword] User ID:', session.user.id);
      setSessionReady(true);
    } else {
      console.log('⏳ [ResetPassword] Waiting for session from AuthContext...');
      // AuthContextがセッションを読み込むまで待つ
      const timer = setTimeout(() => {
        if (!session) {
          console.warn('⚠️  [ResetPassword] No session found after waiting');
          Alert.alert(
            'セッションエラー',
            'パスワードリセットのリンクが無効または期限切れです。もう一度リセットメールを送信してください。',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(auth)/sign-in'),
              },
            ]
          );
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleResetPassword = async () => {
    console.log('🔐 [ResetPassword] Starting password reset...');

    // パスワードのバリデーション
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      console.log('❌ [ResetPassword] Password validation failed:', passwordValidation.error);
      Alert.alert(t('common.error'), passwordValidation.error);
      return;
    }

    // パスワード確認
    if (newPassword !== confirmPassword) {
      console.log('❌ [ResetPassword] Passwords do not match');
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }

    console.log('⏳ [ResetPassword] Setting loading state to true');
    setLoading(true);
    try {
      // セッションを確認（AuthContextから取得済み）
      if (!session) {
        console.warn('⚠️  [ResetPassword] No session found before updateUser');
        throw new Error('セッションが見つかりません。もう一度リセットメールを送信してください。');
      }
      console.log('✅ [ResetPassword] Session verified, user ID:', session.user.id);
      console.log('📧 [ResetPassword] User email:', session.user.email);

      console.log('🔑 [ResetPassword] Calling updateUser with new password...');

      // パスワード更新を直接実装行（タイムアウトラッパーなし）
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      console.log('📊 [ResetPassword] Update response received');

      if (updateError) {
        console.error('❌ [ResetPassword] Update error:', updateError.message);
        throw updateError;
      }

      if (!updateData || !updateData.user) {
        console.error('❌ [ResetPassword] No user data in response');
        throw new Error('パスワード更新に失敗しました。');
      }

      console.log('✅ [ResetPassword] Password updated successfully');

      // パスワード更新成功後、セッションからサインアウトして新しいパスワードでログインできるようにする
      await supabase.auth.signOut();
      console.log('🚪 Signed out after password reset');

      Alert.alert(
        t('auth.resetPasswordSuccess'),
        t('auth.resetPasswordSuccessMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              console.log('➡️  [ResetPassword] Navigating to sign-in...');
              // ログイン画面に戻る
              router.replace('/(auth)/sign-in');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ [ResetPassword] Password reset error:', error);
      Alert.alert(t('common.error'), error.message || t('auth.resetPasswordFailed'));
    } finally {
      console.log('✅ [ResetPassword] Setting loading state to false');
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
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            {t('auth.resetPasswordTitle')}
          </Text>
        </View>

        {/* フォーム */}
        <View style={styles.form}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('auth.resetPasswordTitle')}
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder={t('auth.newPassword')}
            placeholderTextColor={colors.textSecondary}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!loading}
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder={t('auth.confirmPassword')}
            placeholderTextColor={colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!loading}
          />

          {/* リセットボタン */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: colors.tint },
              (loading || !sessionReady) && styles.buttonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={loading || !sessionReady}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              {!sessionReady ? 'セッション確認中...' : loading ? t('common.processing') : t('auth.resetPassword')}
            </Text>
          </TouchableOpacity>

          {/* キャンセルボタン */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.replace('/(auth)/sign-in')}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              {t('common.cancel')}
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
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
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
  primaryButton: {},
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 12,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
});
