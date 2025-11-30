import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { useEventApplications, type EventApplicationWithDetails } from '@/hooks/useEventApplications';
import { useEventChats } from '@/hooks/useEventChats';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import type { EventChat } from '@types';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatSection {
  title: string;
  data: EventChat[];
}

type TabType = 'chats' | 'requests';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
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

  // 現在のユーザーIDを取得（一度だけ）
  React.useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
    getCurrentUser();
  }, []);

  const loading = activeTab === 'chats' ? chatsLoading : applicationsLoading;

  // エラーがある場合は表示
  React.useEffect(() => {
    if (activeTab === 'chats' && chatsError) {
      Alert.alert('エラー', 'チャットの読み込みに失敗しました');
    } else if (activeTab === 'requests' && applicationsError) {
      Alert.alert('エラー', '申請の読み込みに失敗しました');
    }
  }, [chatsError, applicationsError, activeTab]);

  // チャットをToday/Upcoming/Earlierに分類（メモ化）
  const sections = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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

    const result: ChatSection[] = [];
    if (todayChats.length > 0) result.push({ title: 'Today', data: todayChats });
    if (upcomingChats.length > 0) result.push({ title: 'Upcoming', data: upcomingChats });
    if (earlierChats.length > 0) result.push({ title: 'Earlier', data: earlierChats });

    return result;
  }, [chats]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        style={styles.chatItemContainer}
        onPress={() => router.push({
          pathname: '/event-chat/[eventId]',
          params: { eventId: item.eventId },
        } as any)}>
        <BlurView intensity={95} tint="dark" style={styles.blurContainer}>
          <LinearGradient
            colors={['rgba(40, 60, 80, 0.45)', 'rgba(30, 50, 70, 0.5)', 'rgba(40, 60, 80, 0.48)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chatItemGradient}
          >
            {firstPhoto ? (
              <Image source={{ uri: firstPhoto }} style={styles.chatImage} />
            ) : (
              <View style={[styles.chatIcon, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
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
                            { marginLeft: idx > 0 ? -8 : 0, borderColor: 'rgba(255, 255, 255, 0.2)' },
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
          </LinearGradient>
        </BlurView>
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
      {/* Header Spacer */}
      <View style={{ height: Math.max(insets.top, 16) }} />

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
    paddingBottom: 120,
    gap: spacing.xs,
  },
  chatItemContainer: {
    borderRadius: borderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  blurContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(248, 255, 255, 0.15)',
  },
  chatItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
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
