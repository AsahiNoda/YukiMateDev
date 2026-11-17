-- ============================================================
-- チャンネルの写真用のバケット channel_media【提案】
-- ------------------------------------------------------------
-- 20261122000000_theme_channels.sql の時点では feed-post-images を借りていたが、
-- チャンネル専用に分ける（容量・形式の制限、モデレーションでの削除、ゲレンデ投稿と混ざらないように）。
--
--   - 公開バケット（URL を知っていれば表示できる。チャットの吹き出し・グリッドで expo-image がそのまま読む）
--   - 1ファイル 10MB まで、JPEG / PNG / WebP / HEIC
--   - アップロードは「自分のユーザーID/」の下だけ。消せるのも自分のファイルだけ
--
-- 再実行しても安全。
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'channel_media',
  'channel_media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS channel_media_insert_own ON storage.objects;
CREATE POLICY channel_media_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'channel_media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS channel_media_delete_own ON storage.objects;
CREATE POLICY channel_media_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'channel_media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 公開バケットなので表示（公開 URL）に SELECT ポリシーは要らない。
-- 一覧の取得（list）は許可しない。
