import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * イベント終了6時間後にPostEventActionの通知を送信するスケジューラー
 *
 * Supabase Cron Jobs から定期実行される想定:
 * - 毎時実行して、6時間前に終了したイベントを検出
 * - 参加者全員に通知を送信
 */
serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🕒 Checking for events that ended 6 hours ago...');

    // 現在時刻から6時間前（±30分の余裕）
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const fiveAndHalfHoursAgo = new Date(Date.now() - 5.5 * 60 * 60 * 1000);
    const sixAndHalfHoursAgo = new Date(Date.now() - 6.5 * 60 * 60 * 1000);

    // 6時間前（±30分）に終了したイベントを取得
    const { data: events, error: eventsError } = await supabase
      .from('posts_events')
      .select('id, title, end_at')
      .gte('end_at', sixAndHalfHoursAgo.toISOString())
      .lte('end_at', fiveAndHalfHoursAgo.toISOString());

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      throw eventsError;
    }

    console.log(`📋 Found ${events?.length || 0} events that ended 6 hours ago`);

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No events to notify', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let notificationsSent = 0;

    // 各イベントの参加者に通知を送信
    for (const event of events) {
      console.log(`📤 Processing event: ${event.title} (${event.id})`);

      // イベントの参加者を取得
      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', event.id)
        .is('left_at', null);

      if (participantsError) {
        console.error(`❌ Error fetching participants for event ${event.id}:`, participantsError);
        continue;
      }

      console.log(`👥 Found ${participants?.length || 0} participants for event ${event.id}`);

      // 各参加者に通知を送信
      for (const participant of participants || []) {
        // 通知トークンを取得
        const { data: tokens, error: tokensError } = await supabase
          .from('notification_tokens')
          .select('token')
          .eq('user_id', participant.user_id);

        if (tokensError) {
          console.error(`❌ Error fetching tokens for user ${participant.user_id}:`, tokensError);
          continue;
        }

        if (!tokens || tokens.length === 0) {
          console.log(`⚠️ No notification tokens for user ${participant.user_id}`);
          continue;
        }

        // 各トークンに通知を送信
        for (const tokenData of tokens) {
          try {
            const { error: notifyError } = await supabase.functions.invoke('send-notification', {
              body: {
                token: tokenData.token,
                title: 'イベントの評価をお願いします',
                body: `「${event.title}」はいかがでしたか？参加者を評価してください。`,
                data: {
                  type: 'post_event_action',
                  eventId: event.id,
                },
              },
            });

            if (notifyError) {
              console.error(`❌ Error sending notification:`, notifyError);
            } else {
              notificationsSent++;
              console.log(`✅ Notification sent to user ${participant.user_id}`);
            }
          } catch (error) {
            console.error(`❌ Exception sending notification:`, error);
          }
        }
      }
    }

    console.log(`✅ Completed: ${notificationsSent} notifications sent`);

    return new Response(
      JSON.stringify({
        success: true,
        eventsProcessed: events.length,
        notificationsSent,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Exception in schedule-event-notifications:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
