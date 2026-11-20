-- ============================================================
-- 運営ダッシュボード（Supabase Studio で見る）【提案】
-- ------------------------------------------------------------
-- 運営用のものはすべて admin スキーマにまとめる。
--   - Studio の Table Editor で、左上のスキーマ選択を「admin」にすると一覧で出る
--   - admin スキーマは API（アプリ）に公開しない：anon / authenticated からは見えない・呼べない
--     （Project Settings → API → Exposed schemas に admin を足さないこと）
--
-- 見るもの（ビュー）
--   admin.summary          … 今の状況が1行で：未対応の通報・問い合わせ、ユーザー数など
--   admin.daily_stats      … 日ごとの数（直近60日、日本時間）：登録・イベント・投稿・通報・問い合わせ
--   admin.reports_inbox    … 通報を「対象ごと」にまとめたもの（未対応が多い順）
--   admin.reports_all      … 通報1件ずつ（通報した人・理由・状態）
--   admin.inquiries_inbox  … 問い合わせ（未対応が先）
--   admin.users_overview   … ユーザー一覧（メール・最終ログイン・投稿数・通報された数・停止中か）
--   admin.moderation_log   … 運営が行った対応の履歴
--
-- すること（SQL Editor から呼ぶ関数）
--   select admin.close_reports('event', '<対象のID>', 'closed', '対応メモ');   -- 通報を対応済みに
--   select admin.suspend_user('<ユーザーID>', 7, '理由');                      -- 7日間ログインできなくする
--   select admin.unsuspend_user('<ユーザーID>', '理由');                       -- 停止を解除
--   select admin.set_inquiry_status('<問い合わせID>', 'resolved', 'メモ');     -- 問い合わせの状態
--
-- 利用停止は Supabase Auth の auth.users.banned_until を使う（ログインとトークン更新ができなくなる）。
-- すでに持っているトークンは期限（既定1時間）まで使えるので、即時に止めたい投稿は Table Editor で消す。
--
-- 20261122000000_theme_channels.sql のあとに適用する（channels / channel_posts を参照する）。
-- 再実行しても安全（CREATE OR REPLACE / IF NOT EXISTS）。
-- ============================================================

CREATE SCHEMA IF NOT EXISTS admin;
REVOKE ALL ON SCHEMA admin FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA admin TO postgres, service_role;
-- これから作るものも、アプリのロールからは使えないように
ALTER DEFAULT PRIVILEGES IN SCHEMA admin REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA admin REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- ---------- 対応の履歴 ----------
CREATE TABLE IF NOT EXISTS admin.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,          -- close_reports / suspend_user / unsuspend_user / inquiry_status
  target_type text NOT NULL,     -- report の target_type、または 'user' / 'inquiry'
  target_id uuid NOT NULL,
  detail text,                   -- 状態・日数など
  note text,                     -- 運営のメモ
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_actions_target_idx ON admin.moderation_actions (target_type, target_id);

-- ---------- 通報の対象の中身（種類ごとにタイトル・本文と持ち主を引く） ----------
CREATE OR REPLACE VIEW admin.report_targets AS
SELECT DISTINCT ON (r.target_type, r.target_id)
  r.target_type,
  r.target_id,
  CASE r.target_type
    WHEN 'user' THEN pu.display_name
    WHEN 'event' THEN e.title
    WHEN 'post' THEN left(fp.text, 120)
    WHEN 'comment' THEN left(fc.text, 120)
    WHEN 'spot' THEN s.title
    WHEN 'channel' THEN ch.name
    WHEN 'channel_post' THEN coalesce(left(cp.body, 120), '（写真のみ）')
  END AS target_summary,
  CASE r.target_type
    WHEN 'user' THEN r.target_id
    WHEN 'event' THEN e.host_user_id
    WHEN 'post' THEN fp.user_id
    WHEN 'comment' THEN fc.user_id
    WHEN 'channel' THEN ch.owner_user_id
    WHEN 'channel_post' THEN cp.user_id
  END AS owner_user_id,
  -- 対象がもう無い（削除済み・アーカイブ済み）か
  CASE r.target_type
    WHEN 'user' THEN pu.user_id IS NULL
    WHEN 'event' THEN e.id IS NULL
    WHEN 'post' THEN fp.id IS NULL
    WHEN 'comment' THEN fc.id IS NULL
    WHEN 'spot' THEN s.id IS NULL
    WHEN 'channel' THEN ch.id IS NULL OR ch.archived_at IS NOT NULL
    WHEN 'channel_post' THEN cp.id IS NULL OR cp.deleted_at IS NOT NULL
  END AS target_gone
