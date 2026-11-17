import { supabase, getAuthUser } from '@/lib/supabase';
import type { EventChat, EventMessage } from '@types';
import { useEffect, useRef, useState } from 'react';

/**
 * 参加中・主催中イベントのチャット一覧
 *
 * パフォーマンス上の工夫:
 * - 以前は「3クエリ + チャット数×3クエリ」を直列/並列で発行していたが、
 *   埋め込み取得と並列化で通信を2往復にまとめた
 * - 各チャットの最新メッセージは RPC get_latest_event_messages でまとめて取得
 *   （RPC 未作成の環境ではチャットごとの取得に自動でフォールバック）
 * - 新着メッセージのリアルタイム購読は自分のチャットIDだけにフィルタし、
 *   受信時は一覧全体を再取得せず該当チャットだけを更新する
 */

type LatestMessageRow = {
  id: string;
  chat_id: string;
  sender_user_id: string;
  content_text: string | null;
  created_at: string;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
};

const toPhotoUrls = (photos: string[] | null | undefined): string[] =>
  (photos || []).map((photoPath) =>
    photoPath.startsWith('http://') || photoPath.startsWith('https://')
      ? photoPath
      : supabase.storage.from('event_images').getPublicUrl(photoPath).data.publicUrl
  );

const toEventMessage = (row: LatestMessageRow): EventMessage => ({
  id: row.id,
  chatId: row.chat_id,
  senderUserId: row.sender_user_id,
  senderName: row.sender_display_name || 'Unknown',
  senderAvatar: row.sender_avatar_url || null,
  contentText: row.content_text,
  contentImageUrl: null,
  createdAt: row.created_at,
});

/** 最新メッセージが新しい順（メッセージがないチャットは最後） */
const sortChats = (chats: EventChat[]): EventChat[] =>
  [...chats].sort((a, b) => {
    const aLast = a.messages[0];
    const bLast = b.messages[0];
    if (!aLast && !bLast) return 0;
    if (!aLast) return 1;
    if (!bLast) return -1;
    return new Date(bLast.createdAt).getTime() - new Date(aLast.createdAt).getTime();
  });

/** 各チャットの最新メッセージを取得（RPC → 失敗時はチャットごとにフォールバック） */
async function fetchLatestMessages(
  eventIds: string[],
  getChatIds: () => Promise<string[]>
): Promise<Map<string, LatestMessageRow>> {
  const result = new Map<string, LatestMessageRow>();

  const { data, error } = await supabase.rpc('get_latest_event_messages' as any, {
    p_event_ids: eventIds,
  } as any);

  if (!error && Array.isArray(data)) {
    (data as LatestMessageRow[]).forEach((row) => result.set(row.chat_id, row));
    return result;
  }

  // フォールバック: RPC 未作成（マイグレーション未適用）の場合
  console.warn('[useEventChats] get_latest_event_messages RPC unavailable, falling back:', error?.message);
  const chatIds = await getChatIds();
  await Promise.all(
    chatIds.map(async (chatId) => {
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
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1);

      const msg: any = messagesData?.[0];
      if (msg) {
        result.set(chatId, {
          id: msg.id,
          chat_id: msg.chat_id,
          sender_user_id: msg.sender_user_id,
          content_text: msg.content_text,
          created_at: msg.created_at,
          sender_display_name: msg.sender?.profiles?.display_name ?? null,
          sender_avatar_url: msg.sender?.profiles?.avatar_url ?? null,
        });
      }
    })
  );
  return result;
}

