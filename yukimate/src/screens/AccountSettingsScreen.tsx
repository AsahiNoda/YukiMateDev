import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('accountSettings.fillAllFields'));
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('accountSettings.passwordsDoNotMatch'));
      return;
    }

    setPasswordLoading(true);
    const startTime = Date.now();

    try {
      const updatePromise = supabase.auth.updateUser({
        password: newPassword,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(t('accountSettings.connectionTimeout'))), 10000)
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

      setPasswordLoading(false);
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        t('accountSettings.passwordChangeSuccess'),
        t('accountSettings.passwordChangeSuccessMessage')
      );
    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`[AccountSettings] パスワード変更エラー (${duration}秒):`, error);

      setPasswordLoading(false);

      let errorMessage = t('accountSettings.passwordChangeError');
      if (error.message?.includes('タイムアウト') || error.message?.includes('Timeout')) {
        errorMessage = t('accountSettings.timeoutMessage');
      } else if (error.message?.includes('New password should be different') || error.message?.includes('same_password')) {
        errorMessage = t('accountSettings.passwordMustDiffer');
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = t('auth.passwordTooShort');
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(t('common.error'), errorMessage);
    }
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('accountSettings.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Account Info Card */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="person.circle" size={24} color={colors.text} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('accountSettings.accountInfo')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('settings.email')}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email || t('settings.notSet')}</Text>
          </View>
        </View>

        {/* Change Password Card */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="lock.shield" size={24} color={colors.text} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('accountSettings.changePassword')}</Text>
          </View>

          <View style={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('accountSettings.newPassword')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder={t('accountSettings.newPasswordPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!passwordLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>{t('accountSettings.confirmNewPassword')}</Text>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                placeholder={t('accountSettings.confirmNewPasswordPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!passwordLoading}
              />
            </View>

            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              {t('accountSettings.passwordMinLength')}
            </Text>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.accent },
                passwordLoading && styles.submitButtonDisabled
              ]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {passwordLoading ? t('accountSettings.changing') : t('accountSettings.changePassword')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Note */}
        <View style={[styles.noteCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <IconSymbol name="info.circle" size={20} color={colors.textSecondary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            {t('accountSettings.securityNote')}
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  formContent: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
