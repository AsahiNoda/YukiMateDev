import { IconSymbol } from '@/components/ui/icon-symbol';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Participant {
  user: {
    id: string;
    profiles: Profile;
  };
}

type ActionType = 'star' | 'block' | null;

export default function PostEventActionScreen() {
  console.log('[PostEventActionScreen] 🎬 Screen mounted');

  const params = useLocalSearchParams<{
    eventId: string;
    participants: string; // JSON string
  }>();

  console.log('[PostEventActionScreen] 📥 Params received:', {
    eventId: params.eventId,
    participantsLength: params.participants ? 'present' : 'missing',
  });

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const participants: Participant[] = params.participants
    ? JSON.parse(params.participants as string)
    : [];

  console.log('[PostEventActionScreen] 👥 Participants parsed:', {
    totalCount: participants.length,
    participantIds: participants.map(p => p.user.id),
  });

  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, ActionType>>({});
  const [isHost, setIsHost] = useState(false);

  React.useEffect(() => {
    getCurrentUser();
  }, []);

  React.useEffect(() => {
    if (currentUserId && params.eventId) {
      checkIfHost();
    }
  }, [currentUserId, params.eventId]);

  async function getCurrentUser() {
    console.log('[PostEventActionScreen] 🔍 Fetching current user...');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      console.log('[PostEventActionScreen] ✅ Current user found:', user.id);
      setCurrentUserId(user.id);
    } else {
      console.log('[PostEventActionScreen] ⚠️ No current user found');
    }
  }

  async function checkIfHost() {
    console.log('[PostEventActionScreen] 🔍 Checking if user is host...');
    try {
      const { data: eventData, error } = await supabase
        .from('posts_events')
        .select('host_user_id')
        .eq('id', params.eventId)
        .single();

      if (error) {
        console.error('[PostEventActionScreen] ❌ Error checking host:', error);
        return;
      }

      const isUserHost = eventData?.host_user_id === currentUserId;
      console.log('[PostEventActionScreen] 👑 Is host:', isUserHost);
      setIsHost(isUserHost);
    } catch (error) {
      console.error('[PostEventActionScreen] ❌ Exception checking host:', error);
    }
  }

  async function leaveEvent() {
    if (!currentUserId || !params.eventId) {
      console.log('[PostEventActionScreen] ⚠️ Cannot leave event: missing user or event ID');
      return { success: false };
    }

    console.log('[PostEventActionScreen] 🚪 Leaving event:', {
      eventId: params.eventId,
      userId: currentUserId,
    });

    try {
      // event_participantsのleft_atを設定
      const { error: participantsError } = await supabase
        .from('event_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('event_id', params.eventId)
        .eq('user_id', currentUserId)
        .is('left_at', null);

      if (participantsError) {
        console.error('[PostEventActionScreen] ❌ Leave event_participants error:', participantsError);
        Alert.alert('エラー', 'イベントからの退出に失敗しました');
        return { success: false };
      }

      console.log('[PostEventActionScreen] ✅ Successfully left event_participants');

      // event_applicationsのステータスをleftに変更
      const { error: applicationsError } = await supabase
        .from('event_applications')
        .update({ status: 'left' })
        .eq('event_id', params.eventId)
        .eq('applicant_user_id', currentUserId)
        .in('status', ['approved', 'pending']); // approved または pending のものを left に変更

      if (applicationsError) {
        console.error('[PostEventActionScreen] ❌ Leave event_applications error:', applicationsError);
        // 申請の更新は必須ではないので、エラーでも続行
      } else {
        console.log('[PostEventActionScreen] ✅ Successfully updated event_applications to left');
      }

      return { success: true };
    } catch (error: any) {
      console.error('[PostEventActionScreen] ❌ Leave event exception:', error);
      Alert.alert('エラー', 'イベントからの退出中に問題が発生しました');
      return { success: false };
    }
  }

  // 自分以外の参加者のみフィルター
  const otherParticipants = currentUserId
    ? participants.filter((p) => p.user.id !== currentUserId)
    : participants;

  console.log('[PostEventActionScreen] 🎯 Other participants filtered:', {
    currentUserId,
    otherParticipantsCount: otherParticipants.length,
  });

  function toggleSelection(userId: string, action: ActionType) {
    console.log('[PostEventActionScreen] 🎯 Toggle selection:', {
      userId,
      action,
      currentSelection: selections[userId],
    });

    setSelections((prev) => {
      const current = prev[userId];
      // If clicking the same action, deselect it
      if (current === action) {
        console.log('[PostEventActionScreen] ⭕ Deselecting action');
        return { ...prev, [userId]: null };
      }
      // Otherwise, set the new action
      console.log('[PostEventActionScreen] ✅ Setting new action');
      return { ...prev, [userId]: action };
    });
  }

  async function handleFinish() {
    console.log('[PostEventActionScreen] 🏁 Finish button pressed');
    console.log('[PostEventActionScreen] 📊 Selections summary:', selections);

    if (!currentUserId) {
      console.log('[PostEventActionScreen] ⚠️ No current user ID, aborting');
      return;
    }

    setProcessing(true);
    console.log('[PostEventActionScreen] ⏳ Processing all selections...');

    try {
      // Process all selections
      for (const [userId, action] of Object.entries(selections)) {
        if (!action) continue;

        if (action === 'star') {
          console.log('[PostEventActionScreen] ⭐ Inserting star for user:', userId);
          await supabase.from('stars').insert({
            user_id: currentUserId,
            target_user_id: userId,
          });
          console.log('[PostEventActionScreen] ✅ Star inserted successfully');
        } else if (action === 'block') {
          console.log('[PostEventActionScreen] 🚫 Inserting block for user:', userId);
          await supabase.from('blocks').insert({
            user_id: currentUserId,
            blocked_user_id: userId,
          });
          console.log('[PostEventActionScreen] ✅ Block inserted successfully');
        }
      }

      console.log('[PostEventActionScreen] 🏁 All actions processed, leaving event and redirecting to chat');
      const leaveResult = await leaveEvent();
      if (leaveResult.success) {
        router.replace('/(tabs)/chat');
      }
    } catch (error: any) {
      console.error('[PostEventActionScreen] ❌ Finish error:', {
        error: error.message || error,
      });
      Alert.alert('エラー', '処理に失敗しました');
    } finally {
      setProcessing(false);
      console.log('[PostEventActionScreen] ✅ Processing completed');
    }
  }

  function getLevelBadgeConfig(level: string | null) {
    const config = {
      beginner: { label: '初級', color: '#10b981', icon: '🟢' },
      intermediate: { label: '中級', color: '#5A7D9A', icon: '🔵' },
      advanced: { label: '上級', color: '#ef4444', icon: '🔴' },
    };

    return config[level as keyof typeof config] || config.intermediate;
  }

  // 参加者がいない場合の表示
  if (otherParticipants.length === 0) {
    console.log('[PostEventActionScreen] ℹ️ No other participants, showing completion screen');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          {/* タイトル */}
          <Text style={[styles.title, { color: colors.text }]}>
            イベントはいかがでしたか？
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            他の参加者はいませんでした
          </Text>

          {/* メッセージ */}
          <View style={styles.noParticipantsBox}>
            <Text style={[styles.noParticipantsText, { color: colors.textSecondary }]}>
              今回は他の参加者がいなかったため、評価する相手がいません。
            </Text>
          </View>

          {/* 終了ボタン */}
          <TouchableOpacity
            style={styles.finishButton}
            onPress={async () => {
              console.log('[PostEventActionScreen] ✅ Finish button pressed (no participants)');
              const result = await leaveEvent();
              if (result.success) {
                router.replace('/(tabs)/chat');
              }
            }}
          >
            <Text style={styles.finishButtonText}>終了する</Text>
          </TouchableOpacity>

          {/* ホストのみ: 削除警告 */}
          {isHost && (
            <Text style={styles.hostDeletionWarning}>
              ⚠️ 投稿は一定時間後に自動で削除されます
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {/* タイトル */}
        <Text style={[styles.title, { color: colors.text }]}>
          イベントはいかがでしたか？
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          参加者を評価してください
        </Text>

        {/* 説明テキスト */}
        <View style={styles.infoBox}>
          <Text style={[styles.infoText, { color: '#1e40af' }]}>
            ★登録: 今後おすすめに表示されやすくなります
          </Text>
          <Text style={[styles.infoText, { color: '#1e40af' }]}>
            ブロック: この人のイベントは表示されなくなります
          </Text>
        </View>
      </View>

      {/* 参加者リスト */}
      <ScrollView style={styles.scrollView}>
        {otherParticipants.map((participant) => {
          const levelBadge = getLevelBadgeConfig(participant.user.profiles?.level);
          const userSelection = selections[participant.user.id];

          return (
            <View
              key={participant.user.id}
              style={[styles.participantRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* 左側: アバター + ユーザー情報 */}
              <View style={styles.participantInfo}>
                <Image
                  source={{
                    uri: participant.user.profiles?.avatar_url || undefined,
                  }}
                  style={styles.participantAvatar}
                />
                <View style={styles.participantDetails}>
                  <Text style={[styles.participantName, { color: colors.text }]}>
                    {participant.user.profiles?.display_name || 'Unknown'}
                  </Text>
                  <View style={styles.participantMeta}>
                    <View
                      style={[
                        styles.participantLevelBadge,
                        { backgroundColor: levelBadge.color + '20' },
                      ]}
                    >
                      <Text style={styles.participantLevelIcon}>{levelBadge.icon}</Text>
                      <Text style={[styles.participantLevelLabel, { color: levelBadge.color }]}>
                        {levelBadge.label}
                      </Text>
                    </View>
                    {participant.user.profiles?.country_code && (
                      <Text style={styles.participantFlag}>
                        {participant.user.profiles.country_code === 'JP' ? '🇯🇵' : '🌐'}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* 右側: アクションボタン */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    userSelection === 'star' && styles.starButtonSelected,
                    userSelection !== 'star' && styles.actionButtonInactive,
                  ]}
                  onPress={() => toggleSelection(participant.user.id, 'star')}
                  disabled={processing}
                >
                  <IconSymbol
                    name="star.fill"
                    size={24}
                    color={userSelection === 'star' ? '#f59e0b' : '#9ca3af'}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      userSelection === 'star' && styles.starButtonTextSelected,
                      userSelection !== 'star' && styles.actionButtonTextInactive,
                    ]}
                  >
                    Star
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    userSelection === 'block' && styles.blockButtonSelected,
                    userSelection !== 'block' && styles.actionButtonInactive,
                  ]}
                  onPress={() => toggleSelection(participant.user.id, 'block')}
                  disabled={processing}
                >
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={24}
                    color={userSelection === 'block' ? '#ef4444' : '#9ca3af'}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      userSelection === 'block' && styles.blockButtonTextSelected,
                      userSelection !== 'block' && styles.actionButtonTextInactive,
                    ]}
                  >
                    Block
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 完了ボタン */}
      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: 120 }]}>
        <TouchableOpacity
          style={[styles.finishButton, processing && styles.finishButtonDisabled]}
          onPress={handleFinish}
          disabled={processing}
        >
          <Text style={styles.finishButtonText}>
            {processing ? '処理中...' : '完了してチャット一覧へ'}
          </Text>
        </TouchableOpacity>

        {/* ホストのみ: 削除警告 */}
        {isHost && (
          <Text style={styles.hostDeletionWarning}>
            ⚠️ 投稿は一定時間後に自動で削除されます
          </Text>
        )}
      </View>
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
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
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
    marginBottom: spacing.md,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  infoText: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  participantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  participantLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.md,
    gap: spacing.xs / 2,
  },
  participantLevelIcon: {
    fontSize: fontSize.xs,
  },
  participantLevelLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  participantFlag: {
    fontSize: fontSize.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 60,
  },
  actionButtonInactive: {
    backgroundColor: '#f3f4f6',
  },
  actionButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs / 2,
  },
  actionButtonTextInactive: {
    color: '#9ca3af',
  },
  starButtonSelected: {
    backgroundColor: '#fef3c7',
  },
  starButtonTextSelected: {
    color: '#f59e0b',
  },
  blockButtonSelected: {
    backgroundColor: '#fee2e2',
  },
  blockButtonTextSelected: {
    color: '#ef4444',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  finishButton: {
    backgroundColor: '#5A7D9A',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  hostDeletionWarning: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  noParticipantsBox: {
    backgroundColor: '#f3f4f6',
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  noParticipantsText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 24,
  },
});
