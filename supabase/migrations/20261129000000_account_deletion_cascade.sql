-- ============================================================
-- アカウント削除が「Database error deleting user」で失敗する問題の修正【提案】
-- ------------------------------------------------------------
-- auth.users を消すと public.users → 各テーブルへ ON DELETE CASCADE で消えていくが、
-- favorite_resorts.user_id だけ ON DELETE が無指定（NO ACTION）だったため、
-- お気に入りゲレンデを登録している人はアカウント（メール・パスワード）を消せなかった。
-- （ログ：violates foreign key constraint "favorite_resorts_user_id_fkey"）
--
-- auth.users から4段先までの外部キーを調べ、止まるのはこの1か所だけ
-- （NOT NULL の列に SET NULL が掛かっているものも無し）。
-- 再実行しても安全。
-- ============================================================

ALTER TABLE public.favorite_resorts DROP CONSTRAINT IF EXISTS favorite_resorts_user_id_fkey;
ALTER TABLE public.favorite_resorts
  ADD CONSTRAINT favorite_resorts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
