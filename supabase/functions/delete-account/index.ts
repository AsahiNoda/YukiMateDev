import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * アカウント削除（アプリの「アカウントを削除」から呼ぶ）。
 *
 * 1. 呼び出した本人を確認する（Authorization のトークン ＝ 本文の userId）
 * 2. 認証ユーザー（auth.users）を最初に消す。
 *    データは外部キーの ON DELETE CASCADE で auth.users → public.users → 各テーブルへ消える
 *    （止まる外部キーは 20261129000000_account_deletion_cascade.sql で無くした）。
 *    ここで失敗したら何も消えていないので、「データだけ消えてログインは残る」状態にならない。
 * 3. ストレージの本人のフォルダ（「ユーザーID/」の下）を消す。失敗しても削除は成功として返す。
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** 本人の写真を「ユーザーID/」の下に置いているバケット */
const USER_FOLDER_BUCKETS = [
  'profile_avatar',
  'profile_header',
  'profile_posts',
  'feed-post-images',
  'event_images',
  'channel_media',
  'event_chat_media',
];

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json().catch(() => ({ userId: null }));
    if (!userId) return json({ error: 'User ID is required' }, 400);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 本人確認
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user || user.id !== userId) return json({ error: 'Unauthorized' }, 401);

    console.log('Deleting account for user:', userId);

    // 認証ユーザーを消す（データは CASCADE で一緒に消える）
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('Auth user deletion error:', deleteUserError);
      return json({ error: 'delete_failed', detail: deleteUserError.message }, 500);
    }

    // ストレージの本人のフォルダ（失敗しても続ける）
    for (const bucket of USER_FOLDER_BUCKETS) {
      try {
        const paths: string[] = [];
        // 「ユーザーID/」直下と、その下のフォルダ（チャンネルID・イベントID）を1段だけたどる
        const { data: top } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
        for (const entry of top ?? []) {
          if (entry.id) {
            paths.push(`${userId}/${entry.name}`);
          } else {
            const { data: inner } = await supabase.storage.from(bucket).list(`${userId}/${entry.name}`, { limit: 1000 });
            for (const file of inner ?? []) paths.push(`${userId}/${entry.name}/${file.name}`);
          }
        }
        if (paths.length > 0) await supabase.storage.from(bucket).remove(paths);
      } catch (storageError) {
        console.error(`Storage cleanup error (${bucket}):`, storageError);
      }
    }

    console.log('Account deleted successfully:', userId);
    return json({ success: true }, 200);
  } catch (error) {
    console.error('Delete account error:', error);
    return json({ error: 'delete_failed', detail: error instanceof Error ? error.message : String(error) }, 500);
  }
});
