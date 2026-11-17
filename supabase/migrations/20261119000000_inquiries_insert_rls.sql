-- ============================================================
-- お問い合わせフォーム（ホーム右上・設定の「ヘルプ・お問い合わせ」）から inquiries に保存する【提案】
-- ------------------------------------------------------------
-- アプリから inquiries に insert するようになったが、本人用のポリシーがリポジトリに見当たらない。
-- RLS が有効で許可がないと「送信できませんでした」になるので、本人名義の追加だけ許可する。
-- ENABLE ROW LEVEL SECURITY はしない（ポリシーを足すだけ。閲覧は運営のみのまま）。
-- 再実行しても安全。
-- ============================================================

DROP POLICY IF EXISTS inquiries_insert_own ON public.inquiries;
CREATE POLICY inquiries_insert_own ON public.inquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
