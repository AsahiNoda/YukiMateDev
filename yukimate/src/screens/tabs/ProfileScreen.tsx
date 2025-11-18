import { Colors } from '@/constants/theme';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import { updateProfile, useProfile } from '@hooks/useProfile';
import { router } from 'expo-router';
import type { ProfileData } from '@types';
import React, { useState } from 'react';
import { supabase } from '@lib/supabase';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const profileState = useProfile();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ProfileData>>({});
  const [saving, setSaving] = useState(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('エラー', 'ログアウトに失敗しました');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile({
      displayName: editData.displayName || undefined,
      bio: editData.bio || undefined,
      level: editData.level || undefined,
      styles: editData.styles,
    });

    setSaving(false);

    if (result.success) {
      setEditing(false);
      Alert.alert('保存完了', 'プロフィールを更新しました。');
    } else {
      Alert.alert('エラー', result.error || '保存に失敗しました。');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  if (profileState.status === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <Text style={styles.loadingText}>プロフィールを読み込み中...</Text>
        </View>
      </View>
    );
  }

  if (profileState.status === 'error') {
    const isProfileNotFound = profileState.error.includes('プロフィールが見つかりません');

    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>❄️</Text>
          <Text style={styles.errorText}>
            {isProfileNotFound ? 'プロフィールが未作成です' : 'エラーが発生しました'}
          </Text>
          <Text style={styles.errorSubText}>{profileState.error}</Text>

          {isProfileNotFound && (
            <Text style={styles.errorHint}>
              Supabase Dashboardでプロフィールを作成してください
            </Text>
          )}

          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.logoutButtonText}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const profile = profileState.data;
  const displayData = editing ? { ...profile, ...editData } : profile;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        {!editing ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditData({
                displayName: profile.displayName || '',
                bio: profile.bio || '',
                level: profile.level,
                styles: profile.styles,
              });
              setEditing(true);
            }}
            activeOpacity={0.8}>
            <IconSymbol name="pencil" size={20} color="#E5E7EB" />
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditing(false);
                setEditData({});
              }}
              activeOpacity={0.8}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayData.displayName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </View>
        {editing ? (
          <TextInput
            style={styles.nameInput}
            value={editData.displayName || ''}
            onChangeText={(text) => setEditData({ ...editData, displayName: text })}
            placeholder="表示名"
            placeholderTextColor="#9CA3AF"
          />
        ) : (
          <Text style={styles.profileName}>
            {displayData.displayName || '未設定'}
          </Text>
        )}
        {displayData.homeResortName && (
          <Text style={styles.profileResort}>{displayData.homeResortName}</Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.stats.eventsJoined}</Text>
          <Text style={styles.statLabel}>イベント</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.stats.postsCount}</Text>
          <Text style={styles.statLabel}>投稿</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.stats.starsReceived}</Text>
          <Text style={styles.statLabel}>スター</Text>
        </View>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>自己紹介</Text>
        {editing ? (
          <TextInput
            style={styles.bioInput}
            value={editData.bio || ''}
            onChangeText={(text) => setEditData({ ...editData, bio: text })}
            placeholder="自己紹介を入力..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        ) : (
          <Text style={styles.bioText}>
            {displayData.bio || '自己紹介が設定されていません。'}
          </Text>
        )}
      </View>

      {/* Level & Styles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>スキルレベル</Text>
        <View style={styles.levelContainer}>
          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelChip,
                displayData.level === level && styles.levelChipActive,
                !editing && styles.levelChipDisabled,
              ]}
              onPress={() => {
                if (editing) {
                  setEditData({ ...editData, level });
                }
              }}
              disabled={!editing}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.levelChipText,
                  displayData.level === level && styles.levelChipTextActive,
                ]}>
                {level === 'beginner' ? '初級' : level === 'intermediate' ? '中級' : '上級'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gear */}
      {profile.gear && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ギア</Text>
          <View style={styles.gearContainer}>
            {profile.gear.board && (
              <View style={styles.gearItem}>
                <Text style={styles.gearLabel}>ボード</Text>
                <Text style={styles.gearValue}>{profile.gear.board}</Text>
              </View>
            )}
            {profile.gear.binding && (
              <View style={styles.gearItem}>
                <Text style={styles.gearLabel}>ビンディング</Text>
                <Text style={styles.gearValue}>{profile.gear.binding}</Text>
              </View>
            )}
            {profile.gear.boots && (
              <View style={styles.gearItem}>
                <Text style={styles.gearLabel}>ブーツ</Text>
                <Text style={styles.gearValue}>{profile.gear.boots}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Recent Events */}
      {profile.recentEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近参加したイベント</Text>
          {profile.recentEvents.map((event) => (
            <View key={event.id} style={styles.activityItem}>
              <IconSymbol name="calendar" size={16} color="#9CA3AF" />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{event.title}</Text>
                {event.resortName && (
                  <Text style={styles.activitySubtitle}>{event.resortName}</Text>
                )}
                <Text style={styles.activityTime}>{formatDate(event.startAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Posts */}
      {profile.recentPosts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近の投稿</Text>
          {profile.recentPosts.map((post) => (
            <View key={post.id} style={styles.activityItem}>
              <IconSymbol name="text.bubble" size={16} color="#9CA3AF" />
              <View style={styles.activityContent}>
                <Text style={styles.activityText} numberOfLines={2}>
                  {post.text || '投稿内容なし'}
                </Text>
                {post.resortName && (
                  <Text style={styles.activitySubtitle}>{post.resortName}</Text>
                )}
                <Text style={styles.activityTime}>{formatDate(post.createdAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              'ログアウト',
              'ログアウトしますか？',
              [
                { text: 'キャンセル', style: 'cancel' },
                { text: 'ログアウト', onPress: handleSignOut, style: 'destructive' },
              ]
            );
          }}
        >
          <Text style={styles.logoutButtonText}>ログアウト</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    color: '#E5E7EB',
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F87171',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  errorActions: {
    width: '100%',
    paddingHorizontal: 32,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  cancelButtonText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#1E293B',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    minWidth: 200,
    textAlign: 'center',
  },
  profileResort: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#1E293B',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    color: '#E5E7EB',
    lineHeight: 22,
  },
  bioInput: {
    fontSize: 15,
    color: '#E5E7EB',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  levelContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  levelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  levelChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  levelChipDisabled: {
    opacity: 1,
  },
  levelChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  levelChipTextActive: {
    color: '#FFFFFF',
  },
  gearContainer: {
    gap: 12,
  },
  gearItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  gearLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  gearValue: {
    fontSize: 14,
    color: '#E5E7EB',
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activityText: {
    fontSize: 15,
    color: '#E5E7EB',
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logoutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
