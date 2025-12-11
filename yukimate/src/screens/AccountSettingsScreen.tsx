import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@components/ui/icon-symbol';
import { supabase } from '@lib/supabase';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const { user } = useAuth();

  const [showEmailSection, setShowEmailSection] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert('エラー', '新しいメールアドレスを入力してください');
      return;
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }

    setEmailLoading(true);
    const startTime = Date.now();
    console.log('[AccountSettings] メールアドレス変更開始');

    try {
      // タイムアウト付きでメールアドレス更新（10秒）
      const updatePromise = supabase.auth.updateUser({
        email: newEmail,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('タイムアウト: 接続が遅い可能性があります')), 10000)
      );

      const result = await Promise.race([
        updatePromise,
        timeoutPromise,
      ]) as { error: any };

      const { error } = result;

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[AccountSettings] メールアドレス変更完了 (${duration}秒)`);

      if (error) throw error;

      // ローディング状態を即座にクリア
      setEmailLoading(false);

      // フォームをリセット
      setNewEmail('');
      setShowEmailSection(false);

      // 成功時の処理（ローディング解除後に表示）
      Alert.alert(
        '確認メールを送信しました',
        '新しいメールアドレスに確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。'
      );
    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`[AccountSettings] メールアドレス変更エラー (${duration}秒):`, error);

      // ローディング状態を即座にクリア
      setEmailLoading(false);

      // エラーメッセージを日本語化
      let errorMessage = 'メールアドレスの変更に失敗しました';
      if (error.message?.includes('タイムアウト')) {
        errorMessage = '接続がタイムアウトしました。ネットワーク接続を確認してください';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('エラー', errorMessage);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('エラー', 'パスワードは8文字以上にしてください');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('エラー', '新しいパスワードが一致しません');
      return;
    }

    Alert.alert(
      'パスワード変更',
      '本当にパスワードを変更しますか？変更後は新しいパスワードでログインしてください。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '変更する',
          onPress: async () => {
            setPasswordLoading(true);
            const startTime = Date.now();
            console.log('[AccountSettings] パスワード変更開始');

            try {
              // タイムアウト付きでパスワード更新（10秒）
              const updatePromise = supabase.auth.updateUser({
                password: newPassword,
              });

              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('タイムアウト: 接続が遅い可能性があります')), 10000)
              );

              const result = await Promise.race([
                updatePromise,
                timeoutPromise,
              ]) as { error: any };

              const { error: updateError } = result;

              const duration = ((Date.now() - startTime) / 1000).toFixed(2);
              console.log(`[AccountSettings] パスワード変更完了 (${duration}秒)`);

              if (updateError) {
                throw updateError;
              }

              // ローディング状態を即座にクリア
              setPasswordLoading(false);

              // フォームをリセット
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowPasswordSection(false);

              // 成功時の処理（ローディング解除後に表示）
              Alert.alert(
                'パスワード変更完了',
                'パスワードが正常に変更されました'
              );
            } catch (error: any) {
              const duration = ((Date.now() - startTime) / 1000).toFixed(2);
              console.error(`[AccountSettings] パスワード変更エラー (${duration}秒):`, error);

              // ローディング状態を即座にクリア
              setPasswordLoading(false);

              // エラーメッセージを日本語化
              let errorMessage = 'パスワードの変更に失敗しました';
              if (error.message?.includes('タイムアウト')) {
                errorMessage = '接続がタイムアウトしました。ネットワーク接続を確認してください';
              } else if (error.message?.includes('New password should be different')) {
                errorMessage = '新しいパスワードは現在のパスワードと異なる必要があります';
              } else if (error.message?.includes('Password should be at least')) {
                errorMessage = 'パスワードは8文字以上にしてください';
              } else if (error.message?.includes('same_password')) {
                errorMessage = '新しいパスワードは現在のパスワードと異なる必要があります';
              } else if (error.message) {
                errorMessage = error.message;
              }

              Alert.alert('エラー', errorMessage);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>アカウント設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Current Email */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>現在のメールアドレス</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.text }]}>{user?.email || '未設定'}</Text>
          </View>
        </View>

        {/* Change Email */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.expandButton, { borderColor: colors.border }]}
            onPress={() => setShowEmailSection(!showEmailSection)}
          >
            <View style={styles.expandButtonLeft}>
              <IconSymbol name="envelope" size={20} color={colors.text} />
              <Text style={[styles.expandButtonText, { color: colors.text }]}>メールアドレスを変更</Text>
            </View>
            <IconSymbol
              name={showEmailSection ? 'chevron.up' : 'chevron.down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showEmailSection && (
            <View style={[styles.formSection, { backgroundColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.text }]}>新しいメールアドレス</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="new.email@example.com"
                placeholderTextColor={colors.textSecondary}
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!emailLoading}
              />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                新しいメールアドレスに確認メールが送信されます
              </Text>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.accent }]}
                onPress={handleChangeEmail}
                disabled={emailLoading}
              >
                <Text style={styles.submitButtonText}>
                  {emailLoading ? '送信中...' : 'メールアドレスを変更'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Change Password */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.expandButton, { borderColor: colors.border }]}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <View style={styles.expandButtonLeft}>
              <IconSymbol name="lock" size={20} color={colors.text} />
              <Text style={[styles.expandButtonText, { color: colors.text }]}>パスワードを変更</Text>
            </View>
            <IconSymbol
              name={showPasswordSection ? 'chevron.up' : 'chevron.down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showPasswordSection && (
            <View style={[styles.formSection, { backgroundColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.text }]}>新しいパスワード</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="新しいパスワード（8文字以上）"
                placeholderTextColor={colors.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!passwordLoading}
              />

              <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>新しいパスワード（確認）</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder="新しいパスワード（確認）"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!passwordLoading}
              />

              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                パスワードは8文字以上で設定してください
              </Text>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.accent }]}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                <Text style={styles.submitButtonText}>
                  {passwordLoading ? '変更中...' : 'パスワードを変更'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.warningSection}>
          <IconSymbol name="exclamationmark.triangle" size={20} color="#FFA500" />
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            セキュリティのため、定期的にパスワードを変更することをお勧めします
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 16,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  expandButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  formSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
