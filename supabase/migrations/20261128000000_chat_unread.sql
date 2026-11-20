-- ============================================================
-- チャットの未読数（イベントのチャット・チャンネル）【提案】
-- ------------------------------------------------------------
--   chat_reads        … 自分がどこまで読んだか（1人 × 1チャットに1行。開いたときにアプリが更新）
--   get_unread_counts … 自分のチャットごとの未読数（自分以外の投稿で、読んだ時刻より後のもの）
--
-- まだ一度も開いていないチャットは、参加した時刻（チャンネル：joined_at、
-- イベント：参加した時刻／主催ならイベントを作った時刻）より後の投稿を未読として数える。
-- 抜けたイベント・中止したイベント・アーカイブしたチャンネルは数えない。
-- 再実行しても安全。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('event', 'channel')),
  -- event：posts_events.id、channel：channels.id
  target_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

ALTER TABLE public.chat_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_reads_own ON public.chat_reads;
CREATE POLICY chat_reads_own ON public.chat_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_unread_counts()
RETURNS TABLE(target_type text, target_id uuid, unread integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_events AS (
    -- 参加中のイベント（参加した時刻から）と、主催しているイベント（作った時刻から）
    SELECT event_id, min(since) AS since FROM (
      SELECT ep.event_id, ep.joined_at AS since
        FROM event_participants ep
        JOIN posts_events e ON e.id = ep.event_id AND e.status::text <> 'cancelled'
        WHERE ep.user_id = auth.uid() AND ep.left_at IS NULL
      UNION ALL
      SELECT e.id, e.created_at
        FROM posts_events e
        WHERE e.host_user_id = auth.uid() AND e.status::text <> 'cancelled'
    ) x
    GROUP BY event_id
  ),
  ev AS (
    SELECT 'event'::text AS target_type, me.event_id AS target_id, count(m.id)::int AS unread
      FROM my_events me
      JOIN event_chats c ON c.event_id = me.event_id
      JOIN event_messages m ON m.chat_id = c.id
      LEFT JOIN chat_reads r
        ON r.user_id = auth.uid() AND r.target_type = 'event' AND r.target_id = me.event_id
      WHERE m.sender_user_id <> auth.uid()
        AND m.created_at > coalesce(r.last_read_at, me.since)
      GROUP BY me.event_id
  ),
  ch AS (
    SELECT 'channel'::text AS target_type, cm.channel_id AS target_id, count(p.id)::int AS unread
      FROM channel_members cm
      JOIN channels chn ON chn.id = cm.channel_id AND chn.archived_at IS NULL
      JOIN channel_posts p ON p.channel_id = cm.channel_id AND p.deleted_at IS NULL
      LEFT JOIN chat_reads r
        ON r.user_id = auth.uid() AND r.target_type = 'channel' AND r.target_id = cm.channel_id
      WHERE cm.user_id = auth.uid()
        AND p.user_id <> auth.uid()
        AND p.created_at > coalesce(r.last_read_at, cm.joined_at)
      GROUP BY cm.channel_id
  )
  SELECT * FROM ev
  UNION ALL
  SELECT * FROM ch;
$$;

REVOKE ALL ON FUNCTION public.get_unread_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_counts() TO authenticated;
