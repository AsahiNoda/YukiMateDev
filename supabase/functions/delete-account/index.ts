import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // リクエストボディを取得
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Supabase クライアントを作成
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ユーザー認証を確認
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Deleting account for user:', userId);

    // 1. イベント参加者から削除
    await supabase
      .from('event_participants')
      .delete()
      .eq('user_id', userId);

    // 2. イベント申請を削除
    await supabase
      .from('event_applications')
      .delete()
      .eq('user_id', userId);

    // 3. チャットメッセージを削除
    await supabase
      .from('event_messages')
      .delete()
      .eq('sender_user_id', userId);

    // 4. 投稿を削除
    await supabase
      .from('posts_feed')
      .delete()
      .eq('author_user_id', userId);

    // 5. コメントを削除
    await supabase
      .from('feed_comments')
      .delete()
      .eq('user_id', userId);

    // 6. いいねを削除
    await supabase
      .from('feed_likes')
      .delete()
      .eq('user_id', userId);

    // 7. ★登録を削除（自分が登録した & 自分が登録された）
    await supabase
      .from('stars')
      .delete()
      .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);

    // 8. ブロックを削除（自分がブロックした & 自分がブロックされた）
    await supabase
      .from('blocks')
      .delete()
      .or(`user_id.eq.${userId},blocked_user_id.eq.${userId}`);

    // 9. 主催イベントを削除（cascadeで関連データも削除される）
    await supabase
      .from('posts_events')
      .delete()
      .eq('host_user_id', userId);

    // 10. プロフィールを削除
    await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    // 11. Storageから画像削除
    try {
      // アバター画像削除
      const { data: avatarFiles } = await supabase.storage
        .from('avatars')
        .list(userId);

      if (avatarFiles && avatarFiles.length > 0) {
        const avatarPaths = avatarFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage
          .from('avatars')
          .remove(avatarPaths);
      }

      // 投稿画像削除
      const { data: postFiles } = await supabase.storage
        .from('posts')
        .list(userId);

      if (postFiles && postFiles.length > 0) {
        const postPaths = postFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage
          .from('posts')
          .remove(postPaths);
      }
    } catch (storageError) {
      console.error('Storage deletion error:', storageError);
      // ストレージエラーは無視して続行
    }

    // 12. 認証ユーザーを削除
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('User deletion error:', deleteUserError);
      throw deleteUserError;
    }

    console.log('Account deleted successfully:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
