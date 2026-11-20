import { IMAGE_MAX_SIZE, resizeImageForUpload } from '@/lib/imageResize';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

export interface UploadedChatImage {
  url: string;
  width?: number;
  height?: number;
}

/**
 * チャットの写真を縮小して公開バケットの「自分のユーザーID/フォルダ/」の下に置き、公開 URL を返す。
 * バケットの決まり（自分のフォルダにだけ置ける）：
 *   channel_media    … supabase/migrations/20261123000000_channel_media_bucket.sql
 *   event_chat_media … supabase/migrations/20261127000000_event_chat_media_bucket.sql
 */
export async function uploadChatImage(
  bucket: 'channel_media' | 'event_chat_media',
  userId: string,
  folder: string,
  asset: { uri: string; width?: number; height?: number }
): Promise<UploadedChatImage> {
  const resized = await resizeImageForUpload(asset.uri, IMAGE_MAX_SIZE.post, { width: asset.width, height: asset.height });
  const path = `${userId}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${resized.ext}`;
  const base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' });
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, decode(base64), { contentType: resized.mimeType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, width: resized.width, height: resized.height };
}
