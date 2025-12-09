import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@components/ui/icon-symbol';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://rmdpetmotoafaddkvyrk.supabase.co';

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      Alert.alert('エラー', '確認のため「DELETE」と入力してください');
      return;
    }

    Alert.alert(
      'アカウント削除',
      'この操作は取り消せません。本当にアカウントを削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: performDelete,
        },
      ],
    );
  };

  const performDelete = async () => {
    if (!user?.id) return;

    setDeleting(true);

    try {
      // セッション情報を取得
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('セッションが見つかりません');
      }

      // Edge Functionを呼び出してアカウント削除
      const response = await fetch(
        `${supabaseUrl}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'アカウント削除に失敗しました');
      }

      // ログアウト
      await signOut();

      // 認証画面へ
      router.replace('/(auth)/sign-in');

      Alert.alert('完了', 'アカウントを削除しました');
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert('エラー', error instanceof Error ? error.message : 'アカウント削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const ListItem = ({ icon, text }: { icon: string; text: string }) => (
    <View style={styles.listItem}>
      <IconSymbol name={icon} size={20} color={colors.textSecondary} />
      <Text style={[styles.listText, { color: colors.text }]}>{text}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={deleting}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>アカウント削除</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Warning */}
        <View style={styles.warning}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.error} />
          <Text style={[styles.warningTitle, { color: colors.error }]}>
            警告: この操作は取り消せません
          </Text>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            アカウントを削除すると、すべてのデータが完全に削除されます。この操作は元に戻せません。
          </Text>
        </View>

        {/* What will be deleted */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            削除されるデータ
          </Text>
          <View style={styles.list}>
            <ListItem icon="person.fill" text="プロフィール情報" />
            <ListItem icon="calendar" text="作成したイベント" />
            <ListItem icon="bubble.left.fill" text="チャットメッセージ" />
            <ListItem icon="photo.fill" text="投稿した画像" />
            <ListItem icon="text.bubble.fill" text="コメントといいね" />
            <ListItem icon="star.fill" text="★登録とブロック情報" />
          </View>
        </View>

        {/* Confirmation Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            確認のため「DELETE」と入力してください
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="DELETE"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.border,
                borderColor: colors.border,
              },
            ]}
            autoCapitalize="characters"
            editable={!deleting}
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            すべて大文字で「DELETE」と入力してください
          </Text>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[
            styles.deleteButton,
            { backgroundColor: colors.error },
            (confirmText !== 'DELETE' || deleting) && styles.deleteButtonDisabled,
          ]}
          onPress={handleDeleteAccount}
          disabled={confirmText !== 'DELETE' || deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>アカウントを削除する</Text>
          )}
        </TouchableOpacity>
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
  warning: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listText: {
    fontSize: 15,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  hint: {
    fontSize: 13,
    marginTop: 8,
  },
  deleteButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
