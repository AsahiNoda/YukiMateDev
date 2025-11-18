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

import { supabase } from '@lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleEmailPasswordAuth = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
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
          Alert.alert('エラー', 'このメールアドレスは既に登録されています');
          return;
        }

        Alert.alert(
          '確認メールを送信しました',
          'メールを確認して、アカウントを有効化してください',
          [{ text: 'OK' }]
        );
      } else {
        // サインイン
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        console.log('✅ Signed in successfully:', data.user?.email);
        // RootLayoutのonAuthStateChangeが自動的にホーム画面へリダイレクト
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('エラー', error.message || '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });

      if (error) throw error;

      Alert.alert('メールを確認してください', 'マジックリンクを送信しました');
    } catch (error: any) {
      console.error('Magic link error:', error);
      Alert.alert('エラー', error.message || 'マジックリンクの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* ロゴ */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>❄️</Text>
          <Text style={styles.logoText}>YukiMate</Text>
          <Text style={styles.tagline}>スキー・スノーボード愛好者のためのSNS</Text>
        </View>

        {/* フォーム */}
        <View style={styles.form}>
          <Text style={styles.title}>
            {mode === 'signin' ? 'ログイン' : '新規登録'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="メールアドレス"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="パスワード"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signin' ? 'password' : 'new-password'}
            editable={!loading}
          />

          {/* メインボタン */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailPasswordAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '処理中...' : mode === 'signin' ? 'ログイン' : '新規登録'}
            </Text>
          </TouchableOpacity>

          {/* モード切替 */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              {mode === 'signin'
                ? 'アカウントをお持ちでない方はこちら'
                : '既にアカウントをお持ちの方はこちら'}
            </Text>
          </TouchableOpacity>

          {/* 区切り線 */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>または</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* マジックリンクボタン */}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]}
            onPress={handleMagicLink}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>マジックリンクで{mode === 'signin' ? 'ログイン' : '登録'}</Text>
          </TouchableOpacity>

          {/* デバッグ用：ゲストとして続行 */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.replace('/(tabs)/home')}
            disabled={loading}
          >
            <Text style={styles.linkText}>ゲストとして続行</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
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
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#9CA3AF',
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
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#9CA3AF',
    paddingHorizontal: 16,
    fontSize: 14,
  },
});
