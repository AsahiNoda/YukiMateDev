import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '@/i18n/translations';
import type { Locale } from '@/contexts/LocaleContext';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const LOCALE_STORAGE_KEY = '@locale';

interface NotificationSettings {
  pushEnabled: boolean;
  eventApplications: boolean;
  eventReminders: boolean;
  eventCancellations: boolean;
  newParticipants: boolean;
  newApplications: boolean;
  starredUserEvents: boolean;
  chatMessages: boolean;
  postEventReminders: boolean;
}

/**
 * 通知設定を取得
 */
async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const savedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('通知設定の取得エラー:', error);
  }

  // デフォルト設定（全てON）
  return {
    pushEnabled: true,
    eventApplications: true,
    eventReminders: true,
    eventCancellations: true,
    newParticipants: true,
    newApplications: true,
    starredUserEvents: true,
    chatMessages: true,
    postEventReminders: true,
  };
}

/**
 * 通知が有効かチェック
 */
async function isNotificationEnabled(settingKey: keyof NotificationSettings): Promise<boolean> {
  const settings = await getNotificationSettings();
  return settings.pushEnabled && settings[settingKey];
}

/**
 * 現在のロケールを取得
 */
async function getCurrentLocale(): Promise<Locale> {
  try {
    const savedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    return (savedLocale as Locale) || 'ja';
  } catch (error) {
    console.error('ロケール取得エラー:', error);
    return 'ja';
  }
}

/**
 * 通知文字列を取得（プレースホルダー置換付き）
 */
