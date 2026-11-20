-- ============================================================
-- ユーザー評価をイベントごとに残す【提案】
-- ------------------------------------------------------------
-- 今は user_reactions が「評価した人 × 評価された人」で1行だけ（UNIQUE）。
-- イベントのあとの振り返り（PostEventActionScreen）で同じ人を2回目に評価すると、
-- 前の評価が上書きされて件数が増えない（実データでも2件とも上書き済みだった）。
--
-- → event_id を足して「評価した人 × 評価された人 × イベント」で1行にする。
--   - 同じイベントの中で付け直したら上書き（今と同じ）
--   - 別のイベントでもう一度評価したら1件増える
--   - イベントなし（event_id が NULL）の評価も1人1件（NULLS NOT DISTINCT で NULL どうしも重複扱い）
--   - event_id には外部キーを付けない：終わったイベントが消えても評価は残す
--
-- 既に上書きされた過去の評価は戻せない（今ある行は event_id = NULL のまま残る）。
-- 適用してからアプリを更新すること（アプリは event_id を付けて保存するため）。
-- 再実行しても安全。
-- ============================================================

ALTER TABLE public.user_reactions ADD COLUMN IF NOT EXISTS event_id uuid;

ALTER TABLE public.user_reactions DROP CONSTRAINT IF EXISTS user_reactions_reactor_user_id_target_user_id_key;
ALTER TABLE public.user_reactions DROP CONSTRAINT IF EXISTS user_reactions_reactor_target_event_key;
ALTER TABLE public.user_reactions
  ADD CONSTRAINT user_reactions_reactor_target_event_key
  UNIQUE NULLS NOT DISTINCT (reactor_user_id, target_user_id, event_id);

-- get_user_rating は target_user_id の全行を数えるので変更不要（イベントごとの評価がそのまま加算される）
