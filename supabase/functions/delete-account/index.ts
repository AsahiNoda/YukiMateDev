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
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
    const { error: participantsError } = await supabase
      .from('event_participants')
      .delete()
      .eq('user_id', userId);
    if (participantsError) console.error('Error deleting event_participants:', participantsError);

    // 2. イベント申請を削除
    const { error: applicationsError } = await supabase
      .from('event_applications')
      .delete()
      .eq('user_id', userId);
    if (applicationsError) console.error('Error deleting event_applications:', applicationsError);

    // 3. チャットメッセージを削除
    const { error: messagesError } = await supabase
      .from('event_messages')
      .delete()
      .eq('sender_user_id', userId);
    if (messagesError) console.error('Error deleting event_messages:', messagesError);

    // 4. 投稿を削除
    const { error: postsError } = await supabase
      .from('posts_feed')
      .delete()
      .eq('author_user_id', userId);
    if (postsError) console.error('Error deleting posts_feed:', postsError);

    // 5. コメントを削除
    const { error: commentsError } = await supabase
      .from('feed_comments')
      .delete()
      .eq('user_id', userId);
    if (commentsError) console.error('Error deleting feed_comments:', commentsError);

    // 6. いいねを削除
    const { error: likesError } = await supabase
      .from('feed_likes')
      .delete()
      .eq('user_id', userId);
    if (likesError) console.error('Error deleting feed_likes:', likesError);

    // 7. ★登録を削除（自分が登録した & 自分が登録された）
    const { error: starsError } = await supabase
      .from('stars')
      .delete()
      .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);
    if (starsError) console.error('Error deleting stars:', starsError);

    // 8. ブロックを削除（自分がブロックした & 自分がブロックされた）
    const { error: blocksError } = await supabase
      .from('blocks')
      .delete()
      .or(`user_id.eq.${userId},blocked_user_id.eq.${userId}`);
    if (blocksError) console.error('Error deleting blocks:', blocksError);

    // 9. 主催イベントを削除（cascadeで関連データも削除される）
    const { error: eventsError } = await supabase
      .from('posts_events')
      .delete()
      .eq('host_user_id', userId);
    if (eventsError) console.error('Error deleting posts_events:', eventsError);

    // 10. プロフィールを削除
    const { data: deletedProfiles, error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId)
      .select();
    if (profileError) {
      console.error('Error deleting profiles:', profileError);
    } else {
      console.log(`Deleted ${deletedProfiles?.length || 0} profile(s) for user ${userId}`);
    }

    // 11. ギア情報を削除
    const { error: gearError } = await supabase
      .from('gear')
      .delete()
      .eq('user_id', userId);
    if (gearError) console.error('Error deleting gear:', gearError);

    // 12. 通知トークンを削除
    const { error: tokensError } = await supabase
      .from('notification_tokens')
      .delete()
      .eq('user_id', userId);
    if (tokensError) console.error('Error deleting notification_tokens:', tokensError);

    // 13. usersテーブルから削除（public.users から削除）
    // auth.usersの削除前に実行しないと、外部キー制約違反（ON DELETE RESTRICTの場合）で失敗する可能性がある
    const { data: deletedUsers, error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select();
    if (usersError) {
      console.error('Error deleting from users table:', usersError);
      // usersテーブル削除失敗時は、ここでエラーにするか、warningにして続行するか
      // 外部キー制約エラーの場合は続行してもauth.users削除で転けるため、ログを出して続行
    } else {
      console.log(`Deleted ${deletedUsers?.length || 0} user record(s) from users table for user ${userId}`);
    }

    // 14. 認証ユーザーを削除（auth.usersから削除）
    const { error: deleteAuthUserError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthUserError) {
      console.error('Auth user deletion error:', deleteAuthUserError);
      throw new Error('Failed to delete auth user: ' + deleteAuthUserError.message);
    }

    console.log('Auth user deleted successfully:', userId);

    // 15. Storageから画像削除
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
