import { PillButton } from '@/components/ui/PillButton';
import { ChannelsPanel } from '@/components/channels/ChannelsPanel';
import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { useEventApplications, type EventApplicationWithDetails } from '@/hooks/useEventApplications';
import { useEventChats } from '@/hooks/useEventChats';
import { channelErrorKey, useChannelActions, useIncomingChannelRequests, type IncomingChannelRequest } from '@/hooks/useChannels';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEventDate } from '@/utils/formatEventDate';
import { supabase, getAuthUser } from '@/lib/supabase';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import type { EventChat } from '@types';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
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

type TabType = 'chats' | 'channels' | 'requests';

/** リクエストタブの1行：イベントの参加申請か、プライベートチャンネルへの参加リクエスト */
type RequestItem =
  | { type: 'event'; key: string; createdAt: string; application: EventApplicationWithDetails }
  | { type: 'channel'; key: string; createdAt: string; request: IncomingChannelRequest };

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('chats');

  // ほかの画面から「リクエスト」タブを開く：/(tabs)/chat?tab=requests&t=...
  const routeParams = useLocalSearchParams<{ tab?: string; t?: string }>();
  useEffect(() => {
    if (routeParams.tab === 'requests' || routeParams.tab === 'chats' || routeParams.tab === 'channels') {
      setActiveTab(routeParams.tab);
    }
  }, [routeParams.tab, routeParams.t]);

  const { chats, loading: chatsLoading, error: chatsError, refetch } = useEventChats();
  const {
    applications,
    loading: applicationsLoading,
    error: applicationsError,
    approveApplication,
    rejectApplication,
    refetch: refetchApplications,
  } = useEventApplications();

  const channelRequests = useIncomingChannelRequests();
  const channelActions = useChannelActions();
  const [respondingKey, setRespondingKey] = useState<string | null>(null);

  // イベントの申請とチャンネルのリクエストを新しい順に1つの一覧にする
  const requestItems = useMemo<RequestItem[]>(() => {
    const items: RequestItem[] = [
      ...applications.map((application) => ({
        type: 'event' as const,
        key: `event_${application.id}`,
        createdAt: application.created_at ?? '',
        application,
      })),
      ...(channelRequests.data ?? []).map((request) => ({
        type: 'channel' as const,
        key: `channel_${request.channelId}_${request.userId}`,
        createdAt: request.createdAt,
        request,
      })),
    ];
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [applications, channelRequests.data]);

  const [refreshing, setRefreshing] = React.useState(false);

  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  // 現在のユーザーIDを取得（一度だけ）
  React.useEffect(() => {
    async function getCurrentUser() {
      const { data: { user } } = await getAuthUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
    getCurrentUser();
  }, []);

  const loading = activeTab === 'chats' ? chatsLoading : activeTab === 'requests' ? applicationsLoading : false;

  // エラーがある場合は表示
  React.useEffect(() => {
    if (activeTab === 'chats' && chatsError) {
      Alert.alert(t('common.error'), t('chat.loadError'));
    } else if (activeTab === 'requests' && applicationsError) {
      Alert.alert(t('common.error'), t('chat.applicationsLoadError'));
    }
  }, [chatsError, applicationsError, activeTab, t]);

  // プルツーリフレッシュハンドラー
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'chats') {
        await refetch();
      } else {
        await Promise.all([refetchApplications(), channelRequests.refetch()]);
      }
    } finally {
      setRefreshing(false);
    }
  };

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
    if (todayChats.length > 0) result.push({ title: t('chat.sectionToday'), data: todayChats });
    if (upcomingChats.length > 0) result.push({ title: t('chat.sectionUpcoming'), data: upcomingChats });
    if (earlierChats.length > 0) result.push({ title: t('chat.sectionEarlier'), data: earlierChats });

    return result;
  }, [chats, t]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
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
      t('chat.approveTitle'),
      t('chat.approveMessage').replace('${name}', applicantName),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.approveButton'),
          onPress: async () => {
            const result = await approveApplication(applicationId, eventId, applicantUserId);
            if (result.success) {
              Alert.alert(t('common.success'), t('chat.approveSuccess'));
            } else {
              Alert.alert(t('common.error'), result.error || t('chat.approveError'));
            }
          },
        },
      ]
    );
  }

  async function handleReject(applicationId: string, applicantName: string) {
    Alert.alert(
      t('chat.rejectTitle'),
      t('chat.rejectMessage').replace('${name}', applicantName),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.rejectButton'),
          style: 'destructive',
          onPress: async () => {
            const result = await rejectApplication(applicationId);
            if (result.success) {
              Alert.alert(t('common.complete'), t('chat.rejectSuccess'));
            } else {
              Alert.alert(t('common.error'), result.error || t('chat.rejectError'));
            }
          },
        },
      ]
    );
  }

  /**
   * チャット一覧の1行（軽くした）：小さい写真／タイトルと最後の時刻／日時・ゲレンデ／最後のメッセージ。
   * 全行に出していた赤い太字の削除警告はやめ、削除の予告はチャットの中のバー1か所だけにした。
   */
  function renderChatItem({ item }: { item: EventChat }) {
    const lastMessage = item.messages[0]; // messages are already sorted DESC in hook
    const messagePreview = lastMessage?.contentText || t('chat.noMessages');
    const firstPhoto = item.eventPhotos?.[0];

    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === now.toDateString()) {
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      }
      if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };
    const timeAgo = lastMessage ? formatTime(lastMessage.createdAt) : '';

    return (
      <TouchableOpacity
        style={[styles.chatRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() => router.push({
          pathname: '/event-chat/[eventId]',
          params: { eventId: item.eventId },
        } as any)}
        accessibilityRole="button"
        accessibilityLabel={[item.eventTitle, formatEventDate(item.eventStartAt, t), messagePreview].join(', ')}
      >
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={[styles.chatThumb, { backgroundColor: colors.chipBackground }]} />
        ) : (
          <View style={[styles.chatThumb, styles.chatThumbPlaceholder, { backgroundColor: colors.chipBackground }]}>
            <IconSymbol name="person.2.fill" size={22} color={colors.textLabel} />
          </View>
        )}
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={[styles.chatTitle, { color: colors.text }]} numberOfLines={1}>
              {item.eventTitle}
            </Text>
            {timeAgo ? <Text style={[styles.chatTime, { color: colors.textLabel }]}>{timeAgo}</Text> : null}
          </View>
          <Text style={[styles.chatResort, { color: colors.tintText }]} numberOfLines={1}>
            {formatEventDate(item.eventStartAt, t)} ・ {item.eventResortName || t('chat.resortNotSet')}
          </Text>
          <Text style={[styles.chatPreview, { color: colors.textMuted }]} numberOfLines={1}>
            {messagePreview}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  function respondChannelRequest(request: IncomingChannelRequest, approve: boolean) {
    const params = { name: request.name, channel: request.channelName };
    Alert.alert(
      approve ? t('chat.approveTitle') : t('chat.rejectTitle'),
      t(approve ? 'channels.approveRequestConfirm' : 'channels.rejectRequestConfirm', params),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: approve ? t('chat.approveButton') : t('chat.rejectButton'),
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            const key = `channel_${request.channelId}_${request.userId}`;
            setRespondingKey(key);
            try {
              await channelActions.respondRequest(request.channelId, request.userId, approve);
            } catch (error) {
              Alert.alert(t('common.error'), t(channelErrorKey(error)));
            } finally {
              setRespondingKey(null);
            }
          },
        },
      ]
    );
  }

  function renderChannelRequestItem(request: IncomingChannelRequest) {
    const busy = respondingKey === `channel_${request.channelId}_${request.userId}`;
    return (
      <View style={[styles.applicationItem, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={styles.applicationHeader}
          onPress={() => router.push(`/user/${request.userId}` as any)}
          accessibilityRole="button"
          accessibilityLabel={t('channels.requestA11y', { name: request.name, channel: request.channelName })}
        >
          <RoleBasedAvatar avatarUrl={request.avatarUrl} role="user" size={60} showBadge={false} />
          <View style={styles.applicationUserInfo}>
            <Text style={[styles.applicationName, { color: colors.text }]}>{request.name}</Text>
            <Text style={[styles.applicationEventTitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {request.channelName}
            </Text>
            <Text style={[styles.applicationEventInfo, { color: colors.textSecondary }]}>{t('channels.requestKind')}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.applicationActions}>
          <PillButton
            title={t('chat.rejectButton')}
            variant="secondary"
            fill
            disabled={busy}
            onPress={() => respondChannelRequest(request, false)}
          />
          <PillButton title={t('chat.approveButton')} fill loading={busy} onPress={() => respondChannelRequest(request, true)} />
        </View>
      </View>
    );
  }

  function renderRequestItem({ item }: { item: RequestItem }) {
    return item.type === 'channel'
      ? renderChannelRequestItem(item.request)
      : renderApplicationItem({ item: item.application });
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
        <TouchableOpacity
          style={styles.applicationHeader}
          onPress={() => {
            if (item.applicant?.id) {
              router.push(`/user/${item.applicant.id}` as any);
            }
          }}
        >
          <RoleBasedAvatar
            avatarUrl={item.applicant?.profiles?.avatar_url || null}
            role={item.applicant?.profiles?.role || 'user'}
            size={60}
            showBadge={true}
          />
          <View style={styles.applicationUserInfo}>
            <View style={styles.applicationNameRow}>
              <Text style={[styles.applicationName, { color: colors.text }]}>
                {applicantName}
              </Text>
            </View>
            <Text style={[styles.applicationEventTitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {eventTitle}
            </Text>
            <Text style={[styles.applicationEventInfo, { color: colors.textSecondary }]}>
              {eventDate} • {resortName}
            </Text>
          </View>
        </TouchableOpacity>

        {/* メッセージ */}
        {
          item.message && (
            <View style={[styles.applicationMessage, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.applicationMessageText, { color: colors.text }]}>
                {item.message}
              </Text>
            </View>
          )
        }

        {/* アクションボタン */}
        <View style={styles.applicationActions}>
          <PillButton
            title={t('chat.rejectButton')}
            variant="secondary"
            fill
            onPress={() => handleReject(item.id, applicantName)}
          />
          <PillButton
            title={t('chat.approveButton')}
            fill
            onPress={() => handleApprove(item.id, item.event_id, item.applicant_user_id, applicantName)}
          />
        </View>
      </View >
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
              activeTab === 'chats' && { color: colors.tint, fontWeight: fontWeight.semibold },
            ]}>
            {t('chat.tabChats')}
          </Text>
          {activeTab === 'chats' && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.tint }]} />
          )}
        </TouchableOpacity>
        {/* テーマ別チャンネル（イベントのチャットとは別枠） */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'channels' && styles.activeTab]}
          onPress={() => setActiveTab('channels')}
          testID="chat-tab-channels">
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'channels' && { color: colors.tint, fontWeight: fontWeight.semibold },
            ]}>
            {t('chat.tabChannels')}
          </Text>
          {activeTab === 'channels' && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.tint }]} />
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
                activeTab === 'requests' && { color: colors.tint, fontWeight: fontWeight.semibold },
              ]}>
              {t('chat.tabRequests')}
            </Text>
            {requestItems.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: colors.tint }]}>
                <Text style={styles.tabBadgeText}>{requestItems.length}</Text>
              </View>
            )}
          </View>
          {activeTab === 'requests' && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.tint }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'channels' ? (
        <ChannelsPanel />
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : activeTab === 'chats' ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatSectionList}
          renderItem={renderChatItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {title}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="message" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('chat.noEventChats')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {t('chat.noEventChatsSubtext')}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={requestItems}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.chatList}
          renderItem={renderRequestItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="person.crop.circle.badge.checkmark" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('chat.noApplications')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {t('chat.noApplicationsSubtext')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// 一覧のカードを背景から少し浮かせる控えめな影
const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  android: { elevation: 1 },
  default: {},
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  chatList: {
    padding: spacing.md,
    paddingBottom: 120,
    gap: spacing.md,
  },
  // チャット一覧：1件ずつ独立したカードにするので、外側の余白とカード間のすき間を付ける
  chatSectionList: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    padding: spacing.md - 4,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    ...cardShadow,
  },
  chatThumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.card,
  },
  chatThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
  chatTime: {
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  chatResort: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  chatPreview: {
    fontSize: fontSize.sm,
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
});