FROM public.reports r
LEFT JOIN public.profiles pu ON r.target_type = 'user' AND pu.user_id = r.target_id
LEFT JOIN public.posts_events e ON r.target_type = 'event' AND e.id = r.target_id
LEFT JOIN public.feed_posts fp ON r.target_type = 'post' AND fp.id = r.target_id
LEFT JOIN public.feed_comments fc ON r.target_type = 'comment' AND fc.id = r.target_id
LEFT JOIN public.spots s ON r.target_type = 'spot' AND s.id = r.target_id
LEFT JOIN public.channels ch ON r.target_type = 'channel' AND ch.id = r.target_id
LEFT JOIN public.channel_posts cp ON r.target_type = 'channel_post' AND cp.id = r.target_id;

-- ---------- 通報：対象ごと ----------
CREATE OR REPLACE VIEW admin.reports_inbox AS
SELECT
  r.target_type,
  r.target_id,
  t.target_summary,
  op.display_name AS owner_name,
  t.owner_user_id,
  t.target_gone,
  count(*) FILTER (WHERE r.status = 'open') AS open_reports,
  count(DISTINCT r.reporter_user_id) AS reporters,
  count(*) AS total_reports,
  string_agg(DISTINCT r.reason, ' / ') AS reasons,
  min(r.created_at) AS first_reported_at,
  max(r.created_at) AS last_reported_at,
  -- 規約で「24時間以内に確認」と約束している。未対応で一番古いものからの経過時間
  now() - min(r.created_at) FILTER (WHERE r.status = 'open') AS oldest_open_age
FROM public.reports r
LEFT JOIN admin.report_targets t ON t.target_type = r.target_type AND t.target_id = r.target_id
LEFT JOIN public.profiles op ON op.user_id = t.owner_user_id
GROUP BY r.target_type, r.target_id, t.target_summary, op.display_name, t.owner_user_id, t.target_gone
ORDER BY open_reports DESC, last_reported_at DESC;

-- ---------- 通報：1件ずつ ----------
CREATE OR REPLACE VIEW admin.reports_all AS
SELECT
  r.id,
  r.created_at,
  r.status,
  r.target_type,
  r.target_id,
  t.target_summary,
  r.reason,
  rp.display_name AS reporter_name,
  r.reporter_user_id,
  r.handled_by
FROM public.reports r
LEFT JOIN admin.report_targets t ON t.target_type = r.target_type AND t.target_id = r.target_id
LEFT JOIN public.profiles rp ON rp.user_id = r.reporter_user_id
ORDER BY (r.status = 'open') DESC, r.created_at DESC;

-- ---------- 問い合わせ ----------
CREATE OR REPLACE VIEW admin.inquiries_inbox AS
SELECT
  i.id,
  i.created_at,
  i.status,
  i.category,
  i.body,
  p.display_name AS user_name,
  au.email AS user_email,
  i.user_id,
  i.updated_at,
  now() - i.created_at AS age
FROM public.inquiries i
LEFT JOIN public.profiles p ON p.user_id = i.user_id
LEFT JOIN auth.users au ON au.id = i.user_id
ORDER BY (i.status IN ('open', 'in_progress')) DESC, i.created_at DESC;

-- ---------- ユーザー ----------
CREATE OR REPLACE VIEW admin.users_overview AS
SELECT
  u.id AS user_id,
  p.display_name,
  au.email,
  u.role,
  u.created_at,
  au.last_sign_in_at,
  au.banned_until,
  (au.banned_until IS NOT NULL AND au.banned_until > now()) AS suspended,
  (SELECT count(*) FROM public.posts_events e WHERE e.host_user_id = u.id) AS events_hosted,
  (SELECT count(*) FROM public.feed_posts fp WHERE fp.user_id = u.id) AS feed_posts,
  (SELECT count(*) FROM public.channel_posts cp WHERE cp.user_id = u.id AND cp.deleted_at IS NULL) AS channel_posts,
  -- 本人・本人の投稿などが通報された件数（未対応）
  (SELECT count(*) FROM public.reports r
     JOIN admin.report_targets t ON t.target_type = r.target_type AND t.target_id = r.target_id
     WHERE t.owner_user_id = u.id AND r.status = 'open') AS open_reports_against,
  (SELECT count(*) FROM public.reports r WHERE r.reporter_user_id = u.id) AS reports_filed
FROM public.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN auth.users au ON au.id = u.id
ORDER BY u.created_at DESC;

-- ---------- 日ごとの数（直近60日・日本時間） ----------
CREATE OR REPLACE VIEW admin.daily_stats AS
WITH days AS (
  SELECT generate_series(
    (now() AT TIME ZONE 'Asia/Tokyo')::date - 59,
    (now() AT TIME ZONE 'Asia/Tokyo')::date,
    interval '1 day'
  )::date AS day
)
SELECT
  d.day,
  (SELECT count(*) FROM public.users x WHERE (x.created_at AT TIME ZONE 'Asia/Tokyo')::date = d.day) AS signups,
  (SELECT count(*) FROM public.posts_events x WHERE (x.created_at AT TIME ZONE 'Asia/Tokyo')::date = d.day) AS events_created,
  (SELECT count(*) FROM public.event_applications x WHERE (x.created_at AT TIME ZONE 'Asia/Tokyo')::date = d.day) AS event_applications,
  (SELECT count(*) FROM public.feed_posts x WHERE (x.created_at AT TIME ZONE 'Asia/Tokyo')::date = d.day) AS feed_posts,
  (SELECT count(*) FROM public.channel_posts x WHERE (x.created_at AT TIME ZONE 'Asia/Tokyo')::date = d.day) AS channel_posts,
  (SELECT count(*) FROM public.reports x WHERE (x.created_at AT TIME ZONE 'Asia/Tokyo')::date = d.day) AS reports,
  (SELECT count(*) FROM public.inquiries x WHERE (x.created_at AT TIME ZONE 'Asia/Tokyo')::date = d.day) AS inquiries
