-- ============================================================
-- パフォーマンス改善用インデックス
-- ------------------------------------------------------------
-- PostgreSQL は外部キーに自動でインデックスを作成しないため、
-- アプリが WHERE / ORDER BY で使う列にインデックスを追加する。
-- すべて IF NOT EXISTS なので、既に存在する場合は何もしない（再実行しても安全）。
-- ============================================================

-- ---------- event_participants ----------
-- イベントごとの参加者取得・参加者数カウント（left_at IS NULL のみ参照）
CREATE INDEX IF NOT EXISTS idx_event_participants_event_active
  ON public.event_participants (event_id)
  WHERE left_at IS NULL;
-- ユーザーの参加イベント一覧（最近参加順）
CREATE INDEX IF NOT EXISTS idx_event_participants_user_joined
  ON public.event_participants (user_id, joined_at DESC);

-- ---------- event_messages ----------
-- チャットごとの最新メッセージ取得・メッセージ一覧
CREATE INDEX IF NOT EXISTS idx_event_messages_chat_created
  ON public.event_messages (chat_id, created_at DESC);

-- ---------- event_applications ----------
CREATE INDEX IF NOT EXISTS idx_event_applications_event
  ON public.event_applications (event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_applications_applicant
  ON public.event_applications (applicant_user_id, status);

-- ---------- posts_events ----------
-- 募集中・今後のイベント一覧（Home / Discover / Explore）
CREATE INDEX IF NOT EXISTS idx_posts_events_status_start
  ON public.posts_events (status, start_at);
CREATE INDEX IF NOT EXISTS idx_posts_events_host
  ON public.posts_events (host_user_id);
CREATE INDEX IF NOT EXISTS idx_posts_events_resort
  ON public.posts_events (resort_id);

-- ---------- stars / blocks ----------
CREATE INDEX IF NOT EXISTS idx_stars_user
  ON public.stars (user_id);
CREATE INDEX IF NOT EXISTS idx_stars_target
  ON public.stars (target_user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_user
  ON public.blocks (user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked
  ON public.blocks (blocked_user_id);

-- ---------- feed ----------
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_created
  ON public.feed_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_resort_created
  ON public.feed_posts (resort_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_post
  ON public.feed_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post
  ON public.feed_comments (post_id);

-- ---------- profile_posts ----------
CREATE INDEX IF NOT EXISTS idx_profile_posts_user_created
  ON public.profile_posts (user_id, created_at DESC);

-- ---------- saved_events ----------
CREATE INDEX IF NOT EXISTS idx_saved_events_user
  ON public.saved_events (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_event
  ON public.saved_events (event_id);

-- ---------- notifications ----------
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user
  ON public.notification_tokens (user_id);

-- ---------- user_reactions ----------
CREATE INDEX IF NOT EXISTS idx_user_reactions_target
  ON public.user_reactions (target_user_id);

-- ---------- resorts 関連 ----------
CREATE INDEX IF NOT EXISTS idx_weather_daily_cache_resort_date
  ON public.weather_daily_cache (resort_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_resort_ratings_resort
  ON public.resort_ratings (resort_id);
CREATE INDEX IF NOT EXISTS idx_favorite_resorts_resort
  ON public.favorite_resorts (resort_id);

-- ============================================================
-- チャット一覧用: 各チャットの最新メッセージを1回でまとめて取得する RPC
-- ------------------------------------------------------------
-- アプリはこれまでチャットごとに1クエリ発行していた（N+1）。
-- SECURITY INVOKER（既定）なので、呼び出しユーザーの RLS がそのまま適用される。
-- 未作成の環境でもアプリは従来方式にフォールバックするので、適用順は問わない。
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_latest_event_messages(p_event_ids uuid[])
RETURNS TABLE (
  id uuid,
  chat_id uuid,
  sender_user_id uuid,
  content_text text,
  created_at timestamptz,
  sender_display_name text,
  sender_avatar_url text
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (m.chat_id)
    m.id,
    m.chat_id,
    m.sender_user_id,
    m.content_text,
    m.created_at,
    p.display_name AS sender_display_name,
    p.avatar_url   AS sender_avatar_url
  FROM public.event_messages m
  JOIN public.event_chats c ON c.id = m.chat_id
  LEFT JOIN public.profiles p ON p.user_id = m.sender_user_id
  WHERE c.event_id = ANY (p_event_ids)
  ORDER BY m.chat_id, m.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_event_messages(uuid[]) TO authenticated;

-- 統計情報を更新してプランナーに新しいインデックスを認識させる
ANALYZE public.event_participants;
ANALYZE public.event_messages;
ANALYZE public.posts_events;
ANALYZE public.feed_posts;
