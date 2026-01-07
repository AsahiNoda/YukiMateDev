import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';
import { IconSymbol } from '@components/ui/icon-symbol';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, profile, userRole, user } = useAuth();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const handleLogout = async () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(t('common.error'), t('settings.logoutError'));
            }
          },
        },
      ],
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* User Info Section */}
        {profile && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.accountInfo')}</Text>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('settings.username')}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profile.displayName}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t('settings.email')}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email || t('settings.notSet')}</Text>
            </View>
          </View>
        )}

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.language')}</Text>
          <View style={[styles.languageSwitchContainer, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.languageOption}
              onPress={async () => {
                if (locale !== 'ja') {
                  try {
                    await setLocale('ja');
                  } catch (error) {
                    Alert.alert(t('common.error'), t('settings.languageChangeError'));
                  }
                }
              }}
              activeOpacity={0.6}
            >
              <Text style={[
                styles.languageOptionText,
                { color: locale === 'ja' ? colors.text : colors.textSecondary },
                locale === 'ja' && styles.languageOptionTextActive
              ]}>
                日本語
              </Text>
              {locale === 'ja' && (
                <View style={[styles.languageIndicator, { backgroundColor: colors.accent }]} />
              )}
            </TouchableOpacity>
            <View style={[styles.languageDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.languageOption}
              onPress={async () => {
                if (locale !== 'en') {
                  try {
                    await setLocale('en');
                  } catch (error) {
                    Alert.alert(t('common.error'), t('settings.languageChangeError'));
                  }
                }
              }}
              activeOpacity={0.6}
            >
              <Text style={[
                styles.languageOptionText,
                { color: locale === 'en' ? colors.text : colors.textSecondary },
                locale === 'en' && styles.languageOptionTextActive
              ]}>
                English
              </Text>
              {locale === 'en' && (
                <View style={[styles.languageIndicator, { backgroundColor: colors.accent }]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* General Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.general')}</Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/blocked-users')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>{t('settings.blockedUsers')}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/starred-users')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>{t('settings.starredUsers')}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Settings Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.settingsTitle')}</Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/account-settings')}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol name="person.circle" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>{t('settings.accountSettings')}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/notification-settings')}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol name="bell" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>{t('settings.notificationSettings')}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('settings.legal')}</Text>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/terms-of-service')}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol name="doc.text" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>{t('settings.termsOfService')}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/privacy-policy')}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol name="shield" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>{t('settings.privacyPolicy')}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderTopColor: colors.border }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <IconSymbol name="arrow.right.square" size={20} color={colors.error} />
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={[styles.deleteButton]}
          onPress={() => router.push('/delete-account')}
          activeOpacity={0.8}
        >
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>{t('settings.deleteAccount')}</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 0.0.0</Text>
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  languageSwitchContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  languageOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  languageOptionText: {
    fontSize: 16,
  },
  languageOptionTextActive: {
    fontWeight: '600',
  },
  languageDivider: {
    width: 1,
    height: '100%',
  },
  languageIndicator: {
    width: 24,
    height: 2,
    borderRadius: 1,
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
