import { supabase } from '@/lib/supabase';
import type { EventChat } from '@types';
import { useEffect, useState } from 'react';

interface EventChatData {
  id: string;
  event_id: string;
  created_at: string;
  posts_events: {
    id: string;
    title: string;
    start_at: string;
    photos: string[];
    resorts: {
      id: string;
      name: string;
    } | null;
  } | null;
  messages: Array<{
    id: string;
    chat_id: string;
    sender_user_id: string;
    content_text: string | null;
    created_at: string;
    sender: {
      id: string;
      profiles: {
        user_id: string;
        display_name: string | null;
        avatar_url: string | null;
      } | null;
    } | null;
  }>;
}

export function useEventChats() {
  const [chats, setChats] = useState<EventChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatIds, setChatIds] = useState<string[]>([]);

  useEffect(() => {
    fetchEventChats();
  }, []);

  // リアルタイムサブスクリプション: 参加状態の変更を監視
  useEffect(() => {
    let participantsChannel: ReturnType<typeof supabase.channel> | null = null;

    async function setupParticipantsSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // event_participantsテーブルの変更を監視
      participantsChannel = supabase
        .channel('event-participants-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE全てを監視
            schema: 'public',
            table: 'event_participants',
            filter: `user_id=eq.${user.id}`, // 自分の参加状態のみ
          },
          (payload) => {
            console.log('[useEventChats] 🔔 Participant change detected:', payload);
            // 参加状態が変更されたらリストを再取得
            fetchEventChats();
          }
        )
        .subscribe();
    }

    setupParticipantsSubscription();

    return () => {
      if (participantsChannel) {
        supabase.removeChannel(participantsChannel);
      }
    };
  }, []);

  // リアルタイムサブスクリプション: メッセージの変更を監視（chatIdsが更新されたときに再設定）
  useEffect(() => {
    if (chatIds.length === 0) return;

    let messagesChannel: ReturnType<typeof supabase.channel> | null = null;

    // 各チャットIDに対してメッセージの変更を監視
    // Supabaseのfilterでは配列を直接使えないため、複数のチャンネルを作成するか、
    // またはすべてのメッセージを監視してフィルタリングする
    messagesChannel = supabase
      .channel('event-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // 新しいメッセージの追加のみ監視
          schema: 'public',
          table: 'event_messages',
        },
        (payload) => {
          // チャットIDが自分のチャットリストに含まれているかチェック
          const newMessage = payload.new as { chat_id: string };
          if (chatIds.includes(newMessage.chat_id)) {
            console.log('[useEventChats] 💬 New message detected in subscribed chat:', payload);
            // 新しいメッセージが追加されたらリストを更新
            fetchEventChats();
          }
        }
      )
      .subscribe();

    return () => {
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel);
      }
    };
  }, [chatIds]);

  async function fetchEventChats() {
    console.log('[useEventChats] 🔄 Fetching event chats...');
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ログインが必要です');
      }
      console.log('[useEventChats] 👤 User ID:', user.id);

      // 1. 参加者として参加しているイベントのIDを取得
      const { data: participantData, error: participantError } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id)
        .is('left_at', null);

      if (participantError) throw participantError;

      const participantEventIds = participantData?.map((p) => p.event_id) || [];

      // 2. 自分がホストのイベントを取得
      const { data: hostEventsData, error: hostError } = await supabase
        .from('posts_events')
        .select(
          `
          id,
          title,
          start_at,
          photos,
          resorts(id, name)
        `
        )
        .eq('host_user_id', user.id);

      if (hostError) throw hostError;

      const hostEvents = hostEventsData || [];
      const hostEventIds = hostEvents?.map((e) => e.id) || [];

      // 3. 自分がホストのイベントのうち、参加者が存在するもののみをフィルタリング
      const hostEventIdsWithParticipants: string[] = [];

      if (hostEventIds.length > 0) {
        const { data: participantsInHostEvents, error: participantsError } = await supabase
          .from('event_participants')
          .select('event_id')
          .in('event_id', hostEventIds)
          .is('left_at', null);

        if (participantsError) throw participantsError;

        // 重複を除いて参加者が存在するホストイベントのIDを取得
        const eventIdsSet = new Set(participantsInHostEvents?.map((p) => p.event_id) || []);
        hostEventIdsWithParticipants.push(...Array.from(eventIdsSet));
      }

      console.log('[useEventChats] 📊 Event IDs statistics:', {
        participantEventIds: participantEventIds.length,
        hostEventIds: hostEventIds.length,
        hostEventIdsWithParticipants: hostEventIdsWithParticipants.length,
      });

      // 4. 統合（参加者として参加しているイベント + 参加者が存在するホストイベント）
      const allEventIds = [...new Set([...participantEventIds, ...hostEventIdsWithParticipants])];

      if (allEventIds.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      // チャットルームを取得
      const { data: chatData, error: chatError } = await supabase
        .from('event_chats')
        .select(
          `
          id,
          event_id,
          created_at,
          posts_events(
            id,
            title,
            start_at,
            photos,
            resorts(id, name)
          )
        `
        )
        .in('event_id', allEventIds);

      if (chatError) throw chatError;

      // チャットが存在するイベントのみを処理
      const allChats = chatData || [];

      // チャットIDのリストを保存（リアルタイムサブスクリプション用）
      const currentChatIds = allChats.map((chat: any) => chat.id);
      setChatIds(currentChatIds);

      // 各チャットのメッセージと参加者を取得
      const chatsWithMessages = await Promise.all(
        allChats.map(async (chat: any) => {
          // 最新のメッセージを1件取得
          const { data: messagesData } = await supabase
            .from('event_messages')
            .select(
              `
              id,
              chat_id,
              sender_user_id,
              content_text,
              created_at,
              sender:users!event_messages_sender_user_id_fkey(
                id,
                profiles(user_id, display_name, avatar_url)
              )
            `
            )
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const messages = messagesData || [];

          // イベントのホスト情報を取得
          const { data: hostData } = await supabase
            .from('posts_events')
            .select('host_user_id')
            .eq('id', chat.event_id)
            .single();

          // 参加者情報を取得（ホストを除く、最大3人）
          const { data: participantsData } = await supabase
            .from('event_participants')
            .select(
              `
              user_id,
              users!event_participants_user_id_fkey(
                id,
                role,
                profiles(
                  user_id,
                  display_name,
                  avatar_url
                )
              )
            `
            )
            .eq('event_id', chat.event_id)
            .neq('user_id', hostData?.host_user_id || '')
            .is('left_at', null)
            .limit(3);

          const participants = (participantsData || []).map((p: any) => ({
            userId: p.user_id,
            displayName: p.users?.profiles?.display_name || null,
            avatarUrl: p.users?.profiles?.avatar_url || null,
            role: p.users?.role || 'user',
          }));

          // event_imagesストレージから画像URLを取得
          const photoUrls: string[] = [];
          if (chat.posts_events?.photos && chat.posts_events.photos.length > 0) {
            for (const photoPath of chat.posts_events.photos) {
              // 既にフルURLの場合はそのまま使用
              if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
                photoUrls.push(photoPath);
              } else {
                const { data } = supabase.storage
                  .from('event_images')
                  .getPublicUrl(photoPath);
                photoUrls.push(data.publicUrl);
              }
            }
          }

          const eventChat: EventChat = {
            id: chat.id,
            eventId: chat.event_id,
            eventTitle: chat.posts_events?.title || 'Unknown Event',
            eventResortName: chat.posts_events?.resorts?.name || null,
            eventStartAt: chat.posts_events?.start_at || new Date().toISOString(),
            eventPhotos: photoUrls,
            messages: messages.map((msg: any) => ({
              id: msg.id,
              chatId: msg.chat_id,
              senderUserId: msg.sender_user_id,
              senderName: msg.sender?.profiles?.display_name || 'Unknown',
              senderAvatar: msg.sender?.profiles?.avatar_url || null,
              contentText: msg.content_text,
              contentImageUrl: null,
              createdAt: msg.created_at,
            })),
            participants,
          };

          return eventChat;
        })
      );

      // 最新のメッセージ順にソート（メッセージがないチャットは最後）
      const sortedChats = chatsWithMessages.sort((a, b) => {
        const aLastMessage = a.messages[0];
        const bLastMessage = b.messages[0];

        // メッセージがない場合は最後に
        if (!aLastMessage && !bLastMessage) return 0;
        if (!aLastMessage) return 1;
        if (!bLastMessage) return -1;

        // 最新のメッセージが新しい順
        return new Date(bLastMessage.createdAt).getTime() - new Date(aLastMessage.createdAt).getTime();
      });

      console.log('[useEventChats] ✅ Fetched and sorted chats:', {
        totalChats: sortedChats.length,
        chatsWithMessages: sortedChats.filter(c => c.messages.length > 0).length,
        topChatLastMessage: sortedChats[0]?.messages[0]?.contentText?.substring(0, 30),
        topChatLastMessageTime: sortedChats[0]?.messages[0]?.createdAt,
      });

      setChats(sortedChats);
    } catch (err: any) {
      console.error('Fetch event chats error:', err);
      setError(err.message || 'チャットの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return { chats, loading, error, refetch: fetchEventChats };
}
