import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

/**
 * チャットの未読数（イベントのチャット・チャンネル）。
 * スキーマ：supabase/migrations/20261128000000_chat_unread.sql（未適用のときは全部0）
 */

export type UnreadTarget = 'event' | 'channel';

export interface UnreadCounts {
  /** イベントID → 未読数 */
  byEvent: Map<string, number>;
  /** チャンネルID → 未読数 */
  byChannel: Map<string, number>;
  eventTotal: number;
  channelTotal: number;
}

const EMPTY: UnreadCounts = { byEvent: new Map(), byChannel: new Map(), eventTotal: 0, channelTotal: 0 };

export const unreadKey = (userId?: string) => ['unread', userId] as const;

async function fetchUnread(): Promise<UnreadCounts> {
  const { data, error } = await supabase.rpc('get_unread_counts' as any);
  if (error || !Array.isArray(data)) return EMPTY;
  const byEvent = new Map<string, number>();
  const byChannel = new Map<string, number>();
  for (const row of data as { target_type: UnreadTarget; target_id: string; unread: number }[]) {
    if (!row.unread) continue;
    (row.target_type === 'event' ? byEvent : byChannel).set(row.target_id, row.unread);
  }
  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
  return { byEvent, byChannel, eventTotal: sum(byEvent), channelTotal: sum(byChannel) };
}

/**
 * 未読数。新しいメッセージ・投稿が届いたら（Realtime）取り直す。
 * タブバーとチャットタブで同じキャッシュを使う。
 */
export function useUnreadCounts(): UnreadCounts {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const channelName = useRef(`unread_${Math.random().toString(36).slice(2)}`).current;

  const query = useQuery({
    queryKey: unreadKey(userId),
    queryFn: fetchUnread,
    enabled: !!userId,
    staleTime: 1000 * 15,
  });

  useEffect(() => {
    if (!userId) return;
    // 届いた行は RLS で自分が見られるものだけ。数え直しはサーバーの関数に任せる
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: unreadKey(userId) }), 400);
    };
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_messages' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channel_posts' }, refresh)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, channelName, queryClient]);

  return query.data ?? EMPTY;
}

/**
 * 開いているチャットを「ここまで読んだ」にする。
 * 開いたとき・新しいメッセージが届いたとき・閉じたときに呼ぶ。
 */
export function useMarkChatRead(type: UnreadTarget, targetId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!userId || !targetId) return;
    // 先に手元の数を0にして、バッジがすぐ消えるようにする
    queryClient.setQueryData<UnreadCounts>(unreadKey(userId), (prev) => {
      if (!prev) return prev;
      const byEvent = new Map(prev.byEvent);
      const byChannel = new Map(prev.byChannel);
      (type === 'event' ? byEvent : byChannel).delete(targetId);
      const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
      return { byEvent, byChannel, eventTotal: sum(byEvent), channelTotal: sum(byChannel) };
    });
    await supabase
      .from('chat_reads' as any)
      .upsert(
        { user_id: userId, target_type: type, target_id: targetId, last_read_at: new Date().toISOString() } as any,
        { onConflict: 'user_id,target_type,target_id' }
      );
  }, [userId, targetId, type, queryClient]);
}
