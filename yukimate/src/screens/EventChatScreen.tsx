import { IconSymbol } from '@/components/ui/icon-symbol';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { Event, EventMessageWithSender, Profile } from '@/lib/database.types';
import { supabase, getAuthUser } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '@/components/ui/Chip';
import { formatEventDate } from '@/utils/formatEventDate';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface EventDetail extends Event {
  resorts: { id: string; name: string } | null;
  host: { id: string; profiles: Profile } | null;
  participants: Array<{
    user: {
      id: string;
      profiles: Profile;
    };
  }>;
}

interface ChatRoom {
  id: string;
  event_id: string;
  created_at: string;
}

export default function EventChatScreen() {
  const params = useLocalSearchParams<{ eventId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<EventMessageWithSender[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  // リアルタイム受信時に送信者情報を参照するための最新イベント情報
  const eventRef = useRef<EventDetail | null>(null);
  eventRef.current = event;

  // 入力欄をキーボードの真上に付けるための状態
  // - iOS：KeyboardAvoidingView（padding）。この画面はスタックのヘッダーを出さず、ヘッダーも中に描いているので
  //   keyboardVerticalOffset は 0 が正しい（以前の固定値 90 が隙間の原因だった）
  // - Android：edge-to-edge のため adjustResize で画面が縮まない。KeyboardAvoidingView の height は
  //   キーボードを閉じたあとも縮んだ高さが残って下に余白ができるので使わず、キーボードの高さを下の余白に入れる
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      if (Platform.OS === 'android') setAndroidKeyboardHeight(e.endCoordinates.height);
      // キーボードが出たら最新のメッセージが見えるようにする
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setAndroidKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    initializeChat();
  }, [params.eventId]);

  // イベント終了判定
  useEffect(() => {
    if (!event) {
      console.log('[EventChatScreen] ⚠️ Event status useEffect: No event, skipping');
      return;
    }

    console.log('[EventChatScreen] 🔄 Event status useEffect: Starting interval check');
    checkEventStatus();

    // 5分ごとにチェック
    const interval = setInterval(() => {
      console.log('[EventChatScreen] 🔄 Interval: Running checkEventStatus (every 5 min)');
      checkEventStatus();
    }, 300000);

    return () => {
      console.log('[EventChatScreen] 🛑 Event status useEffect: Clearing interval');
      clearInterval(interval);
    };
  }, [event]);

  // リアルタイムメッセージング - PostgreSQL changes方式
  useEffect(() => {
    if (!chatRoom || !currentUserId) return;

    console.log('📡 Subscribing to message updates for chat:', chatRoom.id);

    const channel = supabase
      .channel(`chat:${chatRoom.id}:messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_messages',
          filter: `chat_id=eq.${chatRoom.id}`,
        },
        async (payload) => {
          console.log('📨 New message inserted:', payload);
          const newMessage = payload.new as any;

          // 自分のメッセージは既にUIに追加済みなのでスキップ
          if (newMessage.sender_user_id === currentUserId) {
            console.log('⏭️ Skipping own message');
            return;
          }

          // 送信者情報: 参加者一覧に居ればそれを使い（通信なしで即表示）、居なければ取得
          const knownSender = eventRef.current?.participants.find(
            (p) => p.user.id === newMessage.sender_user_id
          )?.user.profiles ?? (eventRef.current?.host?.id === newMessage.sender_user_id
            ? eventRef.current?.host?.profiles
            : undefined);

          let senderProfile: any = knownSender ?? null;
          if (!senderProfile) {
            const { data } = await supabase
              .from('profiles')
              .select('user_id, display_name, avatar_url')
              .eq('user_id', newMessage.sender_user_id)
              .single();
            senderProfile = data;
          }

          console.log('👤 Sender profile:', senderProfile);

          const messageWithSender: EventMessageWithSender = {
            id: newMessage.id,
            chat_id: newMessage.chat_id,
            sender_user_id: newMessage.sender_user_id,
            content_text: newMessage.content_text,
            content_image_url: newMessage.content_image_url,
            created_at: newMessage.created_at,
            sender: {
              id: newMessage.sender_user_id,
              profiles: senderProfile,
            },
          };

          setMessages((prev) => [...prev, messageWithSender]);
        }
      )
      .subscribe((status) => {
        console.log('📡 Channel status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from channel');
      channel.unsubscribe();
    };
  }, [chatRoom, currentUserId]);

  // 新しいメッセージが追加されたら最下部にスクロール
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  async function initializeChat() {
    console.log('[EventChatScreen] 🚀 Initializing chat for event:', params.eventId);
    try {
      setLoading(true);

      const {
        data: { user },
      } = await getAuthUser();
      if (!user) throw new Error(t('eventChat.loginRequired'));

      console.log('[EventChatScreen] 👤 Current user:', user.id);
      setCurrentUserId(user.id);

      // 現在のユーザーのプロフィールを取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setCurrentUserProfile(profile);

      // イベント情報取得
      console.log('[EventChatScreen] 📅 Fetching event data...');
      const { data: eventData, error: eventError } = await supabase
        .from('posts_events')
        .select(
          `
          *,
          resorts(id, name),
          profiles!posts_events_host_user_id_fkey(
            user_id,
            display_name,
            avatar_url,
            level
          )
        `
        )
        .eq('id', params.eventId)
        .single();

      if (eventError) {
        console.error('[EventChatScreen] ❌ Event fetch error:', eventError);
        throw eventError;
      }

      console.log('[EventChatScreen] ✅ Event data fetched:', {
        eventId: eventData.id,
        startAt: eventData.start_at,
        hostUserId: eventData.host_user_id,
      });

      // 参加者を別途取得
      console.log('[EventChatScreen] 👥 Fetching participants...');
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(
          `
          user_id,
          users!event_participants_user_id_fkey(
            id,
            profiles(
              user_id,
              display_name,
              avatar_url
            )
          )
        `
        )
        .eq('event_id', params.eventId)
        .is('left_at', null);

      console.log('[EventChatScreen] 👥 Participants data:', {
        count: participantsData?.length || 0,
        data: participantsData,
        error: participantsError,
      });

      // イベント画像のURLを変換
      let photoUrls: string[] = [];
      if (eventData.photos && eventData.photos.length > 0) {
        photoUrls = eventData.photos.map((photoPath: string) => {
          if (photoPath.startsWith('http')) {
            return photoPath;
          } else {
            const { data } = supabase.storage
              .from('event_images')
              .getPublicUrl(photoPath);
            return data.publicUrl;
          }
        });
      }

      // 参加者を整形（ホストを含む全参加者）
      const allParticipants: Array<{
        user: {
          id: string;
          profiles: any;
        };
      }> = [];

      // ホストを追加
      if (eventData.host_user_id && eventData.profiles) {
        allParticipants.push({
          user: {
            id: eventData.host_user_id,
            profiles: eventData.profiles,
          },
        });
      }

      // その他の参加者を追加（ホストが重複しないようにチェック）
      if (participantsData) {
        participantsData.forEach((p: any) => {
          if (p.user_id !== eventData.host_user_id) {
            allParticipants.push({
              user: {
                id: p.user_id,
                profiles: p.users?.profiles,
              },
            });
          }
        });
      }

      console.log('[EventChatScreen] 🎯 Participants formatted (including host):', {
        hostUserId: eventData.host_user_id,
        totalParticipants: allParticipants.length,
        participantIds: allParticipants.map((p) => p.user.id),
      });

      // データを整形
      const event = {
        ...eventData,
        photos: photoUrls,
        host: {
          id: eventData.host_user_id,
          profiles: eventData.profiles,
        },
        participants: allParticipants,
      };

      console.log('[EventChatScreen] 📦 Event object created:', {
        eventId: event.id,
        startAt: event.start_at,
        hasPhotos: !!event.photos,
        photosLength: event.photos?.length,
        participantsCount: event.participants.length,
        participantIds: event.participants.map((p: any) => p.user.id),
      });

      setEvent(event as any);

      // ホストかどうかをチェック
      const isHost = eventData.host_user_id === user.id;

      console.log('[EventChatScreen] 👑 Host check:', {
        eventId: params.eventId,
        userId: user.id,
        hostUserId: eventData.host_user_id,
        isHost,
      });

      // ホストでない場合のみ、参加者チェックを行う
      if (!isHost) {
        // 現在のユーザーが参加者として登録されているか確認（left_at=nullのもののみ）
        const { data: myParticipation, error: participationError } = await supabase
          .from('event_participants')
          .select('id, event_id, user_id, left_at')
          .eq('event_id', params.eventId)
          .eq('user_id', user.id)
          .is('left_at', null)
          .maybeSingle();

        console.log('[EventChatScreen] 📋 My participation status:', {
          eventId: params.eventId,
          userId: user.id,
          isParticipant: !!myParticipation,
          participationData: myParticipation,
          error: participationError,
        });

        // 退出済み（left_atが設定されている）または参加していない場合はチャットにアクセスできない
        if (!myParticipation) {
          console.log('[EventChatScreen] ⚠️ User has left or is not a participant, blocking access to chat');
          Alert.alert(
            t('eventChat.accessDenied'),
            t('eventChat.accessDeniedMessage'),
            [{ text: t('common.ok'), onPress: () => router.replace('/(tabs)/chat') }]
          );
          return;
        }
      } else {
        console.log('[EventChatScreen] ✅ User is host, skipping participation check');
      }

      // チャットルーム取得または作成
      let { data: room, error: roomError } = await supabase
        .from('event_chats')
        .select('*')
        .eq('event_id', params.eventId)
        .maybeSingle();

      // エラーが発生した場合（PGRST116以外）
      if (roomError && roomError.code !== 'PGRST116') {
        throw roomError;
      }

      if (!room) {
        console.log('Chat room not found, creating new one for event:', params.eventId);
        const { data: newRoom, error: insertError } = await supabase
          .from('event_chats')
          .insert({ event_id: params.eventId })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create chat room:', insertError);
          throw insertError;
        }

        room = newRoom;
      }

      console.log('Chat room loaded:', room);
      setChatRoom(room as ChatRoom);

      // メッセージ取得
      if (room) {
        await fetchMessages(room.id);
      }
    } catch (error: any) {
      console.error('Initialize chat error:', error);
      Alert.alert(t('common.error'), t('eventChat.loadError'));
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(chatId: string) {
    const { data, error } = await supabase
      .from('event_messages')
      .select(
        `
        *,
        sender:users!event_messages_sender_user_id_fkey(
          id,
          profiles(
            user_id,
            display_name,
            avatar_url
          )
        )
      `
      )
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch messages error:', error);
      return;
    }

    // データを整形
    const messages = (data || []).map((msg: any) => ({
      ...msg,
      sender: {
        id: msg.sender_user_id,
        profiles: msg.sender?.profiles,
      },
    }));

    setMessages(messages as any);
  }

  async function checkEventStatus() {
    console.log('[EventChatScreen] 🕐 Checking event status...');

    if (!event || !currentUserId) {
      console.log('[EventChatScreen] ⚠️ Event status check skipped:', {
        hasEvent: !!event,
        hasCurrentUserId: !!currentUserId,
      });
      return;
    }

    const eventStartTime = new Date(event.start_at);
    const now = new Date();

    console.log('[EventChatScreen] ⏰ Time check:', {
      eventStartTime: eventStartTime.toISOString(),
      currentTime: now.toISOString(),
      eventId: event.id,
      isAfterStart: now > eventStartTime,
    });

    // イベント開始時刻を過ぎているかチェック
    if (now > eventStartTime) {
      const hoursSinceStart =
        (now.getTime() - eventStartTime.getTime()) / (1000 * 60 * 60);

      console.log('[EventChatScreen] ⏱️ Hours since start:', {
        hoursSinceStart: hoursSinceStart.toFixed(2),
        requiresPostAction: hoursSinceStart >= 6,
      });

      // イベント開始から6時間経過
      if (hoursSinceStart >= 6) {
        const hasCompletedPostAction = await AsyncStorage.getItem(`post_action_completed_${event.id}`);

        console.log('[EventChatScreen] 📋 Post action check:', {
          hasCompletedPostAction: !!hasCompletedPostAction,
          storageKey: `post_action_completed_${event.id}`,
        });

        if (!hasCompletedPostAction) {
          // ★登録/ブロック画面へ遷移
          const otherParticipants = event.participants.filter(
            (p) => p.user.id !== currentUserId
          );

          console.log('[EventChatScreen] 🚀 Redirecting to post-event-action:', {
            eventId: event.id,
            totalParticipants: event.participants?.length || 0,
            otherParticipantsCount: otherParticipants.length,
            participantIds: otherParticipants.map((p) => p.user.id),
          });

          router.replace({
            pathname: '/post-event-action/[eventId]',
            params: {
              eventId: event.id,
              participants: JSON.stringify(otherParticipants),
            },
          });
        } else {
          console.log('[EventChatScreen] ℹ️ Post action already completed for this event');
        }
      } else {
        console.log('[EventChatScreen] ⏳ Event not ready for post-action (< 6 hours)');
      }
    } else {
      console.log('[EventChatScreen] ⏳ Event has not started yet');
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !chatRoom || !currentUserId || !params.eventId) {
      console.log('Send blocked:', {
        hasText: !!inputText.trim(),
        hasChatRoom: !!chatRoom,
        hasUserId: !!currentUserId,
        hasEventId: !!params.eventId
      });
      return;
    }

    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const messageContent = inputText.trim();

    console.log('Sending message:', {
      chatId: chatRoom.id,
      userId: currentUserId,
      eventId: params.eventId,
      contentLength: messageContent.length
    });

    // UIに即座に表示（楽観的更新）
    const optimisticMessage: EventMessageWithSender = {
      id: tempId,
      chat_id: chatRoom.id,
      sender_user_id: currentUserId,
      content_text: messageContent,
      content_image_url: null,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUserId,
        profiles: currentUserProfile || ({} as Profile),
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');

    try {
      const { data, error } = await supabase
        .from('event_messages')
        .insert({
          chat_id: chatRoom.id,
          sender_user_id: currentUserId,
          content_text: messageContent,
        })
        .select(
          `
          *,
          sender:users!event_messages_sender_user_id_fkey(
            id,
            profiles(
              user_id,
              display_name,
              avatar_url
            )
          )
        `
        )
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);

      // データを整形
      const sentMessage = {
        ...data,
        sender: {
          id: currentUserId,
          profiles: data.sender?.profiles,
        },
      };

      // 一時IDを実際のIDに置き換え
      setMessages((prev) => prev.map((msg) => (msg.id === tempId ? sentMessage as any : msg)));

      // 他の参加者に通知を送信
      // 送信ボタンの解除を待たせないよう、完了を待たずに並列で送る（以前は参加者ごとに直列で待っていた）
      if (event && currentUserProfile) {
        const senderName = currentUserProfile.display_name || 'Someone';
        const recipients = event.participants.filter(
          (participant: any) => participant.user.id !== currentUserId
        );
        import('@/services/notificationService')
          .then(({ notifyNewChatMessage }) =>
            Promise.all(
              recipients.map((participant: any) =>
                notifyNewChatMessage(participant.user.id, senderName, event.title, params.eventId).catch(
                  (notifyError: any) => console.error('Failed to send chat notification:', notifyError)
                )
              )
            )
          )
          .catch((notifyError) => {
            console.error('Failed to send chat notification:', notifyError);
            // 通知失敗してもメッセージ送信は成功として扱う
          });
      }

      // PostgreSQL changesで自動的に他のユーザーに通知されます
      console.log('✅ Message sent, will be broadcast via PostgreSQL changes');
    } catch (error: any) {
      console.error('Send message error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      // エラーの場合は一時メッセージを削除
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));

      Alert.alert(
        t('common.error'),
        `${t('eventChat.sendError')}\n${error.message || t('eventChat.unknownError')}`
      );
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('eventChat.justNow');
    if (diffMins < 60) return t('eventChat.minutesAgo').replace('${minutes}', diffMins.toString());

    if (date.toDateString() === now.toDateString()) {
      return format(date, 'HH:mm');
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `${t('eventChat.yesterday')} ${format(date, 'HH:mm')}`;
    }

    return format(date, 'M/d HH:mm');
  }

  function renderMessage({ item }: { item: EventMessageWithSender }) {
    const isOwnMessage = item.sender_user_id === currentUserId;
    const isHost = item.sender_user_id === event?.host?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <Image
            source={{ uri: item.sender?.profiles?.avatar_url || undefined }}
            style={styles.avatar}
          />
        )}

        <View style={styles.messageContent}>
          {!isOwnMessage && (
            <View style={styles.senderNameContainer}>
              <Text style={[styles.senderName, { color: colors.text }]}>
                {item.sender?.profiles?.display_name || t('common.unknown')}
              </Text>
              {/* ホストは名前の横にチップ（開発者バッジと同じ緑はやめた） */}
              {isHost && <Chip label={t('chips.host')} tone="tint" />}
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isOwnMessage
                ? [styles.ownBubble, { backgroundColor: colors.primaryButton }]
                : [styles.otherBubble, { backgroundColor: colors.chipBackground }],
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: isOwnMessage ? colors.primaryButtonText : colors.text },
              ]}
            >
              {item.content_text}
            </Text>
          </View>

          <Text
            style={[
              styles.timestamp,
              {
                color: colors.textSecondary,
                textAlign: isOwnMessage ? 'right' : 'left',
              },
            ]}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  }

  function renderHeader() {
    if (!event) return null;

    const memberCount = new Set([
      ...(event.participants || []).map((p) => p.user.id),
      ...(event.host?.id ? [event.host.id] : []),
    ]).size;
    const meta = t('chatRoom.headerMeta', {
      date: formatEventDate(event.start_at, t),
      resort: event.resorts?.name || t('common.unknown'),
      count: memberCount,
    });
    const openDetails = () =>
      router.push({ pathname: '/event-detail', params: { eventId: params.eventId } } as any);

    return (
      <View style={{ backgroundColor: colors.background }}>
        {/* 1行に圧縮したヘッダー：戻る／タイトル＋日時・ゲレンデ・人数／ⓘ（詳細へ） */}
        <View style={[styles.compactHeader, { paddingTop: insets.top, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerTitleArea} onPress={openDetails} accessibilityRole="button">
            <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={[styles.compactMeta, { color: colors.textLabel }]} numberOfLines={1}>
              {meta}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={openDetails}
            accessibilityRole="button"
            accessibilityLabel={t('chatRoom.openDetails')}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* 削除の予告は控えめなバーで1か所だけ */}
        <View style={[styles.noticeBar, { backgroundColor: colors.chipBackground }]}>
          <Ionicons name="time-outline" size={14} color={colors.textLabel} />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>{t('chatRoom.deletionNotice')}</Text>
        </View>
      </View>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyState}>
        <IconSymbol name="message" size={64} color={colors.icon} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('eventChat.noMessages')}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {t('eventChat.sendFirstMessage')}
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('eventChat.loadingChat')}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingBottom: androidKeyboardHeight },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS === 'ios'}
      keyboardVerticalOffset={0}
    >
      {/* Fixed Header */}
      {renderHeader()}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.messagesList}
      />

      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            // キーボードが出ていないときだけホームインジケーター／ナビゲーションバーの分を空ける
            paddingBottom: spacing.md + (keyboardVisible ? 0 : insets.bottom),
          },
        ]}
      >
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('eventChat.messagePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          style={[
            styles.input,
            { backgroundColor: colors.backgroundSecondary, color: colors.text },
          ]}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />

        <TouchableOpacity
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim() && !sending ? '#5A7D9A' : colors.border,
            },
          ]}
        >
          <IconSymbol name="paperplane.fill" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleArea: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  compactMeta: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  noticeText: {
    fontSize: fontSize.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  messageContent: {
    maxWidth: '75%',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.xl,
    marginBottom: 4,
  },
  ownBubble: {
    borderBottomRightRadius: borderRadius.sm,
  },
  otherBubble: {
    borderBottomLeftRadius: borderRadius.sm,
  },
  senderNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs / 2,
  },
  senderName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  hostBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  text: {
    fontSize: fontSize.md,
    lineHeight: 20,
    color: '#000000',
  },
  timestamp: {
    fontSize: fontSize.xs,
    marginHorizontal: spacing.sm,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    position: 'relative',
  },
  headerTopBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  headerImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: '#334155',
  },
  headerImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerImageEmoji: {
    fontSize: fontSize.xxxl,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs / 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: fontSize.sm,
  },
  infoSeparator: {
    fontSize: fontSize.sm,
  },
  descriptionContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  participantsAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    borderWidth: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  detailsLink: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  detailsLinkText: {
    fontSize: fontSize.sm,
    color: '#5A7D9A',
    textDecorationLine: 'underline',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    fontSize: fontSize.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.round,
  },
});
