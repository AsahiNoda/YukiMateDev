import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  Image,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { spacing, fontSize, borderRadius, fontWeight } from '@/constants/spacing';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useEventChats } from '@/hooks/useEventChats';
import { useEventApplications, type EventApplicationWithDetails } from '@/hooks/useEventApplications';
import type { EventChat } from '@types';
import { supabase } from '@/lib/supabase';

interface ChatSection {
  title: string;
  data: EventChat[];
}

type TabType = 'chats' | 'requests';

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<TabType>('chats');

  const { chats, loading: chatsLoading, error: chatsError, refetch } = useEventChats();
  const {
    applications,
    loading: applicationsLoading,
    error: applicationsError,
    approveApplication,
    rejectApplication,
  } = useEventApplications();

  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const hasRefetchedOnFocus = React.useRef(false);
  const refetchRef = React.useRef(refetch);

  // refetch関数をrefに保存（依存配列の問題を回避）
  React.useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Track when screen comes into focus and refresh chat list
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 [ChatScreen] Screen came into focus', {
        hasRefetchedOnFocus: hasRefetchedOnFocus.current,
      });

      // フォーカス時に一度だけrefetchする（無限ループを防ぐ）
      if (!hasRefetchedOnFocus.current) {
        console.log('🔄 [ChatScreen] Refreshing chat list on focus...');
        hasRefetchedOnFocus.current = true;
        refetchRef.current();
      }

      return () => {
        console.log('🔍 [ChatScreen] Screen lost focus');
        // フォーカスを失ったら、次回フォーカス時にrefetchできるようにリセット
        hasRefetchedOnFocus.current = false;
      };
    }, [])
  );

  // 現在のユーザーIDを取得
  React.useEffect(() => {
    console.log('🆔 [ChatScreen] Getting current user...');
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('🆔 [ChatScreen] ✅ User ID obtained:', user.id);
        setCurrentUserId(user.id);
      } else {
        console.log('🆔 [ChatScreen] ❌ No user found');
      }
    }
    getCurrentUser();
  }, []);

  // Track currentUserId changes
  React.useEffect(() => {
    console.log('🆔 [ChatScreen] currentUserId changed:', currentUserId);
  }, [currentUserId]);

  // デバッグ: 申請の状態をログ出力
  React.useEffect(() => {
    if (activeTab === 'requests') {
      console.log('📋 Current applications:', applications.length, applications.map(app => ({
        id: app.id,
        status: app.status,
        applicant: app.applicant?.profiles?.display_name
      })));
    }
  }, [applications, activeTab]);


  const loading = activeTab === 'chats' ? chatsLoading : applicationsLoading;

  // エラーがある場合は表示
  React.useEffect(() => {
    if (activeTab === 'chats' && chatsError) {
      Alert.alert('エラー', 'チャットの読み込みに失敗しました');
    } else if (activeTab === 'requests' && applicationsError) {
      Alert.alert('エラー', '申請の読み込みに失敗しました');
    }
  }, [chatsError, applicationsError, activeTab]);

  // チャットをToday/Upcoming/Earlierに分類
  function categorizeChats(): ChatSection[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayChats: EventChat[] = [];
    const upcomingChats: EventChat[] = [];
    const earlierChats: EventChat[] = [];

    chats.forEach((chat) => {
      const eventDate = new Date(chat.eventStartAt);
      const eventDay = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );

      if (eventDay.getTime() === today.getTime()) {
        todayChats.push(chat);
      } else if (eventDay > today) {
        upcomingChats.push(chat);
      } else {
        earlierChats.push(chat);
      }
    });

    const sections: ChatSection[] = [];
    if (todayChats.length > 0) sections.push({ title: 'Today', data: todayChats });
    if (upcomingChats.length > 0) sections.push({ title: 'Upcoming', data: upcomingChats });
    if (earlierChats.length > 0) sections.push({ title: 'Earlier', data: earlierChats });

    return sections;
  }

  const sections = categorizeChats();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  async function handleApprove(
    applicationId: string,
    eventId: string,
    applicantUserId: string,
    applicantName: string
  ) {
    Alert.alert(
      '参加を承認',
      `${applicantName}さんの参加を承認しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '承認',
          onPress: async () => {
            const result = await approveApplication(applicationId, eventId, applicantUserId);
            if (result.success) {
              Alert.alert('成功', '参加を承認しました');
            } else {
              Alert.alert('エラー', result.error || '承認に失敗しました');
            }
          },
        },
      ]
    );
  }

  async function handleReject(applicationId: string, applicantName: string) {
    Alert.alert(
      '参加を却下',
      `${applicantName}さんの参加を却下しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '却下',
          style: 'destructive',
          onPress: async () => {
            const result = await rejectApplication(applicationId);
            if (result.success) {
              Alert.alert('完了', '参加を却下しました');
            } else {
              Alert.alert('エラー', result.error || '却下に失敗しました');
            }
          },
        },
      ]
    );
  }

  function renderChatItem({ item }: { item: EventChat }) {
    const lastMessage = item.messages[0]; // messages are already sorted DESC in hook
    const messagePreview = lastMessage?.contentText || 'メッセージがありません';
    const firstPhoto = item.eventPhotos?.[0];

    // イベント開始から6時間経過しているかチェック
    const eventStartTime = new Date(item.eventStartAt);
    const now = new Date();
    const hoursSinceStart = (now.getTime() - eventStartTime.getTime()) / (1000 * 60 * 60);
    const shouldShowDeletionWarning = hoursSinceStart >= 6;

    // 時刻のフォーマット
    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const isToday = date.toDateString() === now.toDateString();
      const isYesterday = date.toDateString() === yesterday.toDateString();

      if (isToday) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      } else if (isYesterday) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    };

    const timeAgo = lastMessage ? formatTime(lastMessage.createdAt) : '';

    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: colors.card }]}
        onPress={() => router.push({
          pathname: '/(tabs)/chat/event-chat',
          params: { eventId: item.eventId },
        } as any)}>
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.chatImage} />
        ) : (
          <View style={[styles.chatIcon, { backgroundColor: colors.backgroundSecondary }]}>
            <IconSymbol name="person.2.fill" size={24} color={colors.icon} />
          </View>
        )}
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatTitle, { color: colors.text }]} numberOfLines={1}>
              {item.eventTitle}
            </Text>
            <View style={styles.chatTimeContainer}>
              {timeAgo && (
                <Text style={[styles.chatTime, { color: colors.textSecondary }]}>{timeAgo}</Text>
              )}
              {/* Participants */}
              {item.participants && item.participants.length > 0 && (
                <View style={styles.participantsAvatars}>
                  {item.participants.slice(0, 3).map((p, idx) => (
                    <Image
                      key={p.userId}
                      source={{ uri: p.avatarUrl || undefined }}
                      style={[
                        styles.participantAvatar,
                        { marginLeft: idx > 0 ? -8 : 0, borderColor: colors.card },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.chatResort, { color: colors.textSecondary }]} numberOfLines={1}>
            {new Date(item.eventStartAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            • {item.eventResortName || 'リゾート未設定'}
          </Text>
          {shouldShowDeletionWarning ? (
            <Text style={styles.deletionWarning} numberOfLines={1}>
              ⚠️ 投稿は一定時間後に自動で削除されます
            </Text>
          ) : (
            <Text style={[styles.chatPreview, { color: colors.textSecondary }]} numberOfLines={1}>
              {messagePreview}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderApplicationItem({ item }: { item: EventApplicationWithDetails }) {
    const applicantName = item.applicant?.profiles?.display_name || 'Unknown';
    const eventTitle = item.event?.title || 'Unknown Event';
    const eventDate = item.event?.start_at
      ? new Date(item.event.start_at).toLocaleDateString('ja-JP', {
          month: 'short',
          day: 'numeric',
        })
      : '';
    const resortName = item.event?.resorts?.name || '';
    const countryFlag = item.applicant?.profiles?.country_code || '';

    return (
      <View style={[styles.applicationItem, { backgroundColor: colors.card }]}>
        {/* 申請者情報 */}
        <View style={styles.applicationHeader}>
          <Image
            source={{ uri: item.applicant?.profiles?.avatar_url || undefined }}
            style={styles.applicationAvatar}
          />
          <View style={styles.applicationUserInfo}>
            <View style={styles.applicationNameRow}>
              <Text style={[styles.applicationName, { color: colors.text }]}>
                {applicantName}
              </Text>
              {countryFlag && <Text style={styles.countryFlag}>{countryFlag}</Text>}
              {item.applicant?.profiles?.level && (
                <View style={[styles.levelBadge, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.levelText, { color: colors.textSecondary }]}>
                    {item.applicant.profiles.level}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.applicationEventTitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {eventTitle}
            </Text>
            <Text style={[styles.applicationEventInfo, { color: colors.textSecondary }]}>
              {eventDate} • {resortName}
            </Text>
          </View>
        </View>

        {/* メッセージ */}
        {item.message && (
          <View style={[styles.applicationMessage, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.applicationMessageText, { color: colors.text }]}>
              {item.message}
            </Text>
          </View>
        )}

        {/* アクションボタン */}
        <View style={styles.applicationActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton, { borderColor: colors.border }]}
            onPress={() => handleReject(item.id, applicantName)}>
            <Text style={[styles.rejectButtonText, { color: colors.text }]}>却下</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton, { backgroundColor: colors.accent }]}
            onPress={() => handleApprove(item.id, item.event_id, item.applicant_user_id, applicantName)}>
            <Text style={styles.approveButtonText}>承認</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
          onPress={() => setActiveTab('chats')}>
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'chats' && { color: colors.accent, fontWeight: fontWeight.semibold },
            ]}>
            チャット
          </Text>
          {activeTab === 'chats' && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.accent }]} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}>
          <View style={styles.tabTitleWithBadge}>
            <Text
              style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === 'requests' && { color: colors.accent, fontWeight: fontWeight.semibold },
              ]}>
              リクエスト
            </Text>
            {applications.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.tabBadgeText}>{applications.length}</Text>
              </View>
            )}
          </View>
          {activeTab === 'requests' && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.accent }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : activeTab === 'chats' ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          renderItem={renderChatItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {title}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="message" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                イベントチャットがありません
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                イベントに参加してチャットを始めましょう
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          renderItem={renderApplicationItem}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="person.crop.circle.badge.checkmark" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                参加申請がありません
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                新しい申請が届くとここに表示されます
              </Text>
            </View>
          }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  chatList: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  chatInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  chatTimeContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  chatTime: {
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  chatResort: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  participantsAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs / 2,
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  chatPreview: {
    fontSize: fontSize.sm,
  },
  deletionWarning: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: '#ef4444',
  },
  chatBadge: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    fontSize: fontSize.md,
  },
  tabTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  tabBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: borderRadius.sm,
  },
  applicationItem: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  applicationHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  applicationAvatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.round,
  },
  applicationUserInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  applicationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  applicationName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  countryFlag: {
    fontSize: fontSize.lg,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  levelText: {
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
  applicationEventTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  applicationEventInfo: {
    fontSize: fontSize.sm,
  },
  applicationMessage: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  applicationMessageText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  applicationActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  rejectButton: {
    borderWidth: 1,
  },
  rejectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  approveButton: {},
  approveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: '#FFFFFF',
  },
});
