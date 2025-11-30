import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
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
  const { signOut, profile, userRole } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const handleLogout = async () => {
    Alert.alert(
      'ログアウト',
      '本当にログアウトしますか?',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('エラー', 'ログアウトに失敗しました');
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* User Info Section */}
        {profile && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>アカウント情報</Text>
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ユーザー名</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profile.displayName}</Text>
            </View>
          </View>
        )}

        {/* Settings Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>設定</Text>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View style={styles.menuItemLeft}>
              <IconSymbol name="person.circle" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>アカウント設定</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View style={styles.menuItemLeft}>
              <IconSymbol name="bell" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>通知設定</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View style={styles.menuItemLeft}>
              <IconSymbol name="lock" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>プライバシー</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>情報</Text>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View style={styles.menuItemLeft}>
              <IconSymbol name="info.circle" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>アプリについて</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View style={styles.menuItemLeft}>
              <IconSymbol name="doc.text" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>利用規約</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View style={styles.menuItemLeft}>
              <IconSymbol name="shield" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>プライバシーポリシー</Text>
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
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>ログアウト</Text>
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
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
