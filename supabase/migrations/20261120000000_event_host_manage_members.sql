-- ============================================================
-- 主催者がメンバーをイベントから外せるようにする【提案】
-- ------------------------------------------------------------
-- イベント詳細の参加者一覧（主催者のみ「…」→「このイベントから外す」）で、
--   1) event_participants の該当行に left_at を入れる（参加・グループチャットから外れる）
--   2) event_applications の該当行を rejected にする（同じイベントへの再申請を止める）
-- を主催者の端末から行う。どちらも「他人の行」の更新なので、主催者用の UPDATE ポリシーが要る。
-- 既に別名で同等のポリシーがある場合も、ポリシーは OR で効くので足して問題ない。
-- ENABLE ROW LEVEL SECURITY はしない（ポリシーを足すだけ）。再実行しても安全。
-- ============================================================

DROP POLICY IF EXISTS event_participants_update_by_host ON public.event_participants;
CREATE POLICY event_participants_update_by_host ON public.event_participants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts_events e
      WHERE e.id = event_participants.event_id AND e.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts_events e
      WHERE e.id = event_participants.event_id AND e.host_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS event_applications_update_by_host ON public.event_applications;
CREATE POLICY event_applications_update_by_host ON public.event_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts_events e
      WHERE e.id = event_applications.event_id AND e.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts_events e
      WHERE e.id = event_applications.event_id AND e.host_user_id = auth.uid()
    )
  );
