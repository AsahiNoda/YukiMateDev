import { supabase } from '@/lib/supabase';
import { registerForPushNotificationsAsync } from '@/utils/notifications';

/**
 * 通知トークンをデータベースに保存
 */
export async function saveNotificationToken(userId: string, token: string, deviceType?: 'ios' | 'android') {
  try {
    const { error } = await supabase
      .from('notification_tokens')
      .upsert({
        user_id: userId,
        token: token,
        device_type: deviceType,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token'
      });

    if (error) {
      console.error('❌ 通知トークン保存エラー:', error);
      return { success: false, error };
    }

    console.log('✅ 通知トークンを保存しました');
    return { success: true };
  } catch (error) {
    console.error('❌ 通知トークン保存例外:', error);
    return { success: false, error };
  }
}

/**
 * ユーザーの通知トークンを取得
 */
export async function getUserNotificationTokens(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('notification_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ 通知トークン取得エラー:', error);
      return [];
    }

    return data?.map(t => t.token) || [];
  } catch (error) {
    console.error('❌ 通知トークン取得例外:', error);
    return [];
  }
}

/**
 * 通知トークンを削除
 */
export async function deleteNotificationToken(userId: string, token: string) {
  try {
    const { error } = await supabase
      .from('notification_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('❌ 通知トークン削除エラー:', error);
      return { success: false, error };
    }

    console.log('✅ 通知トークンを削除しました');
    return { success: true };
  } catch (error) {
    console.error('❌ 通知トークン削除例外:', error);
    return { success: false, error };
  }
}

/**
 * プッシュ通知を送信（Supabase Edge Function経由）
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: any
) {
  try {
    // ユーザーの通知トークンを取得
    const tokens = await getUserNotificationTokens(userId);

    if (tokens.length === 0) {
      console.warn('⚠️ 通知トークンが見つかりません:', userId);
      return { success: false, error: 'No tokens found' };
    }

    // すべてのトークンに通知を送信
    const results = await Promise.all(
      tokens.map(async (token) => {
        const { data: response, error } = await supabase.functions.invoke('send-notification', {
          body: {
            token,
            title,
            body,
            data,
          },
        });

        if (error) {
          console.error('❌ 通知送信エラー:', error);
          return { success: false, error };
        }

        return { success: true, response };
      })
    );

    const allSuccess = results.every(r => r.success);
    console.log(allSuccess ? '✅ 通知を送信しました' : '⚠️ 一部の通知送信に失敗しました');

    return { success: allSuccess, results };
  } catch (error) {
    console.error('❌ 通知送信例外:', error);
    return { success: false, error };
  }
}

/**
 * イベント申請が承認された時の通知
 */
export async function notifyEventApplicationApproved(
  applicantUserId: string,
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification(
    applicantUserId,
    'イベント申請が承認されました',
    `「${eventTitle}」への参加が承認されました。`,
    {
      type: 'event_application_approved',
      eventId,
    }
  );
}

/**
 * イベント申請が却下された時の通知
 */
export async function notifyEventApplicationRejected(
  applicantUserId: string,
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification(
    applicantUserId,
    'イベント申請が却下されました',
    `「${eventTitle}」への参加申請が却下されました。`,
    {
      type: 'event_application_rejected',
      eventId,
    }
  );
}

/**
 * イベント開始のリマインダー通知
 */
export async function notifyEventStarting(
  participantUserId: string,
  eventTitle: string,
  eventId: string,
  minutesUntilStart: number
) {
  return sendPushNotification(
    participantUserId,
    'イベント開始まであと少し',
    `「${eventTitle}」が${minutesUntilStart}分後に始まります。`,
    {
      type: 'event_starting',
      eventId,
    }
  );
}

/**
 * イベントがキャンセルされた時の通知
 */
export async function notifyEventCancelled(
  participantUserId: string,
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification(
    participantUserId,
    'イベントがキャンセルされました',
    `「${eventTitle}」がホストによってキャンセルされました。`,
    {
      type: 'event_cancelled',
      eventId,
    }
  );
}

/**
 * 新しい参加者がイベントに参加した時の通知（ホスト向け）
 */
export async function notifyNewParticipant(
  hostUserId: string,
  participantName: string,
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification(
    hostUserId,
    '新しい参加者',
    `${participantName}さんが「${eventTitle}」に参加しました。`,
    {
      type: 'new_participant',
      eventId,
    }
  );
}

/**
 * イベント終了6時間後のPostEventAction通知
 */
export async function notifyPostEventAction(
  participantUserId: string,
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification(
    participantUserId,
    'イベントの評価をお願いします',
    `「${eventTitle}」はいかがでしたか？参加者を評価してください。`,
    {
      type: 'post_event_action',
      eventId,
    }
  );
}
