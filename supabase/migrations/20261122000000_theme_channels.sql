-- ============================================================
-- テーマ別チャンネル（誰でも開設できる、イベントとは別のチャット）【提案】
-- ------------------------------------------------------------
-- 種類（kind）
--   chat          … ふつうのチャット（文字・写真）
--   media_only    … 写真だけ（文字の投稿は不可）
--   reaction_only … オーナー・モデレーターだけが投稿し、ほかのメンバーはリアクションだけ
--
-- テーブル
--   channels / channel_members / channel_posts / channel_reactions / channel_bans
--
-- ルール（RLS とトリガー）
--   - 公開チャンネルは誰でも見られる。投稿・リアクションはメンバーだけ
--   - 開設は1人3つまで（アーカイブしたものは数えない）
--   - 投稿の削除は本人・オーナー・モデレーター（論理削除：delete_channel_post）
--   - メンバーを外すのはオーナー・モデレーター（remove_channel_member）。外された人は再参加できない
--   - 通報：reports.target_type に 'channel' と 'channel_post' を追加
--
-- 写真は既存の feed-post-images バケットの「自分のユーザーID/」の下に置く（新しいバケットは不要）。
-- 再実行しても安全なように IF NOT EXISTS / DROP ... IF EXISTS で書いている。
-- ============================================================

