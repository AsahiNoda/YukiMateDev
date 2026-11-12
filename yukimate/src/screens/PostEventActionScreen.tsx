import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { SvgXml } from 'react-native-svg';

const getStarIcon = (color: string) => `<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

const getBlockIcon = (color: string) => `<?xml version="1.0" encoding="UTF-8"?><svg width="24px" height="24px" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.6667 12H15.4C15.7314 12 16 12.2686 16 12.6V16.4C16 16.7314 15.7314 17 15.4 17H8.6C8.26863 17 8 16.7314 8 16.4V12.6C8 12.2686 8.26863 12 8.6 12H9.33333M14.6667 12V9.5C14.6667 8.66667 14.1333 7 12 7C9.86667 7 9.33333 8.66667 9.33333 9.5V12M14.6667 12H9.33333" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19Z" stroke="${color}" stroke-width="1.5"></path></svg>`;

interface Participant {
  user: {
    id: string;
    profiles: Profile;
  };
}

type ActionType = 'star' | 'block' | null;

type ReactionKind = 'super_happy' | 'happy' | 'neutral' | 'unhappy' | 'super_unhappy';

const REACTIONS: { kind: ReactionKind; emoji: string }[] = [
  { kind: 'super_happy', emoji: '😍' },
  { kind: 'happy', emoji: '🙂' },
  { kind: 'neutral', emoji: '😐' },
  { kind: 'unhappy', emoji: '🙁' },
  { kind: 'super_unhappy', emoji: '😣' },
];

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
  const { t } = useTranslation();

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
  const [reactions, setReactions] = useState<Record<string, ReactionKind | null>>({});
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

  // 自分以外の参加者のみフィルター（ホストを含む）
  const otherParticipants = currentUserId
    ? participants.filter((p) => p.user.id !== currentUserId)
    : participants;

  console.log('[PostEventActionScreen] 🎯 Other participants filtered (including host):', {
    currentUserId,
    otherParticipantsCount: otherParticipants.length,
    participantIds: otherParticipants.map(p => p.user.id),
  });

  function toggleReaction(userId: string, kind: ReactionKind) {
    setReactions((prev) => ({
      ...prev,
      [userId]: prev[userId] === kind ? null : kind,
    }));
  }

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
      // ユーザー評価（5段階絵文字リアクション）を upsert
      for (const [userId, kind] of Object.entries(reactions)) {
        if (!kind) continue;
        console.log('[PostEventActionScreen] 😊 Upserting reaction for user:', userId, kind);
        await supabase.from('user_reactions').upsert(
          {
            reactor_user_id: currentUserId,
            target_user_id: userId,
            reaction: kind,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'reactor_user_id,target_user_id' }
        );
      }

      // Process all selections (star / block)
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

      console.log('[PostEventActionScreen] 🏁 All actions processed, marking as completed');

      // イベントのポストアクションが完了したことをAsyncStorageに保存
      await AsyncStorage.setItem(`post_action_completed_${params.eventId}`, 'true');
      console.log('[PostEventActionScreen] ✅ Post action completion saved to AsyncStorage');

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

  // 参加者がいない場合の表示
  if (otherParticipants.length === 0) {
    console.log('[PostEventActionScreen] ℹ️ No other participants, showing completion screen');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          {/* タイトル */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t('postEventAction.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('postEventAction.noOtherParticipants')}
          </Text>

          {/* メッセージ */}
          <View style={[styles.noParticipantsBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.noParticipantsText, { color: colors.textSecondary }]}>
              {t('postEventAction.noParticipantsMessage')}
            </Text>
          </View>

          {/* 終了ボタン */}
          <TouchableOpacity
            style={[styles.finishButton, { backgroundColor: colors.tint }]}
            onPress={async () => {
              console.log('[PostEventActionScreen] ✅ Finish button pressed (no participants)');

              // イベントのポストアクションが完了したことをAsyncStorageに保存
              await AsyncStorage.setItem(`post_action_completed_${params.eventId}`, 'true');
              console.log('[PostEventActionScreen] ✅ Post action completion saved to AsyncStorage (no participants)');

              const result = await leaveEvent();
              if (result.success) {
                router.replace('/(tabs)/chat');
              }
            }}
          >
            <Text style={styles.finishButtonText}>{t('postEventAction.finishButton')}</Text>
          </TouchableOpacity>

          {/* ホストのみ: 削除警告 */}
          {isHost && (
            <Text style={[styles.hostDeletionWarning, { color: colors.error }]}>
              {t('postEventAction.hostDeletionWarning')}
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
          {t('postEventAction.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('postEventAction.rateParticipants')}
        </Text>

        {/* 説明テキスト */}
        <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('postEventAction.starInfo')}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('postEventAction.blockInfo')}
          </Text>
        </View>
      </View>

      {/* 参加者リスト */}
      <ScrollView style={styles.scrollView}>
        {otherParticipants.map((participant) => {
          const userSelection = selections[participant.user.id];

          return (
            <View
              key={participant.user.id}
              style={[styles.participantCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.participantTopRow}>
              {/* 左側: アバター + ユーザー情報 */}
              <View style={styles.participantInfo}>
                <Image
                  source={{
                    uri: participant.user.profiles?.avatar_url || undefined,
                  }}
                  style={styles.participantAvatar}
                />
                <View style={styles.participantDetails}>
                  <View style={styles.participantNameRow}>
                    <Text style={[styles.participantName, { color: colors.text }]}>
                      {participant.user.profiles?.display_name || 'Unknown'}
                    </Text>
                    {/* ホストバッジを表示 */}
                    {!isHost && participant.user.id !== currentUserId && (
                      <Text style={[styles.hostBadge, { color: '#22c55e' }]}>
                        {/* ホストかどうかはEventChatScreenから渡されたparticipantsの最初の要素で判断 */}
                        {participant.user.id === participants[0]?.user.id ? '（ホスト）' : ''}
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
                  ]}
                  onPress={() => toggleSelection(participant.user.id, 'star')}
                  disabled={processing}
                >
                  <SvgXml
                    xml={getStarIcon(userSelection === 'star' ? '#eab308' : colors.text)}
                    width={24}
                    height={24}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: userSelection === 'star' ? '#eab308' : colors.text },
                    ]}
                  >
                    {t('postEventAction.starAction')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                  ]}
                  onPress={() => toggleSelection(participant.user.id, 'block')}
                  disabled={processing}
                >
                  <SvgXml
                    xml={getBlockIcon(userSelection === 'block' ? '#ef4444' : colors.text)}
                    width={24}
                    height={24}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: userSelection === 'block' ? '#ef4444' : colors.text },
                    ]}
                  >
                    {t('postEventAction.blockAction')}
                  </Text>
                </TouchableOpacity>
              </View>
              </View>

              {/* 5段階絵文字評価（メイン） */}
              <View style={styles.reactionRow}>
                {REACTIONS.map((r) => (
                  <TouchableOpacity
                    key={r.kind}
                    style={[
                      styles.reactionButton,
                      reactions[participant.user.id] === r.kind && {
                        backgroundColor: colors.tint + '33',
                        borderColor: colors.tint,
                      },
                    ]}
                    onPress={() => toggleReaction(participant.user.id, r.kind)}
                    disabled={processing}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 完了ボタン */}
      <View style={[styles.footer, { borderTopColor: colors.border, paddingBottom: 120 }]}>
        <TouchableOpacity
          style={[styles.finishButton, { backgroundColor: colors.tint }, processing && styles.finishButtonDisabled]}
          onPress={handleFinish}
          disabled={processing}
        >
          <Text style={styles.finishButtonText}>
            {processing ? t('postEventAction.processing') : t('postEventAction.completeButton')}
          </Text>
        </TouchableOpacity>

        {/* ホストのみ: 削除警告 */}
        {isHost && (
          <Text style={[styles.hostDeletionWarning, { color: colors.error }]}>
            {t('postEventAction.hostDeletionWarning')}
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
    marginTop: 60,
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
    backgroundColor: Colors.light.backgroundSecondary, // Will be overridden dynamically
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
    borderWidth: 1, // Add border width to make borderColor visible
  },
  participantCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  participantTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  reactionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  reactionEmoji: {
    fontSize: 24,
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
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginBottom: spacing.xs,
  },
  participantName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  hostBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 60,
  },
  actionButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs / 2,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1, // Add border width
  },
  finishButton: {
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
    textAlign: 'center',
    marginTop: spacing.md,
  },
  noParticipantsBox: {
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
