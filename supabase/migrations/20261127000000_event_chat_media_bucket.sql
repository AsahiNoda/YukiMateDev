-- ============================================================
-- イベントのチャットの写真用のバケット event_chat_media【提案】
-- ------------------------------------------------------------
-- チャンネルの channel_media（20261123000000_channel_media_bucket.sql）と同じ決まり：
--   - 公開バケット（URL を知っていれば表示できる。チャットの吹き出しで expo-image がそのまま読む）
--   - 1ファイル 10MB まで、JPEG / PNG / WebP / HEIC
--   - アップロードは「自分のユーザーID/」の下だけ（アプリは 自分のID/イベントID/ファイル名 に置く）
--   - 消せるのも自分のファイルだけ
-- 写真の URL は event_messages.content_image_url に入れる（列は前からある）。
-- 再実行しても安全。
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event_chat_media',
  'event_chat_media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS event_chat_media_insert_own ON storage.objects;
CREATE POLICY event_chat_media_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event_chat_media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS event_chat_media_delete_own ON storage.objects;
CREATE POLICY event_chat_media_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event_chat_media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- チャット一覧の最後のメッセージに写真の URL も返す ----------
-- 写真だけのメッセージが一覧で「メッセージがありません」にならないように content_image_url を足す。
-- 戻り値の列が変わるので、いったん消して作り直す（中身は今のものと同じ）。
-- 実行できるのはログインしている人だけにする（今は anon にも付いていたが、チャット一覧はログイン前に使わない）。
DROP FUNCTION IF EXISTS public.get_latest_event_messages(uuid[]);
CREATE FUNCTION public.get_latest_event_messages(p_event_ids uuid[])
RETURNS TABLE(
  id uuid,
  chat_id uuid,
  sender_user_id uuid,
  content_text text,
  content_image_url text,
  created_at timestamptz,
  sender_display_name text,
  sender_avatar_url text
)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (m.chat_id)
    m.id,
    m.chat_id,
    m.sender_user_id,
    m.content_text,
    m.content_image_url,
    m.created_at,
    p.display_name AS sender_display_name,
    p.avatar_url   AS sender_avatar_url
  FROM public.event_messages m
  JOIN public.event_chats c ON c.id = m.chat_id
  LEFT JOIN public.profiles p ON p.user_id = m.sender_user_id
  WHERE c.event_id = ANY (p_event_ids)
  ORDER BY m.chat_id, m.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_latest_event_messages(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_latest_event_messages(uuid[]) TO authenticated, service_role;