FROM days d
ORDER BY d.day DESC;

-- ---------- 今の状況（1行） ----------
CREATE OR REPLACE VIEW admin.summary AS
SELECT
  (SELECT count(*) FROM public.reports WHERE status = 'open') AS open_reports,
  (SELECT count(DISTINCT (target_type, target_id)) FROM public.reports WHERE status = 'open') AS open_report_targets,
  (SELECT now() - min(created_at) FROM public.reports WHERE status = 'open') AS oldest_open_report_age,
  (SELECT count(*) FROM public.inquiries WHERE status IN ('open', 'in_progress')) AS open_inquiries,
  (SELECT count(*) FROM public.users) AS users_total,
  (SELECT count(*) FROM public.users WHERE created_at > now() - interval '7 days') AS users_new_7d,
  (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '7 days') AS users_active_7d,
  (SELECT count(*) FROM auth.users WHERE banned_until > now()) AS users_suspended,
  (SELECT count(*) FROM public.posts_events WHERE start_at > now() AND status::text <> 'cancelled') AS upcoming_events,
  (SELECT count(*) FROM public.channels WHERE archived_at IS NULL) AS active_channels;

-- ---------- 対応の履歴（見る用） ----------
CREATE OR REPLACE VIEW admin.moderation_log AS
SELECT a.created_at, a.action, a.target_type, a.target_id, a.detail, a.note
FROM admin.moderation_actions a
ORDER BY a.created_at DESC;

-- ============================================================
-- 対応の関数（SQL Editor から呼ぶ）
-- ============================================================

-- 対象への通報をまとめて対応済みにする（status：reviewed＝確認した／closed＝対応完了）
CREATE OR REPLACE FUNCTION admin.close_reports(p_target_type text, p_target_id uuid, p_status text DEFAULT 'closed', p_note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_status NOT IN ('reviewed', 'closed') THEN
    RAISE EXCEPTION 'status は reviewed か closed';
  END IF;
  UPDATE public.reports SET status = p_status
    WHERE target_type = p_target_type AND target_id = p_target_id AND status <> p_status;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  INSERT INTO admin.moderation_actions (action, target_type, target_id, detail, note)
  VALUES ('close_reports', p_target_type, p_target_id, p_status || ' ×' || v_count, p_note);
  RETURN v_count;
END $$;

-- 利用停止（日数）。ログインとトークンの更新ができなくなる
CREATE OR REPLACE FUNCTION admin.suspend_user(p_user uuid, p_days integer, p_note text DEFAULT NULL)
RETURNS timestamptz LANGUAGE plpgsql AS $$
DECLARE
  v_until timestamptz := now() + make_interval(days => p_days);
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    RAISE EXCEPTION '日数は1以上';
  END IF;
  UPDATE auth.users SET banned_until = v_until WHERE id = p_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ユーザーが見つかりません';
  END IF;
  INSERT INTO admin.moderation_actions (action, target_type, target_id, detail, note)
  VALUES ('suspend_user', 'user', p_user, p_days || '日（' || to_char(v_until AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD HH24:MI') || ' まで）', p_note);
  RETURN v_until;
END $$;

CREATE OR REPLACE FUNCTION admin.unsuspend_user(p_user uuid, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE auth.users SET banned_until = NULL WHERE id = p_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ユーザーが見つかりません';
  END IF;
  INSERT INTO admin.moderation_actions (action, target_type, target_id, detail, note)
  VALUES ('unsuspend_user', 'user', p_user, NULL, p_note);
END $$;

-- 問い合わせの状態（open / in_progress / resolved / closed）
CREATE OR REPLACE FUNCTION admin.set_inquiry_status(p_inquiry uuid, p_status text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.inquiries SET status = p_status, updated_at = now() WHERE id = p_inquiry;
  IF NOT FOUND THEN
    RAISE EXCEPTION '問い合わせが見つかりません';
  END IF;
  INSERT INTO admin.moderation_actions (action, target_type, target_id, detail, note)
  VALUES ('inquiry_status', 'inquiry', p_inquiry, p_status, p_note);
END $$;

-- 念のため、作ったものをアプリのロールから外す
REVOKE ALL ON ALL TABLES IN SCHEMA admin FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA admin FROM PUBLIC, anon, authenticated;
