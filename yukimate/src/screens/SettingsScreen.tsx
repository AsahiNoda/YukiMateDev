import { ResortSearch } from '@/components/snowfeed/ResortSearch';
import { showTutorialAgain } from '@/components/AppTutorial';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useResortPreferences } from '@/hooks/useResortPreferences';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { getResortName } from '@/utils/resort-helpers';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  onPress?: () => void;
  first?: boolean;
  testID?: string;
};

/**
 * 設定（マイページ右上の「設定」から開く別画面。タブバーは出さない）。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Settings.html
 * グループ：アカウント／通知／プライバシーと安全／サポート、最後にログアウトとアカウント削除（赤い文字だけ）。
 * TODO(ui-redesign)：「表示（テーマ・単位）」「プロフィールの公開範囲」「通報・安全ガイド」は
 * 裏側の実装ができたら追加する（README「7. 設定」：実装がまだないものは非表示）。
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  const { locale, setLocale } = useLocale();
  const prefs = useResortPreferences();
  const [homePickerOpen, setHomePickerOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const homeResort = useQuery({
    queryKey: ['resortPrefs', 'homeName', prefs.homeId, locale],
    queryFn: async () => {
      const { data } = await supabase.from('resorts').select('name, name_en').eq('id', prefs.homeId!).single();
      return data ? getResortName(data, locale) : null;
    },
    enabled: !!prefs.homeId,
  });

  const version = Constants.expoConfig?.version ?? '';

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            // RootLayout の SIGNED_OUT でログイン画面へ移る
            await signOut();
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert(t('common.error'), t('settings.logoutError'));
          }
        },
      },
    ]);
  };

  const changeLanguage = async (next: 'ja' | 'en') => {
    setLanguageOpen(false);
    if (next === locale) return;
    try {
      await setLocale(next);
    } catch {
      Alert.alert(t('common.error'), t('settings.languageChangeError'));
    }
  };

  const Row = ({ icon, label, value, onPress, first, testID }: RowProps) => (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      testID={testID}
    >
      <Ionicons name={icon} size={20} color={c.tintText} />
      <Text style={[styles.rowLabel, { color: c.text }]}>{label}</Text>
      {value ? (
        <Text style={[styles.rowValue, { color: c.textLabel }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={c.textLabel} /> : null}
    </Pressable>
  );

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: c.textLabel }]} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: c.card }]}>{children}</View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* ヘッダー：戻る＋設定 */}
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]} accessibilityRole="header">
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Group title={t('settingsGroups.account')}>
          <Row
            first
            icon="home-outline"
            label={t('settingsGroups.homeResort')}
            value={homeResort.data ?? t('settings.notSet')}
            onPress={() => setHomePickerOpen(true)}
            testID="settings-home-resort"
          />
          <Row
            icon="language-outline"
            label={t('settings.language')}
            value={locale === 'ja' ? '日本語' : 'English'}
            onPress={() => setLanguageOpen(true)}
          />
          <Row
            icon="mail-outline"
            label={t('settingsGroups.emailPassword')}
            value={user?.email ?? null}
            onPress={() => router.push('/account-settings')}
          />
          <Row icon="star-outline" label={t('settings.starredUsers')} onPress={() => router.push('/starred-users')} />
        </Group>

        <Group title={t('settingsGroups.notifications')}>
          <Row first icon="notifications-outline" label={t('settings.notificationSettings')} onPress={() => router.push('/notification-settings')} />
        </Group>

        <Group title={t('settingsGroups.privacySafety')}>
          <Row first icon="ban-outline" label={t('settings.blockedUsers')} onPress={() => router.push('/blocked-users')} />
        </Group>

        <Group title={t('settingsGroups.support')}>
          <Row first icon="mail-outline" label={t('settingsGroups.helpContact')} onPress={() => router.push('/inquiry' as any)} />
          <Row
            icon="school-outline"
            label={t('tutorial.showAgain')}
            onPress={() => {
              router.replace('/(tabs)/home' as any);
              showTutorialAgain();
            }}
          />
          <Row icon="document-text-outline" label={t('settings.termsOfService')} onPress={() => router.push('/terms-of-service')} />
          <Row icon="shield-checkmark-outline" label={t('settings.privacyPolicy')} onPress={() => router.push('/privacy-policy')} />
          <Row icon="information-circle-outline" label={t('settingsGroups.version')} value={version} />
        </Group>

        {/* ログアウト／アカウントを削除（赤い文字だけ） */}
        <View style={[styles.card, styles.bottomCard, { backgroundColor: c.card }]}>
          <Pressable onPress={handleLogout} style={styles.textButton} accessibilityRole="button">
            <Text style={[styles.textButtonLabel, { color: c.text }]}>{t('settings.logout')}</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/delete-account')} style={styles.textButton} accessibilityRole="button" testID="settings-delete-account">
          <Text style={[styles.deleteLabel, { color: c.danger }]}>{t('settings.deleteAccount')}</Text>
        </Pressable>
      </ScrollView>

      {/* ホームゲレンデの変更（選ぶと確認してホームゲレンデにする） */}
      <Modal visible={homePickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHomePickerOpen(false)}>
        <ResortSearch
          title={t('settingsGroups.homeResort')}
          selectedId={prefs.homeId}
          isChangingHome
          onSelectResort={async (id, name) => {
            setHomePickerOpen(false);
            const ok = await prefs.setHome(id);
            Alert.alert(ok ? t('resortPage.homeChanged', { resort: name }) : t('resortPage.homeChangeFailed'));
          }}
          onClose={() => setHomePickerOpen(false)}
        />
      </Modal>

      {/* 言語 */}
      <ActionSheet
        visible={languageOpen}
        title={t('settings.language')}
        onClose={() => setLanguageOpen(false)}
        cancelLabel={t('common.cancel')}
        actions={[
          { label: `日本語${locale === 'ja' ? ' ✓' : ''}`, onPress: () => changeLanguage('ja') },
          { label: `English${locale === 'en' ? ' ✓' : ''}`, onPress: () => changeLanguage('en') },
        ]}
      />
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
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: 18,
  },
  group: {
    marginBottom: 22,
  },
  groupTitle: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
    marginLeft: 4,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.card,
    overflow: 'hidden',
  },
  row: {
    minHeight: touchTarget.min + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    paddingHorizontal: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSize.body,
  },
  rowValue: {
    maxWidth: '45%',
    fontSize: fontSize.sm,
  },
  bottomCard: {
    marginTop: 4,
  },
  textButton: {
    minHeight: touchTarget.min + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  deleteLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
});
