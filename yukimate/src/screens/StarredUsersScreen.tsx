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

type StarredUser = {
  id: string;
  target_user_id: string;
  created_at: string;
  target_user: {
    id: string;
    profiles: {
      user_id: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
};

export default function StarredUsersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const [starredUsers, setStarredUsers] = useState<StarredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unstarringUsers, setUnstarringUsers] = useState<Set<string>>(new Set());

  const fetchStarredUsers = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stars')
        .select(`
          id,
          target_user_id,
          created_at,
          target_user:users!stars_target_user_id_fkey(
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

      setStarredUsers((data as StarredUser[]) || []);
    } catch (error) {
      console.error('Error fetching starred users:', error);
      Alert.alert('エラー', '★登録ユーザーの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStarredUsers();
  }, [fetchStarredUsers]);

  const handleUnstar = async (starId: string, targetUserId: string) => {
    Alert.alert(
      '★登録解除',
      'このユーザーの★登録を解除しますか?',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '★登録解除',
          style: 'default',
          onPress: async () => {
            try {
              setUnstarringUsers(prev => new Set(prev).add(targetUserId));

              const { error } = await supabase
                .from('stars')
                .delete()
                .eq('id', starId);

              if (error) throw error;

              setStarredUsers(prev => prev.filter(item => item.id !== starId));
              Alert.alert('成功', '★登録を解除しました');
            } catch (error) {
              console.error('Error unstarring user:', error);
              Alert.alert('エラー', '★登録解除に失敗しました');
            } finally {
              setUnstarringUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(targetUserId);
                return newSet;
              });
            }
          },
        },
      ],
    );
  };

  const renderStarredUser = ({ item }: { item: StarredUser }) => {
    const isUnstarring = unstarringUsers.has(item.target_user_id);
    const profile = item.target_user?.profiles;

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
            styles.unstarButton,
            isUnstarring && styles.unstarButtonDisabled,
            { borderColor: colors.accent },
          ]}
          onPress={() => handleUnstar(item.id, item.target_user_id)}
          disabled={isUnstarring}
        >
          {isUnstarring ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={[styles.unstarButtonText, { color: colors.accent }]}>解除</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="star" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        ★登録ユーザーはいません
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>★登録ユーザー</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={starredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderStarredUser}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContainer,
            starredUsers.length === 0 && styles.listContainerEmpty,
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
  unstarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  unstarButtonDisabled: {
    opacity: 0.5,
  },
  unstarButtonText: {
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
