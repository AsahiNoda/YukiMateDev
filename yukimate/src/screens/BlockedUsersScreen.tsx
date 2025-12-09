import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@components/ui/icon-symbol';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BlockedUser = {
  id: string;
  blocked_user_id: string;
  created_at: string;
  blocked_user: {
    id: string;
    profiles: {
      user_id: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
};

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingUsers, setUnblockingUsers] = useState<Set<string>>(new Set());

  const fetchBlockedUsers = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blocks')
        .select(`
          id,
          blocked_user_id,
          created_at,
          blocked_user:users!blocks_blocked_user_id_fkey(
            id,
            profiles(
              user_id,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBlockedUsers((data as BlockedUser[]) || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      Alert.alert('エラー', 'ブロック中のユーザーの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleUnblock = async (blockId: string, blockedUserId: string) => {
    Alert.alert(
      'ブロック解除',
      'このユーザーのブロックを解除しますか?',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'ブロック解除',
          style: 'default',
          onPress: async () => {
            try {
              setUnblockingUsers(prev => new Set(prev).add(blockedUserId));

              const { error } = await supabase
                .from('blocks')
                .delete()
                .eq('id', blockId);

              if (error) throw error;

              setBlockedUsers(prev => prev.filter(item => item.id !== blockId));
              Alert.alert('成功', 'ブロックを解除しました');
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('エラー', 'ブロック解除に失敗しました');
            } finally {
              setUnblockingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(blockedUserId);
                return newSet;
              });
            }
          },
        },
      ],
    );
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => {
    const isUnblocking = unblockingUsers.has(item.blocked_user_id);
    const profile = item.blocked_user?.profiles;

    return (
      <View style={[styles.userItem, { borderBottomColor: colors.border }]}>
        <View style={styles.userInfo}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
              <IconSymbol name="person.fill" size={24} color={colors.textSecondary} />
            </View>
          )}
          <Text style={[styles.userName, { color: colors.text }]}>
            {profile?.display_name || 'Unknown User'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.unblockButton,
            isUnblocking && styles.unblockButtonDisabled,
            { borderColor: colors.error },
          ]}
          onPress={() => handleUnblock(item.id, item.blocked_user_id)}
          disabled={isUnblocking}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Text style={[styles.unblockButtonText, { color: colors.error }]}>解除</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="nosign" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        ブロック中のユーザーはいません
      </Text>
    </View>
  );

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>ブロック中のユーザー</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderBlockedUser}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContainer,
            blockedUsers.length === 0 && styles.listContainerEmpty,
          ]}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
  },
  listContainerEmpty: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  unblockButtonDisabled: {
    opacity: 0.5,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
