import { borderRadius, fontSize, fontWeight } from '@/constants/spacing';
import { router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/contexts/LocaleContext';
import { validatePassword } from '@/utils/validation';
import { supabase } from '@lib/supabase';

export default function ResetPasswordScreen() {
  console.log('🚀 [ResetPassword] Component mounted/rendered');

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const { session } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // loadingの最新値を参照するためのref
  const loadingRef = useRef(loading);

  // loadingが変わるたびにrefを更新
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  console.log('🔍 [ResetPassword] Render - Session exists:', !!session, 'sessionReady:', sessionReady);

  // USER_UPDATEDイベントをリッスンしてパスワード更新を検出
  useEffect(() => {
    console.log('📡 [ResetPassword] Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('🔔 [ResetPassword] Auth event:', event);
      // refを使って最新のloading状態を参照
      if (event === 'USER_UPDATED' && loadingRef.current) {
        console.log('✅ [ResetPassword] USER_UPDATED event detected - password update successful!');
        setPasswordUpdated(true);
      }
    });

    return () => {
      console.log('🔕 [ResetPassword] Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []); // 依存配列を空にして、マウント時に一度だけ登録

  // セッションの有効性を確認
  useEffect(() => {
    console.log('🔍 [ResetPassword] Checking session from AuthContext...');
    console.log('🔍 [ResetPassword] Session exists:', !!session);
    console.log('🔍 [ResetPassword] Full session:', session);

    // Supabaseから直接セッションを取得してみる
    const checkDirectSession = async () => {
      const { data: { session: directSession }, error } = await supabase.auth.getSession();
      console.log('🔍 [ResetPassword] Direct session check:', directSession);
      console.log('🔍 [ResetPassword] Direct session error:', error);
    };
    checkDirectSession();

    if (session) {
      console.log('✅ [ResetPassword] Valid session found from AuthContext');
      console.log('📧 [ResetPassword] User email:', session.user.email);
      console.log('🆔 [ResetPassword] User ID:', session.user.id);
      console.log('🔑 [ResetPassword] Access token exists:', !!session.access_token);
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
      }, 5000); // 3秒から5秒に延長

      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleResetPassword = async () => {
    console.log('🔐 [ResetPassword] Starting password reset...');

    // パスワードのバリデーション
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      console.log('❌ [ResetPassword] Password validation failed:', passwordValidation.error);
      // 両方のパスワード欄をクリア
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(t('common.error'), passwordValidation.error);
      return;
    }

    // パスワード確認
    if (newPassword !== confirmPassword) {
      console.log('❌ [ResetPassword] Passwords do not match');
      // 確認用パスワードのみクリア（新しいパスワードは残す）
      setConfirmPassword('');
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

      // パスワード更新を開始
      const updatePromise = supabase.auth.updateUser({
        password: newPassword,
      });

      console.log('⏳ [ResetPassword] Waiting for updateUser response (15s timeout)...');

      // タイムアウト処理（15秒に延長、USER_UPDATEDイベントを待つ時間を含む）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          // タイムアウト時、USER_UPDATEDイベントが発火していればエラーにしない
          if (passwordUpdated) {
            console.log('✅ [ResetPassword] Timeout but USER_UPDATED event was detected - treating as success');
            return;
          }
          reject(new Error('パスワード更新のリクエストがタイムアウトしました。ネットワーク接続を確認してください。'));
        }, 15000); // 15秒でタイムアウト
      });

      try {
        // タイムアウトとupdateUserのレース
        const result = await Promise.race([updatePromise, timeoutPromise]) as any;

        console.log('📊 [ResetPassword] Update response received');
        console.log('📊 [ResetPassword] Update result:', result);

        const { data: updateData, error: updateError } = result;

        console.log('📊 [ResetPassword] Update data:', updateData);
        console.log('📊 [ResetPassword] Update error:', updateError);

        if (updateError) {
          console.error('❌ [ResetPassword] Update error:', updateError.message);
          throw updateError;
        }

        if (!updateData || !updateData.user) {
          console.error('❌ [ResetPassword] No user data in response');
          throw new Error('パスワード更新に失敗しました。');
        }

        console.log('✅ [ResetPassword] Password updated successfully');
      } catch (error: any) {
        // タイムアウトエラーの場合、USER_UPDATEDイベントが発火していれば成功とみなす
        if (error.message?.includes('タイムアウト') && passwordUpdated) {
          console.log('✅ [ResetPassword] Timeout error but USER_UPDATED detected - treating as success');
        } else {
          throw error;
        }
      }

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
      console.error('❌ [ResetPassword] Error name:', error.name);
      console.error('❌ [ResetPassword] Error message:', error.message);
      console.error('❌ [ResetPassword] Full error:', JSON.stringify(error, null, 2));

      let errorMessage = error.message || t('auth.resetPasswordFailed');
      let isCriticalError = false; // 致命的なエラーかどうか

      // エラーの種類を判定
      if (error.message?.includes('タイムアウト') || error.message?.includes('timeout')) {
        // タイムアウトエラー（致命的）
        errorMessage = 'ネットワーク接続が遅すぎます。Wi-Fi環境で再度お試しください。';
        isCriticalError = true;
      } else if (error.message?.includes('セッション') || error.message?.includes('session') ||
                 error.message?.includes('expired') || error.message?.includes('invalid')) {
        // セッションエラー（致命的）
        errorMessage = 'パスワードリセットのリンクが無効または期限切れです。もう一度リセットメールを送信してください。';
        isCriticalError = true;
      } else if (error.message?.includes('same password') || error.message?.includes('同じパスワード')) {
        // 同じパスワードエラー（再試行可能）
        errorMessage = '新しいパスワードは以前のパスワードと異なるものを設定してください。';
        isCriticalError = false;
      } else if (error.message?.includes('weak') || error.message?.includes('short')) {
        // 弱いパスワードエラー（再試行可能）
        errorMessage = 'より強力なパスワードを設定してください（8文字以上推奨）。';
        isCriticalError = false;
      }

      // 致命的なエラーの場合のみセッションをクリアしてログアウト
      if (isCriticalError) {
        console.log('🚪 [ResetPassword] Critical error - clearing recovery session...');
        await supabase.auth.signOut();

        Alert.alert(t('common.error'), errorMessage, [
          {
            text: t('common.ok'),
            onPress: () => {
              router.replace('/(auth)/sign-in');
            },
          },
        ]);
      } else {
        // バリデーションエラーなど再試行可能なエラーの場合
        console.log('⚠️ [ResetPassword] Recoverable error - staying on reset password screen');

        // パスワード入力欄をクリア
        setNewPassword('');
        setConfirmPassword('');

        // エラーメッセージを表示（画面はそのまま）
        Alert.alert(t('common.error'), errorMessage);
      }
    } finally {
      console.log('✅ [ResetPassword] Setting loading state to false');
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
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              {t('auth.resetPasswordTitle')}
            </Text>
          </View>

          {/* フォーム */}
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('auth.resetPasswordTitle')}
            </Text>

            <View style={styles.inputContainer}>
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
            </View>

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
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {!sessionReady ? 'セッション確認中...' : loading ? t('common.processing') : t('auth.resetPassword')}
              </Text>
            </TouchableOpacity>

            {/* キャンセルボタン */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.replace('/(auth)/sign-in')}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
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
    borderRadius: borderRadius.glass,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  languageButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
    fontSize: fontSize.displayLarge,
    marginBottom: 12,
  },
  logoText: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: fontSize.meta,
    textAlign: 'center',
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.card,
    padding: 18,
    fontSize: fontSize.md,
    marginBottom: 14,
  },
  button: {
    borderRadius: borderRadius.card,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButton: {},
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.3,
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
});