function getNotificationText(
  locale: Locale,
  key: string,
  replacements: Record<string, string | number> = {}
): string {
  const keys = key.split('.');
  let value: any = translations[locale];

  for (const k of keys) {
    value = value?.[k];
  }

  if (typeof value !== 'string') {
    return key;
  }

  // プレースホルダーを置換
  let result = value;
  for (const [placeholder, replacement] of Object.entries(replacements)) {
    result = result.replace(`{${placeholder}}`, String(replacement));
  }

  return result;
}


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
  // 通知設定をチェック
  const enabled = await isNotificationEnabled('eventApplications');
  if (!enabled) {
    console.log('⚠️ イベント申請通知が無効のためスキップ');
    return { success: false, error: 'Notification disabled by user settings' };
  }

  const locale = await getCurrentLocale();
  const title = getNotificationText(locale, 'notifications.eventApplicationApproved.title');
  const body = getNotificationText(locale, 'notifications.eventApplicationApproved.body', { eventTitle });

  return await sendPushNotification(
    applicantUserId,
    title,
    body,
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
  // 通知設定をチェック
  const enabled = await isNotificationEnabled('eventApplications');
  if (!enabled) {
    console.log('⚠️ イベント申請通知が無効のためスキップ');
    return { success: false, error: 'Notification disabled by user settings' };
  }

  const locale = await getCurrentLocale();
  const title = getNotificationText(locale, 'notifications.eventApplicationRejected.title');
  const body = getNotificationText(locale, 'notifications.eventApplicationRejected.body', { eventTitle });

  return await sendPushNotification(
    applicantUserId,
    title,
    body,
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
  // 通知設定をチェック
  const enabled = await isNotificationEnabled('eventReminders');
  if (!enabled) {
    console.log('⚠️ イベントリマインダー通知が無効のためスキップ');
    return { success: false, error: 'Notification disabled by user settings' };
  }

  const locale = await getCurrentLocale();
  const title = getNotificationText(locale, 'notifications.eventStarting.title');
  const body = getNotificationText(locale, 'notifications.eventStarting.body', {
    eventTitle,
    minutes: minutesUntilStart
  });

  return await sendPushNotification(
    participantUserId,
    title,
    body,
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
  // 通知設定をチェック
  const enabled = await isNotificationEnabled('eventCancellations');
  if (!enabled) {
    console.log('⚠️ イベントキャンセル通知が無効のためスキップ');
    return { success: false, error: 'Notification disabled by user settings' };
  }

  const locale = await getCurrentLocale();
  const title = getNotificationText(locale, 'notifications.eventCancelled.title');
  const body = getNotificationText(locale, 'notifications.eventCancelled.body', { eventTitle });

  return await sendPushNotification(
    participantUserId,
    title,
    body,
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
  // 通知設定をチェック
  const enabled = await isNotificationEnabled('newParticipants');
  if (!enabled) {
    console.log('⚠️ 新しい参加者通知が無効のためスキップ');
    return { success: false, error: 'Notification disabled by user settings' };
  }

  const locale = await getCurrentLocale();
  const title = getNotificationText(locale, 'notifications.newParticipant.title');
  const body = getNotificationText(locale, 'notifications.newParticipant.body', {
    participantName,
    eventTitle
  });

  return await sendPushNotification(
    hostUserId,
    title,
    body,
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
  // 通知設定をチェック
  const enabled = await isNotificationEnabled('postEventReminders');
  if (!enabled) {
    console.log('⚠️ イベント後の評価通知が無効のためスキップ');
    return { success: false, error: 'Notification disabled by user settings' };
  }

  const locale = await getCurrentLocale();
  const title = getNotificationText(locale, 'notifications.postEventAction.title');
  const body = getNotificationText(locale, 'notifications.postEventAction.body', { eventTitle });

  return await sendPushNotification(
    participantUserId,
    title,
    body,
    {
      type: 'post_event_action',
      eventId,
    }
  );
}

/**
 * 新しい参加申請が送られてきた時の通知（ホスト向け）
 */
export async function notifyNewApplication(
  hostUserId: string,
  applicantName: string,
  eventTitle: string,
  eventId: string
) {
  // 通知設定をチェック
  const enabled = await isNotificationEnabled('newApplications');
  if (!enabled) {
    console.log('⚠️ 新しい参加申請通知が無効のためスキップ');
    return { success: false, error: 'Notification disabled by user settings' };
  }

  const locale = await getCurrentLocale();
  const title = getNotificationText(locale, 'notifications.newApplication.title');
  const body = getNotificationText(locale, 'notifications.newApplication.body', {
    applicantName,
    eventTitle
  });

  return await sendPushNotification(
    hostUserId,
    title,
    body,
    {
      type: 'new_application',
      eventId,
    }
  );
}

/**
 * ★登録したユーザーがホストまたはイベントに参加した時の通知
 */
export async function notifyStarredUserEvent(
  userId: string,
  starredUserName: string,
  eventTitle: string,
  eventId: string,
  isHost: boolean
) {
  // 通知設定をチェック
  const enabled = await isNotificationEnabled('starredUserEvents');
  if (!enabled) {
    console.log('⚠️ ★登録ユーザーイベント通知が無効のためスキップ');
    return { success: false, error: 'Notification disabled by user settings' };
  }

  const locale = await getCurrentLocale();
  const title = getNotificationText(locale, isHost ? 'notifications.starredUserEvent.titleHost' : 'notifications.starredUserEvent.titleParticipant');
  const body = getNotificationText(locale, isHost ? 'notifications.starredUserEvent.bodyHost' : 'notifications.starredUserEvent.bodyParticipant', {
    starredUserName,
    eventTitle
  });

  return await sendPushNotification(
    userId,
    title,
    body,
    {
      type: 'starred_user_event',
      eventId,
    }
  );
}

/**
 * イベントチャットに新しいメッセージが送られた時の通知
 */
export async function notifyNewChatMessage(
  participantUserId: string,
  senderName: string,
  eventTitle: string,
  eventId: string
) {
  // 通知設定をチェック
  const enabled = await isNotificationEnabled('chatMessages');
  if (!enabled) {
    console.log('⚠️ チャットメッセージ通知が無効のためスキップ');
    return { success: false, error: 'Notification disabled by user settings' };
  }

  const locale = await getCurrentLocale();
  const title = getNotificationText(locale, 'notifications.newChatMessage.title');
  const body = getNotificationText(locale, 'notifications.newChatMessage.body', {
    senderName,
    eventTitle
  });

  return await sendPushNotification(
    participantUserId,
    title,
    body,
    {
      type: 'new_chat_message',
      eventId,
    }
  );
}

