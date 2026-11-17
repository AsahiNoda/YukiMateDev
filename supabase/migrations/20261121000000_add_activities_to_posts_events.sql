-- ============================================================
-- イベントのアクティビティ（スキー・スノーボード・バックカントリー等）【必須：アプリより先に適用】
-- ------------------------------------------------------------
-- 作成画面のアクティビティ選択・イベント詳細の表示・さがすの絞り込みが posts_events.activities を読む／書く。
-- このカラムが無いと、さがす・イベント詳細・イベント作成が失敗するので、アプリを配る前に適用すること。
-- 値はアプリの src/constants/activities.ts（ACTIVITY_TYPES）と同じ。増やすときは両方を直す。
-- 再実行しても安全。
-- ============================================================

ALTER TABLE public.posts_events
  ADD COLUMN IF NOT EXISTS activities text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.posts_events
  DROP CONSTRAINT IF EXISTS posts_events_activities_check;
ALTER TABLE public.posts_events
  ADD CONSTRAINT posts_events_activities_check CHECK (
    activities <@ ARRAY['ski', 'snowboard', 'backcountry', 'park', 'powder', 'groomed', 'splitboard']::text[]
    AND cardinality(activities) <= 4
  );

-- さがすの絞り込み（activities && ARRAY[...]）用
CREATE INDEX IF NOT EXISTS posts_events_activities_gin
  ON public.posts_events USING gin (activities);
