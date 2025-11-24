import { IconSymbol } from '@/components/ui/icon-symbol';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Event, EventMessageWithSender, Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<EventMessageWithSender[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeChat();
  }, [params.eventId]);

  // イベント終了判定
  useEffect(() => {
    if (!event) return;

    checkEventStatus();

    // 5分ごとにチェック
    const interval = setInterval(checkEventStatus, 300000);

    return () => clearInterval(interval);
  }, [event]);

  // リアルタイムメッセージング - ブロードキャスト方式
  useEffect(() => {
    if (!chatRoom || !params.eventId) return;

    const channelName = `event:${params.eventId}:messages`;
    console.log('📡 Subscribing to channel:', channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'broadcast',
        { event: 'INSERT' },
        async (payload) => {
          console.log('📨 Received broadcast message:', payload);
          const newMessage = payload.payload;

          // 自分のメッセージは既にUIに追加済みなのでスキップ
          if (newMessage.sender_user_id === currentUserId) {
            console.log('⏭️ Skipping own message');
            return;
          }

          // 送信者情報を取得
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .eq('user_id', newMessage.sender_user_id)
            .single();

          console.log('👤 Sender profile:', senderProfile);

          setMessages((prev) => [
            ...prev,
            {
              ...newMessage,
              sender: {
                id: newMessage.sender_user_id,
                profiles: senderProfile,
              },
            },
          ]);
        }
      )
      .subscribe((status) => {
        console.log('📡 Channel status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from channel:', channelName);
      channel.unsubscribe();
    };
  }, [chatRoom, currentUserId, params.eventId]);

  // 新しいメッセージが追加されたら最下部にスクロール
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  async function initializeChat() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      setCurrentUserId(user.id);

      // 現在のユーザーのプロフィールを取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setCurrentUserProfile(profile);

      // イベント情報取得
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

      if (eventError) throw eventError;

      // 参加者を別途取得
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

      console.log('Participants data:', {
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

      // 参加者を整形（ホストを除く）
      const allParticipants: Array<{
        user: {
          id: string;
          profiles: any;
        };
      }> = [];

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

      console.log('Event data:', {
        hasPhotos: !!event.photos,
        photosLength: event.photos?.length,
        firstPhoto: event.photos?.[0],
        photos: event.photos,
        participantsCount: event.participants.length,
        participants: event.participants,
      });

      setEvent(event as any);

      // 現在のユーザーが参加者として登録されているか確認
      const { data: myParticipation, error: participationError } = await supabase
        .from('event_participants')
        .select('id, event_id, user_id')
        .eq('event_id', params.eventId)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle();

      console.log('My participation status:', {
        eventId: params.eventId,
        userId: user.id,
        isParticipant: !!myParticipation,
        participationData: myParticipation,
        error: participationError,
      });

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
      Alert.alert('エラー', 'チャットの読み込みに失敗しました');
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
    if (!event || !currentUserId) return;

    const eventStartTime = new Date(event.start_at);
    const now = new Date();

    // イベント開始時刻を過ぎているかチェック
    if (now > eventStartTime) {
      const hoursSinceStart =
        (now.getTime() - eventStartTime.getTime()) / (1000 * 60 * 60);

      // イベント開始から6時間経過
      if (hoursSinceStart >= 6) {
        const hasShownPostAction = await AsyncStorage.getItem(
          `post_action_shown_${event.id}`
        );

        if (!hasShownPostAction) {
          // ★登録/ブロック画面へ遷移
          const otherParticipants = event.participants.filter(
            (p) => p.user.id !== currentUserId
          );

          await AsyncStorage.setItem(`post_action_shown_${event.id}`, 'true');

          router.replace({
            pathname: '/post-event-action/[eventId]',
            params: {
              eventId: event.id,
              participants: JSON.stringify(otherParticipants),
            },
          });
        }
      }
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

      // ブロードキャストでメッセージを送信
      const channelName = `event:${params.eventId}:messages`;
      const broadcastChannel = supabase.channel(channelName);

      await broadcastChannel.send({
        type: 'broadcast',
        event: 'INSERT',
        payload: {
          id: data.id,
          chat_id: data.chat_id,
          sender_user_id: data.sender_user_id,
          content_text: data.content_text,
          content_image_url: data.content_image_url,
          created_at: data.created_at,
          event_id: params.eventId,
        },
      });

      console.log('📡 Broadcast sent to channel:', channelName);
    } catch (error: any) {
      console.error('Send message error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));

      // エラーの場合は一時メッセージを削除
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));

      Alert.alert(
        'エラー',
        `メッセージの送信に失敗しました\n${error.message || '不明なエラー'}`
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

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;

    if (date.toDateString() === now.toDateString()) {
      return format(date, 'HH:mm');
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨日 ${format(date, 'HH:mm')}`;
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
              <Text style={[styles.senderName, { color: isHost ? '#22c55e' : colors.text }]}>
                {item.sender?.profiles?.display_name || 'Unknown'}
              </Text>
              {isHost && (
                <Text style={[styles.hostBadge, { color: '#22c55e' }]}>
                  （ホスト）
                </Text>
              )}
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isOwnMessage ? styles.ownBubble : styles.otherBubble,
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: isOwnMessage ? '#ffffff' : colors.text },
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

    return (
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Top row: Image + Title/Info */}
        <View style={styles.headerTopRow}>
          {/* Event image */}
          {event.photos && event.photos.length > 0 && event.photos[0] ? (
            <Image
              source={{ uri: event.photos[0] }}
              style={styles.headerImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('Image load error:', error.nativeEvent.error);
              }}

            />
          ) : (
            <View style={styles.headerImagePlaceholder}>
              <Text style={styles.headerImageEmoji}>🏔️</Text>
            </View>
          )}

          {/* Event info */}
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {event.title}
            </Text>

            <View style={styles.infoRow}>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {format(new Date(event.start_at), 'MMM d')}
              </Text>
              <Text style={[styles.infoSeparator, { color: colors.textSecondary }]}> • </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                {event.resorts?.name || 'Unknown Resort'}
              </Text>
            </View>

            {/* Participants */}
            {event.participants && event.participants.length > 0 && (
              <View style={styles.participantsAvatars}>
                {event.participants.slice(0, 3).map((p, idx) => (
                  <Image
                    key={p.user.id}
                    source={{ uri: p.user.profiles?.avatar_url || undefined }}
                    style={[
                      styles.participantAvatar,
                      { marginLeft: idx > 0 ? -12 : 0, borderColor: colors.card },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
              {event.description}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={() => router.push({
              pathname: '/(tabs)/chat/event-detail',
              params: { eventId: params.eventId },
            } as any)}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Details</Text>
          </TouchableOpacity>

        </View>
      </View>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyState}>
        <IconSymbol name="message" size={64} color={colors.icon} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          まだメッセージがありません
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          最初のメッセージを送信しましょう！
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          チャットを読み込んでいます...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
      <View style={[styles.inputContainer, { backgroundColor: colors.card }]}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Write a message..."
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
              backgroundColor: inputText.trim() && !sending ? '#3b82f6' : colors.border,
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
    borderRadius: 18,
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
    backgroundColor: '#1890ff',
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: '#808080',
    borderBottomLeftRadius: 6,
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
  backButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    fontSize: 32,
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
    borderRadius: 18,
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
    borderRadius: 20,
  },
});
