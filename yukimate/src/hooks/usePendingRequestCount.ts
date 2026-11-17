import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/** 届いたリクエスト数のキャッシュキー。承認・却下のあとに invalidate する */
export const pendingRequestsKey = (userId?: string) => ['pendingRequests', userId] as const;

async function fetchPendingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('event_applications')
    .select('id, posts_events!event_applications_event_id_fkey!inner(host_user_id, status)', {
      count: 'exact',
      head: true,
    })
    .eq('posts_events.host_user_id', userId)
    // 中止したイベントへの申請は数えない（チャットの「リクエスト」一覧と同じ）
    .neq('posts_events.status', 'cancelled')
    .eq('status', 'pending');
  if (error) throw error;
  return count ?? 0;
}

/**
 * 自分がホストのイベントに届いている、未対応（pending）の参加申請の件数。
 * タブバーの「チャット」バッジとホームの「届いたリクエスト」に使う。
 *
 * React Query で共有するので、承認・却下（useEventApplications）や画面に戻ったときの
 * invalidate で両方が同時に更新される。Realtime の購読は補助（届かない環境でも上の更新で直る）。
 *
 * TODO(ui-redesign): チャットの未読数もバッジに含める。今は既読の記録（last_read など）が
 * スキーマにないため、申請数だけを数えている（docs/ui-redesign/README.md「0. 進め方」5）。
 */
export function usePendingRequestCount(): number {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  // 同じ名前のチャンネルを2か所（タブバーとホーム）で作ると、片方の解除でもう片方も止まるので、呼び出しごとに名前を変える
  const channelName = useRef(`pending_requests_${Math.random().toString(36).slice(2)}`).current;

  const query = useQuery({
    queryKey: pendingRequestsKey(userId),
    queryFn: () => fetchPendingCount(userId!),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_applications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, channelName, queryClient]);

  return query.data ?? 0;
}
