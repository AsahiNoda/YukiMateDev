-- ============================================================
-- プロフィール機能拡張 マイグレーション
-- Supabase SQL Editor で上から順に一括実行できます。
-- ※ 関数本体は $func$ で囲んでいます（$$ だと分割時に
--    "unterminated dollar-quoted string" エラーになるため）
-- ============================================================

-- 1) お気に入りスキー場（多対多）-------------------------------
CREATE TABLE IF NOT EXISTS public.favorite_resorts (
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resort_id  uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resort_id)
);

-- 既存 home_resort_id を移行
INSERT INTO public.favorite_resorts (user_id, resort_id)
SELECT user_id, home_resort_id
FROM public.profiles
WHERE home_resort_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.favorite_resorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favorite_resorts_select ON public.favorite_resorts;
CREATE POLICY favorite_resorts_select ON public.favorite_resorts
  FOR SELECT USING (true);                       -- 誰でも閲覧可

DROP POLICY IF EXISTS favorite_resorts_modify ON public.favorite_resorts;
CREATE POLICY favorite_resorts_modify ON public.favorite_resorts
  FOR ALL USING (auth.uid() = user_id)           -- 本人のみ追加/削除
  WITH CHECK (auth.uid() = user_id);

-- 2) SNSリンク -------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3) ユーザー評価（5段階絵文字リアクション）--------------------
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_reaction_kind') THEN
    CREATE TYPE user_reaction_kind AS ENUM
      ('super_happy','happy','neutral','unhappy','super_unhappy');
  END IF;
END
$do$;

CREATE TABLE IF NOT EXISTS public.user_reactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reactor_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction        user_reaction_kind NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reactor_user_id, target_user_id),       -- 1人1票（上書き可）
  CHECK  (reactor_user_id <> target_user_id)
);

ALTER TABLE public.user_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_reactions_select ON public.user_reactions;
CREATE POLICY user_reactions_select ON public.user_reactions
  FOR SELECT USING (true);                        -- 集計のため閲覧可

DROP POLICY IF EXISTS user_reactions_modify ON public.user_reactions;
CREATE POLICY user_reactions_modify ON public.user_reactions
  FOR ALL USING (auth.uid() = reactor_user_id)    -- 評価者本人のみ
  WITH CHECK (auth.uid() = reactor_user_id);

-- 集計関数（高評価率% と 平均スコア）--------------------------
CREATE OR REPLACE FUNCTION public.get_user_rating(target uuid)
RETURNS TABLE (total int, high int, high_pct numeric, avg_score numeric)
LANGUAGE sql
STABLE
AS $func$
  SELECT
    count(*)::int,
    count(*) FILTER (WHERE reaction IN ('super_happy','happy'))::int,
    round(100.0 * count(*) FILTER (WHERE reaction IN ('super_happy','happy'))
          / NULLIF(count(*), 0), 0),
    round(avg(CASE reaction
      WHEN 'super_happy'   THEN 5
      WHEN 'happy'         THEN 4
      WHEN 'neutral'       THEN 3
      WHEN 'unhappy'       THEN 2
      WHEN 'super_unhappy' THEN 1
    END), 2)
  FROM public.user_reactions
  WHERE target_user_id = target;
$func$;

-- 4) プロフィール投稿（インスタ風グリッド）----------------------
--    ※ コミュニティ投稿 feed_posts（ゲレンデ状態の共有）とは別物。
--      ユーザーが自分のプロフィールに投稿し、グリッドに並べる個人投稿。
--      まずは写真のみ（動画は将来対応）。
CREATE TABLE IF NOT EXISTS public.profile_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photos     text[] NOT NULL DEFAULT '{}'::text[],   -- 1枚以上の写真URL
  caption    text,
  resort_id  uuid REFERENCES public.resorts(id),     -- 任意：スノボ文脈の差別化用
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_posts_user_id_created_at_idx
  ON public.profile_posts (user_id, created_at DESC);

ALTER TABLE public.profile_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_posts_select ON public.profile_posts;
CREATE POLICY profile_posts_select ON public.profile_posts
  FOR SELECT USING (true);                           -- 誰でも閲覧可

DROP POLICY IF EXISTS profile_posts_modify ON public.profile_posts;
CREATE POLICY profile_posts_modify ON public.profile_posts
  FOR ALL USING (auth.uid() = user_id)               -- 本人のみ投稿/編集/削除
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ※ 別途: Supabase Storage に画像用バケット
--   "profile_posts"（public）を作成してください（SQLでは作れません）。
-- ============================================================