export function useEventChats() {
  const [chats, setChats] = useState<EventChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatIds, setChatIds] = useState<string[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchEventChats();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // リアルタイムサブスクリプション: 参加状態の変更を監視
  useEffect(() => {
    let participantsChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function setupParticipantsSubscription() {
      const {
        data: { user },
      } = await getAuthUser();
      if (!user || cancelled) return;

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
          () => {
            // 参加状態が変更されたらリストを再取得
            fetchEventChats({ silent: true });
          }
        )
        .subscribe();
    }

    setupParticipantsSubscription();

    return () => {
      cancelled = true;
      if (participantsChannel) {
        supabase.removeChannel(participantsChannel);
      }
    };
  }, []);

  // リアルタイムサブスクリプション: 自分のチャットの新着メッセージだけを監視
  const chatIdsKey = chatIds.join(',');
  useEffect(() => {
    if (chatIds.length === 0) return;

    const chatIdSet = new Set(chatIds);

    // 以前はフィルタ無しで全チャットのメッセージを受信していた（全ユーザー分が届く）
    // Realtime の in フィルタは最大100件まで
    const filter = chatIds.length <= 100 ? `chat_id=in.(${chatIds.join(',')})` : undefined;

    const messagesChannel = supabase
      .channel('event-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_messages',
          ...(filter ? { filter } : {}),
        },
        async (payload) => {
          const newMessage = payload.new as {
            id: string;
            chat_id: string;
            sender_user_id: string;
            content_text: string | null;
            created_at: string;
          };
          if (!chatIdSet.has(newMessage.chat_id)) return;

          // 一覧全体を再取得せず、送信者情報だけ取得して該当チャットを更新
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', newMessage.sender_user_id)
            .maybeSingle();

          if (!isMountedRef.current) return;

          const message = toEventMessage({
            ...newMessage,
            sender_display_name: senderProfile?.display_name ?? null,
            sender_avatar_url: senderProfile?.avatar_url ?? null,
          });

          setChats((prev) =>
            sortChats(prev.map((chat) => (chat.id === message.chatId ? { ...chat, messages: [message] } : chat)))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
    // chatIds の中身が変わったときだけ再購読する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatIdsKey]);

  async function fetchEventChats(options: { silent?: boolean } = {}) {
    try {
      if (!options.silent) setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await getAuthUser();
      if (!user) {
        throw new Error('ログインが必要です');
      }

      // 1〜3. 参加中のイベント と 主催イベント（参加者は埋め込み取得）を並列取得
      const [participantRes, hostRes] = await Promise.all([
        supabase.from('event_participants').select('event_id').eq('user_id', user.id).is('left_at', null),
        supabase.from('posts_events').select('id, event_participants(user_id, left_at)').eq('host_user_id', user.id),
      ]);

      if (participantRes.error) throw participantRes.error;
      if (hostRes.error) throw hostRes.error;

      const participantEventIds = participantRes.data?.map((p) => p.event_id) || [];

      // 主催イベントのうち、参加者が存在するもののみ
      const hostEventIdsWithParticipants = ((hostRes.data || []) as any[])
        .filter((e) => (e.event_participants || []).some((p: any) => p.left_at === null))
        .map((e) => e.id as string);

      // 4. 統合（参加者として参加しているイベント + 参加者が存在するホストイベント）
      const allEventIds = [...new Set([...participantEventIds, ...hostEventIdsWithParticipants])];

      if (allEventIds.length === 0) {
        if (isMountedRef.current) {
          setChats([]);
          setChatIds([]);
        }
        return;
      }

      // チャットルーム（イベント情報・参加者を埋め込み）と最新メッセージを並列取得
      // ※ PostgREST のビルダーは await のたびにリクエストを送るため、Promise.resolve で1回だけ実行させる
      const chatsPromise = Promise.resolve(supabase
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
            host_user_id,
            status,
            resorts(id, name),
            event_participants(
              user_id,
              left_at,
              users!event_participants_user_id_fkey(
                id,
                role,
                profiles(
                  user_id,
                  display_name,
                  avatar_url
                )
              )
            )
          )
        `
        )
        .in('event_id', allEventIds));

      const [chatRes, latestMessages] = await Promise.all([
        chatsPromise,
        fetchLatestMessages(allEventIds, async () => {
          const { data } = await chatsPromise;
          return ((data || []) as any[]).map((c) => c.id as string);
        }),
      ]);

      if (chatRes.error) throw chatRes.error;

      // 中止したイベントのチャットは一覧に出さない
      const allChats = ((chatRes.data || []) as any[]).filter((chat) => {
        const ev = Array.isArray(chat.posts_events) ? chat.posts_events[0] : chat.posts_events;
        return ev?.status !== 'cancelled';
      });

      const eventChats: EventChat[] = allChats.map((chat) => {
        const event = chat.posts_events;
        const latest = latestMessages.get(chat.id);

        // 参加者情報（ホストを除く、最大3人）
        const participants = ((event?.event_participants || []) as any[])
          .filter((p) => p.left_at === null && p.user_id !== event?.host_user_id)
          .slice(0, 3)
          .map((p) => ({
            userId: p.user_id,
            displayName: p.users?.profiles?.display_name || null,
            avatarUrl: p.users?.profiles?.avatar_url || null,
            role: p.users?.role || 'user',
          }));

        return {
          id: chat.id,
          eventId: chat.event_id,
          eventTitle: event?.title || 'Unknown Event',
          eventResortName: event?.resorts?.name || null,
          eventStartAt: event?.start_at || new Date().toISOString(),
          eventPhotos: toPhotoUrls(event?.photos),
          messages: latest ? [toEventMessage(latest)] : [],
          participants,
        };
      });

      if (!isMountedRef.current) return;

      // チャットIDのリストを保存（リアルタイムサブスクリプション用）
      setChatIds(eventChats.map((c) => c.id));
      setChats(sortChats(eventChats));
    } catch (err: any) {
      console.error('Fetch event chats error:', err);
      if (isMountedRef.current) {
        setError(err.message || 'チャットの取得に失敗しました');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }

  return { chats, loading, error, refetch: () => fetchEventChats() };
}
