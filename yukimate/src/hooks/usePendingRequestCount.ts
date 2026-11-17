import { getAuthUser, supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

/**
 * 自分がホストのイベントに届いている、未対応（pending）の参加申請の件数。
 * タブバーの「チャット」バッジに使う。
 *
 * TODO(ui-redesign): チャットの未読数もバッジに含める。今は既読の記録（last_read など）が
 * スキーマにないため、申請数だけを数えている（docs/ui-redesign/README.md「0. 進め方」5）。
 */
export function usePendingRequestCount(): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await getAuthUser();
      if (!user) {
        setCount(0);
        return;
      }

      const { count: pending, error } = await supabase
        .from('event_applications')
        .select('id, posts_events!event_applications_event_id_fkey!inner(host_user_id)', {
          count: 'exact',
          head: true,
        })
        .eq('posts_events.host_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setCount(pending ?? 0);
    } catch (error) {
      console.error('[usePendingRequestCount] failed to fetch', error);
    }
  }, []);

  useEffect(() => {
    fetchCount();

    // useEventApplications と同じテーブルを購読するが、チャンネル名は分ける
    const channel = supabase
      .channel('tab_bar_pending_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_applications' }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchCount]);

  return count;
}
