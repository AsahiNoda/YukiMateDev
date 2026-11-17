-- ============================================================
-- イベントに「一人参加OK」を追加
-- ------------------------------------------------------------
-- UIリデザイン（yukimate/docs/ui-redesign）で使う：
--   - さがす（リスト・スワイプ）のカードの「一人参加OK」チップ
--   - ホームの「予定がないとき」の「一人参加OKのイベントが◯件」
-- 既存のイベントはすべて false（一人参加OKではない）になる。
-- IF NOT EXISTS なので再実行しても安全。
-- ============================================================

ALTER TABLE public.posts_events
  ADD COLUMN IF NOT EXISTS solo_ok boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.posts_events.solo_ok IS '一人での参加を歓迎するイベントか（ホストが作成時に設定）';

-- 「今週末・一人参加OK・ゲレンデ」で数える／絞り込むときのための部分インデックス
CREATE INDEX IF NOT EXISTS idx_posts_events_solo_ok_open
  ON public.posts_events (resort_id, start_at)
  WHERE solo_ok AND status = 'open';
