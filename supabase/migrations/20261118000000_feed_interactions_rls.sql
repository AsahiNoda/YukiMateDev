-- ============================================================
-- ゲレンデページ（リデザイン フェーズ6）で使う操作の RLS ポリシー【提案】
-- ------------------------------------------------------------
-- アプリから次の操作をするようになったが、該当テーブルに本人用のポリシーがリポジトリに見当たらない。
--   - 「参考になった」：feed_reactions に like を追加・削除（現状「変更できませんでした」になる）
--   - 投稿の通報：reports に追加
--   - 自分の投稿の削除：feed_posts を削除
--
-- 注意：ここでは ENABLE ROW LEVEL SECURITY はしない（ポリシーを足すだけ）。
--   RLS が無効なテーブルにポリシーを足しても何も変わらず、有効なテーブルでは本人の操作だけが許可される。
--   今動いている操作を止めることはない。
-- DROP POLICY IF EXISTS ... を付けているので、再実行しても安全。
-- ============================================================

-- ---------- feed_reactions（参考になった） ----------
DROP POLICY IF EXISTS feed_reactions_select ON public.feed_reactions;
CREATE POLICY feed_reactions_select ON public.feed_reactions
  FOR SELECT USING (true);                                   -- 件数の表示に使うので誰でも閲覧可

DROP POLICY IF EXISTS feed_reactions_insert_own ON public.feed_reactions;
CREATE POLICY feed_reactions_insert_own ON public.feed_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);              -- 本人の分だけ追加

DROP POLICY IF EXISTS feed_reactions_delete_own ON public.feed_reactions;
CREATE POLICY feed_reactions_delete_own ON public.feed_reactions
  FOR DELETE USING (auth.uid() = user_id);                   -- 本人の分だけ取り消し

-- 同じ人が同じ投稿に同じ種類を2回付けないように（連打対策）
CREATE UNIQUE INDEX IF NOT EXISTS feed_reactions_post_user_type_key
  ON public.feed_reactions (post_id, user_id, type);

-- ---------- reports（通報） ----------
DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);     -- 本人名義の通報だけ追加（閲覧は運営のみ）

-- ---------- feed_posts（自分の投稿の削除） ----------
DROP POLICY IF EXISTS feed_posts_delete_own ON public.feed_posts;
CREATE POLICY feed_posts_delete_own ON public.feed_posts
  FOR DELETE USING (auth.uid() = user_id);

-- 投稿を消したときに、付いていた「参考になった」とコメントが残って削除を妨げないようにする場合は、
-- 外部キーを ON DELETE CASCADE にする必要がある（今は付いていると削除が外部キーで失敗する）。
-- 必要ならこちらも実行する：
-- ALTER TABLE public.feed_reactions DROP CONSTRAINT feed_reactions_post_id_fkey,
--   ADD CONSTRAINT feed_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feed_posts(id) ON DELETE CASCADE;
-- ALTER TABLE public.feed_comments DROP CONSTRAINT feed_comments_post_id_fkey,
--   ADD CONSTRAINT feed_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feed_posts(id) ON DELETE CASCADE;
