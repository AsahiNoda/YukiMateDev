import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();

  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      Alert.alert(t('common.error'), t('deleteAccount.enterDelete'));
      return;
    }

    Alert.alert(
      t('deleteAccount.title'),
      t('deleteAccount.confirmMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('deleteAccount.deleteButton'),
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
        throw new Error(t('deleteAccount.sessionNotFound'));
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
        throw new Error(errorData.error || t('deleteAccount.deleteFailed'));
      }

      // ログアウト
      await signOut();

      // 認証画面へ
      router.replace('/(auth)/sign-in');

      Alert.alert(t('deleteAccount.completed'), t('deleteAccount.accountDeleted'));
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('deleteAccount.deleteFailed'));
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{ t('deleteAccount.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Warning */}
        <View style={styles.warning}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.error} />
          <Text style={[styles.warningTitle, { color: colors.error }]}>
            {t('deleteAccount.warningTitle')}
          </Text>
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            {t('deleteAccount.warningMessage')}
          </Text>
        </View>

        {/* What will be deleted */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('deleteAccount.dataToBeDeleted')}
          </Text>
          <View style={styles.list}>
            <ListItem icon="person.fill" text={t('deleteAccount.profileInfo')} />
            <ListItem icon="calendar" text={t('deleteAccount.createdEvents')} />
            <ListItem icon="bubble.left.fill" text={t('deleteAccount.chatMessages')} />
            <ListItem icon="photo.fill" text={t('deleteAccount.postedImages')} />
            <ListItem icon="text.bubble.fill" text={t('deleteAccount.commentsAndLikes')} />
            <ListItem icon="star.fill" text={t('deleteAccount.starredAndBlocked')} />
          </View>
        </View>

        {/* Confirmation Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('deleteAccount.confirmLabel')}
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
            {t('deleteAccount.confirmHint')}
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
            <Text style={styles.deleteButtonText}>{t('deleteAccount.permanentlyDelete')}</Text>
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