-- ---------- テーブル ----------
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  kind text NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat', 'media_only', 'reaction_only')),
  resort_id uuid REFERENCES public.resorts(id) ON DELETE SET NULL,
  is_public boolean NOT NULL DEFAULT true,
  member_count integer NOT NULL DEFAULT 0,
  last_post_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.channel_members (
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  muted_until timestamptz,
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.channel_bans (
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  banned_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.channel_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  body text CHECK (body IS NULL OR char_length(body) <= 2000),
  -- 写真の一覧：[{ "url": "...", "width": 1200, "height": 1600 }]
  media jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(media) = 'array' AND jsonb_array_length(media) <= 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.channel_reactions (
  post_id uuid NOT NULL REFERENCES public.channel_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  -- Realtime をチャンネル単位で絞るために持つ（トリガーで投稿のチャンネルに合わせる）
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '😮', '🙌', '❄️')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS channels_public_idx ON public.channels (member_count DESC) WHERE archived_at IS NULL AND is_public;
CREATE INDEX IF NOT EXISTS channels_owner_idx ON public.channels (owner_user_id);
CREATE INDEX IF NOT EXISTS channel_members_user_idx ON public.channel_members (user_id);
CREATE INDEX IF NOT EXISTS channel_posts_channel_idx ON public.channel_posts (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS channel_reactions_channel_idx ON public.channel_reactions (channel_id);

-- ---------- RLS から使う関数（RLS の再帰を避けるため SECURITY DEFINER） ----------
CREATE OR REPLACE FUNCTION public.channel_role(p_channel uuid, p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.channel_members WHERE channel_id = p_channel AND user_id = p_user
$$;

CREATE OR REPLACE FUNCTION public.can_view_channel(p_channel uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = p_channel
      AND (
        (c.is_public AND c.archived_at IS NULL)
        OR c.owner_user_id = p_user
        OR EXISTS (SELECT 1 FROM public.channel_members m WHERE m.channel_id = c.id AND m.user_id = p_user)
      )
  )
$$;

-- ---------- トリガー ----------
-- 開設は1人3つまで ＋ オーナーをメンバーに入れる
CREATE OR REPLACE FUNCTION public.channels_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.channels WHERE owner_user_id = NEW.owner_user_id AND archived_at IS NULL) >= 3 THEN
    RAISE EXCEPTION 'channel_limit_reached' USING ERRCODE = 'P0001';
  END IF;
  NEW.name := btrim(NEW.name);
  NEW.member_count := 0;
  NEW.last_post_at := NULL;
  NEW.archived_at := NULL;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.channels_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.channel_members (channel_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'owner')
  ON CONFLICT (channel_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS channels_before_insert ON public.channels;
CREATE TRIGGER channels_before_insert BEFORE INSERT ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.channels_before_insert();
DROP TRIGGER IF EXISTS channels_after_insert ON public.channels;
CREATE TRIGGER channels_after_insert AFTER INSERT ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.channels_after_insert();

-- オーナーが変えてよいのは名前・説明・公開・アーカイブだけ
CREATE OR REPLACE FUNCTION public.channels_before_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- アプリからの更新だけ制限する（メンバー数などはトリガー＝関数の所有者の権限で更新する）
  IF current_user = 'authenticated' THEN
    NEW.owner_user_id := OLD.owner_user_id;
    NEW.kind := OLD.kind;
    NEW.member_count := OLD.member_count;
    NEW.last_post_at := OLD.last_post_at;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS channels_before_update ON public.channels;
CREATE TRIGGER channels_before_update BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.channels_before_update();

-- メンバー数
CREATE OR REPLACE FUNCTION public.channel_members_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.channels SET member_count = member_count + 1 WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.channels SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS channel_members_count ON public.channel_members;
CREATE TRIGGER channel_members_count AFTER INSERT OR DELETE ON public.channel_members
  FOR EACH ROW EXECUTE FUNCTION public.channel_members_count();

-- 投稿の種類のルール（アプリ側でも同じチェックをしている）
CREATE OR REPLACE FUNCTION public.channel_posts_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_kind text;
  v_role text;
  v_muted timestamptz;
BEGIN
  SELECT kind INTO v_kind FROM public.channels WHERE id = NEW.channel_id AND archived_at IS NULL;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'channel_not_found' USING ERRCODE = 'P0001';
  END IF;
  SELECT role, muted_until INTO v_role, v_muted
    FROM public.channel_members WHERE channel_id = NEW.channel_id AND user_id = NEW.user_id;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'not_a_member' USING ERRCODE = 'P0001';
  END IF;
  IF v_muted IS NOT NULL AND v_muted > now() THEN
    RAISE EXCEPTION 'muted' USING ERRCODE = 'P0001';
  END IF;

  NEW.body := NULLIF(btrim(coalesce(NEW.body, '')), '');
  NEW.deleted_at := NULL;
  NEW.created_at := now();

  IF v_kind = 'media_only' THEN
    IF NEW.body IS NOT NULL OR jsonb_array_length(NEW.media) = 0 THEN
      RAISE EXCEPTION 'media_only' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_kind = 'reaction_only' AND v_role NOT IN ('owner', 'moderator') THEN
    RAISE EXCEPTION 'reaction_only' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.body IS NULL AND jsonb_array_length(NEW.media) = 0 THEN
    RAISE EXCEPTION 'empty_post' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS channel_posts_before_insert ON public.channel_posts;
CREATE TRIGGER channel_posts_before_insert BEFORE INSERT ON public.channel_posts
  FOR EACH ROW EXECUTE FUNCTION public.channel_posts_before_insert();

CREATE OR REPLACE FUNCTION public.channel_posts_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.channels SET last_post_at = NEW.created_at WHERE id = NEW.channel_id;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS channel_posts_after_insert ON public.channel_posts;
CREATE TRIGGER channel_posts_after_insert AFTER INSERT ON public.channel_posts
  FOR EACH ROW EXECUTE FUNCTION public.channel_posts_after_insert();

-- リアクションの channel_id を投稿のチャンネルに合わせる
CREATE OR REPLACE FUNCTION public.channel_reactions_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT channel_id INTO NEW.channel_id FROM public.channel_posts WHERE id = NEW.post_id AND deleted_at IS NULL;
  IF NEW.channel_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS channel_reactions_before_insert ON public.channel_reactions;
CREATE TRIGGER channel_reactions_before_insert BEFORE INSERT ON public.channel_reactions
  FOR EACH ROW EXECUTE FUNCTION public.channel_reactions_before_insert();

-- ---------- RLS ----------
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_reactions ENABLE ROW LEVEL SECURITY;

-- channels
DROP POLICY IF EXISTS channels_select ON public.channels;
-- 作成直後の RETURNING でも見えるよう、行の値で判定する（関数で channels を引くと新しい行が見えない）
CREATE POLICY channels_select ON public.channels FOR SELECT
  USING (
    (is_public AND archived_at IS NULL)
    OR owner_user_id = auth.uid()
    OR public.channel_role(id, auth.uid()) IS NOT NULL
  );
DROP POLICY IF EXISTS channels_insert_own ON public.channels;
CREATE POLICY channels_insert_own ON public.channels FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS channels_update_owner ON public.channels;
CREATE POLICY channels_update_owner ON public.channels FOR UPDATE
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- channel_members
DROP POLICY IF EXISTS channel_members_select ON public.channel_members;
CREATE POLICY channel_members_select ON public.channel_members FOR SELECT
  USING (public.can_view_channel(channel_id, auth.uid()));
DROP POLICY IF EXISTS channel_members_join ON public.channel_members;
CREATE POLICY channel_members_join ON public.channel_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
    AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = channel_members.channel_id AND c.is_public AND c.archived_at IS NULL)
    AND NOT EXISTS (SELECT 1 FROM public.channel_bans b WHERE b.channel_id = channel_members.channel_id AND b.user_id = auth.uid())
  );
-- 自分で抜ける（オーナーは抜けられない：アーカイブする）
DROP POLICY IF EXISTS channel_members_leave ON public.channel_members;
CREATE POLICY channel_members_leave ON public.channel_members FOR DELETE
  USING (user_id = auth.uid() AND role <> 'owner');
-- オーナーがモデレーターを任命・解除する
DROP POLICY IF EXISTS channel_members_update_owner ON public.channel_members;
CREATE POLICY channel_members_update_owner ON public.channel_members FOR UPDATE
  USING (public.channel_role(channel_id, auth.uid()) = 'owner' AND role <> 'owner')
  WITH CHECK (public.channel_role(channel_id, auth.uid()) = 'owner' AND role IN ('moderator', 'member'));

-- channel_bans（見るのはオーナー・モデレーターだけ。追加は remove_channel_member から）
DROP POLICY IF EXISTS channel_bans_select ON public.channel_bans;
CREATE POLICY channel_bans_select ON public.channel_bans FOR SELECT
  USING (public.channel_role(channel_id, auth.uid()) IN ('owner', 'moderator') OR user_id = auth.uid());

-- channel_posts（削除は delete_channel_post から。直接の UPDATE / DELETE は許可しない）
DROP POLICY IF EXISTS channel_posts_select ON public.channel_posts;
CREATE POLICY channel_posts_select ON public.channel_posts FOR SELECT
  USING (deleted_at IS NULL AND public.can_view_channel(channel_id, auth.uid()));
DROP POLICY IF EXISTS channel_posts_insert ON public.channel_posts;
CREATE POLICY channel_posts_insert ON public.channel_posts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.channel_role(channel_id, auth.uid()) IS NOT NULL);

-- channel_reactions
DROP POLICY IF EXISTS channel_reactions_select ON public.channel_reactions;
CREATE POLICY channel_reactions_select ON public.channel_reactions FOR SELECT
  USING (public.can_view_channel(channel_id, auth.uid()));
DROP POLICY IF EXISTS channel_reactions_insert ON public.channel_reactions;
CREATE POLICY channel_reactions_insert ON public.channel_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.channel_role(channel_id, auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS channel_reactions_delete_own ON public.channel_reactions;
CREATE POLICY channel_reactions_delete_own ON public.channel_reactions FOR DELETE
  USING (user_id = auth.uid());

-- ---------- 操作の関数 ----------
-- 投稿を消す（本人・オーナー・モデレーター）
CREATE OR REPLACE FUNCTION public.delete_channel_post(p_post uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_channel uuid;
  v_author uuid;
BEGIN
  SELECT channel_id, user_id INTO v_channel, v_author FROM public.channel_posts WHERE id = p_post AND deleted_at IS NULL;
  IF v_channel IS NULL THEN
    RAISE EXCEPTION 'post_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_author <> auth.uid() AND coalesce(public.channel_role(v_channel, auth.uid()), '') NOT IN ('owner', 'moderator') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.channel_posts SET deleted_at = now() WHERE id = p_post;
END $$;

-- メンバーを外す（オーナー・モデレーター。オーナーは外せない。モデレーター同士は外せない）
CREATE OR REPLACE FUNCTION public.remove_channel_member(p_channel uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_my_role text := public.channel_role(p_channel, auth.uid());
  v_target_role text := public.channel_role(p_channel, p_user);
BEGIN
  IF v_my_role NOT IN ('owner', 'moderator') OR v_target_role IS NULL OR v_target_role = 'owner'
     OR (v_my_role = 'moderator' AND v_target_role = 'moderator') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM public.channel_members WHERE channel_id = p_channel AND user_id = p_user;
  INSERT INTO public.channel_bans (channel_id, user_id, banned_by)
  VALUES (p_channel, p_user, auth.uid())
  ON CONFLICT (channel_id, user_id) DO NOTHING;
END $$;

REVOKE ALL ON FUNCTION public.delete_channel_post(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_channel_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_channel_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_channel_member(uuid, uuid) TO authenticated;

-- ---------- 通報の対象を増やす ----------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.reports'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%target_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.reports DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE public.reports ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN ('user', 'event', 'post', 'comment', 'spot', 'channel', 'channel_post'));

-- ---------- Realtime ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'channel_posts') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_posts;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'channel_reactions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_reactions;
    END IF;
  END IF;
END $$;
-- リアクションの取り消し（DELETE）も channel_id で絞って届くように
ALTER TABLE public.channel_reactions REPLICA IDENTITY FULL;
