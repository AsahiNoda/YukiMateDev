-- ============================================================
-- チャンネルの「オープン」「プライベート」と参加リクエスト【提案】
-- ------------------------------------------------------------
--   オープン（is_public = true）   … 誰でもすぐ参加できる（今まで通り）
--   プライベート（is_public = false）… 「見つける」には出るが、投稿とメンバーはメンバーだけが見られる。
--                                    参加はリクエスト → オーナー・モデレーターが承認
--
-- リクエストはチャットタブの「リクエスト」に、イベントの参加申請と並んで届く。
--
--   - channel_join_requests：1人1チャンネルにつき1行（再リクエストは同じ行を pending に戻す）
--   - 申請 request_channel_join / 承認・見送り respond_channel_join_request（どちらも SECURITY DEFINER）
--   - 取り消しは自分の pending の行を DELETE
--   - 見送られた人は同じチャンネルにもう一度リクエストできない（イベントの申請と同じ）
--   - 外された人（channel_bans）はリクエストできない
--
-- 20261122000000_theme_channels.sql のあとに適用する。再実行しても安全。
-- ============================================================

-- ---------- プライベートのチャンネルも一覧に出す ----------
-- 投稿・リアクション・メンバー一覧は can_view_channel（オープン or メンバー）のままなので、
-- プライベートの中身はメンバーにしか見えない
DROP POLICY IF EXISTS channels_select ON public.channels;
CREATE POLICY channels_select ON public.channels FOR SELECT
  USING (
    archived_at IS NULL
    OR owner_user_id = auth.uid()
    OR public.channel_role(id, auth.uid()) IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS channels_listed_idx ON public.channels (member_count DESC) WHERE archived_at IS NULL;

-- ---------- 参加リクエスト ----------
CREATE TABLE IF NOT EXISTS public.channel_join_requests (
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS channel_join_requests_pending_idx
  ON public.channel_join_requests (channel_id, created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS channel_join_requests_user_idx ON public.channel_join_requests (user_id);

ALTER TABLE public.channel_join_requests ENABLE ROW LEVEL SECURITY;

-- 見られるのは本人と、そのチャンネルのオーナー・モデレーター
DROP POLICY IF EXISTS channel_join_requests_select ON public.channel_join_requests;
CREATE POLICY channel_join_requests_select ON public.channel_join_requests FOR SELECT
  USING (user_id = auth.uid() OR public.channel_role(channel_id, auth.uid()) IN ('owner', 'moderator'));

-- 取り消し：自分の pending だけ（追加・更新は下の関数から）
DROP POLICY IF EXISTS channel_join_requests_cancel_own ON public.channel_join_requests;
CREATE POLICY channel_join_requests_cancel_own ON public.channel_join_requests FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');

-- ---------- 申請 ----------
CREATE OR REPLACE FUNCTION public.request_channel_join(p_channel uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid();
  v_public boolean;
  v_status text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = 'P0001';
  END IF;
  SELECT is_public INTO v_public FROM public.channels WHERE id = p_channel AND archived_at IS NULL;
  IF v_public IS NULL THEN
    RAISE EXCEPTION 'channel_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_public THEN
    RAISE EXCEPTION 'channel_is_open' USING ERRCODE = 'P0001';
  END IF;
  IF public.channel_role(p_channel, v_me) IS NOT NULL THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.channel_bans WHERE channel_id = p_channel AND user_id = v_me) THEN
    RAISE EXCEPTION 'banned' USING ERRCODE = 'P0001';
  END IF;

  SELECT status INTO v_status FROM public.channel_join_requests WHERE channel_id = p_channel AND user_id = v_me;
  IF v_status = 'pending' THEN
    RETURN; -- もう申請中
  ELSIF v_status = 'rejected' THEN
    RAISE EXCEPTION 'request_rejected' USING ERRCODE = 'P0001';
  ELSIF v_status = 'approved' THEN
    -- 承認されたあとに抜けた人の再リクエスト
    UPDATE public.channel_join_requests
      SET status = 'pending', created_at = now(), responded_at = NULL, responded_by = NULL
      WHERE channel_id = p_channel AND user_id = v_me;
  ELSE
    INSERT INTO public.channel_join_requests (channel_id, user_id) VALUES (p_channel, v_me);
  END IF;
END $$;

-- ---------- 承認・見送り（オーナー・モデレーター） ----------
CREATE OR REPLACE FUNCTION public.respond_channel_join_request(p_channel uuid, p_user uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(public.channel_role(p_channel, auth.uid()), '') NOT IN ('owner', 'moderator') THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.channel_join_requests WHERE channel_id = p_channel AND user_id = p_user AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'request_not_found' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.channel_join_requests
    SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
        responded_at = now(),
        responded_by = auth.uid()
    WHERE channel_id = p_channel AND user_id = p_user;

  IF p_approve THEN
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (p_channel, p_user, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.request_channel_join(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_channel_join_request(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_channel_join(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_channel_join_request(uuid, uuid, boolean) TO authenticated;

-- ---------- Realtime（リクエストタブとバッジの更新） ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'channel_join_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_join_requests;
  END IF;
END $$;
