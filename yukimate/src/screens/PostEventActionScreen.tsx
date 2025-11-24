import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { spacing, fontSize, borderRadius, fontWeight } from '@/constants/spacing';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Profile } from '@/lib/database.types';

interface Participant {
  user: {
    id: string;
    profiles: Profile;
  };
}

export default function PostEventActionScreen() {
  const params = useLocalSearchParams<{
    eventId: string;
    participants: string; // JSON string
  }>();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const participants: Participant[] = params.participants
    ? JSON.parse(params.participants as string)
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  React.useEffect(() => {
    getCurrentUser();
  }, []);

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  }

  // 自分以外の参加者のみフィルター
  const otherParticipants = currentUserId
    ? participants.filter((p) => p.user.id !== currentUserId)
    : participants;

  const currentParticipant = otherParticipants[currentIndex];

  async function handleAction(action: 'star' | 'block' | 'skip') {
    if (!currentUserId) return;

    setProcessing(true);

    try {
      if (action === 'star') {
        await supabase.from('stars').insert({
          user_id: currentUserId,
          target_user_id: currentParticipant.user.id,
        });
      } else if (action === 'block') {
        await supabase.from('blocks').insert({
          user_id: currentUserId,
          blocked_user_id: currentParticipant.user.id,
        });
      }

      // 次のユーザーへ、または終了
      if (currentIndex < otherParticipants.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // 全員分完了、ホームへ
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error('Action error:', error);
      Alert.alert('エラー', '処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  }

  function getLevelBadgeConfig(level: string | null) {
    const config = {
      beginner: { label: '初級', color: '#10b981', icon: '🟢' },
      intermediate: { label: '中級', color: '#3b82f6', icon: '🔵' },
      advanced: { label: '上級', color: '#ef4444', icon: '🔴' },
    };

    return config[level as keyof typeof config] || config.intermediate;
  }

  if (!currentParticipant) {
    return null;
  }

  const levelBadge = getLevelBadgeConfig(currentParticipant.user.profiles?.level);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* タイトル */}
        <Text style={[styles.title, { color: colors.text }]}>
          イベントはいかがでしたか？
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          参加者を評価してください
        </Text>

        {/* 進捗 */}
        <Text style={[styles.progress, { color: colors.textSecondary }]}>
          {currentIndex + 1} / {otherParticipants.length}
        </Text>

        {/* ユーザーカード */}
        <View style={[styles.userCard, { backgroundColor: colors.card }]}>
          <Image
            source={{
              uri: currentParticipant.user.profiles?.avatar_url || undefined,
            }}
            style={styles.avatar}
          />
          <Text style={[styles.name, { color: colors.text }]}>
            {currentParticipant.user.profiles?.display_name || 'Unknown'}
          </Text>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.levelBadge,
                { backgroundColor: levelBadge.color + '20' },
              ]}
            >
              <Text style={styles.levelIcon}>{levelBadge.icon}</Text>
              <Text style={[styles.levelLabel, { color: levelBadge.color }]}>
                {levelBadge.label}
              </Text>
            </View>

            {currentParticipant.user.profiles?.country_code && (
              <Text style={styles.flag}>
                {currentParticipant.user.profiles.country_code === 'JP'
                  ? '🇯🇵'
                  : '🌐'}
              </Text>
            )}
          </View>

          {currentParticipant.user.profiles?.bio && (
            <Text
              style={[styles.bio, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {currentParticipant.user.profiles.bio}
            </Text>
          )}
        </View>

        {/* 説明テキスト */}
        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: '#1e40af' }]}>
            ★登録: 今後おすすめに表示されやすくなります
          </Text>
          <Text style={[styles.infoText, { color: '#1e40af' }]}>
            ブロック: この人のイベントは表示されなくなります
          </Text>
        </View>

        {/* アクションボタン */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleAction('block')}
            disabled={processing}
          >
            <IconSymbol name="xmark.circle" size={48} color="#ef4444" />
            <Text style={[styles.buttonLabel, { color: '#ef4444' }]}>
              ブロック
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => handleAction('skip')}
            disabled={processing}
          >
            <IconSymbol name="arrow.forward.circle" size={48} color="#9ca3af" />
            <Text style={[styles.buttonLabel, { color: '#9ca3af' }]}>
              スキップ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => handleAction('star')}
            disabled={processing}
          >
            <IconSymbol name="star.fill" size={48} color="#fbbf24" />
            <Text style={[styles.buttonLabel, { color: '#fbbf24' }]}>★登録</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 全てスキップボタン */}
      <TouchableOpacity
        style={[styles.skipAllButton, { borderTopColor: colors.border }]}
        onPress={() => router.replace('/(tabs)/home')}
        disabled={processing}
      >
        <Text style={[styles.skipAllText, { color: colors.textSecondary }]}>
          全てスキップしてホームへ
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  progress: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  userCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.md,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  levelIcon: {
    fontSize: fontSize.sm,
  },
  levelLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  flag: {
    fontSize: fontSize.xl,
  },
  bio: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  infoText: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  skipAllButton: {
    padding: spacing.lg,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  skipAllText: {
    fontSize: fontSize.md,
  },
});
