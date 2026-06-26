import { supabase } from '@/lib/supabase';
import { scheduleNotificationAtTime } from '@/utils/notifications';
import { notifyEventStarting, notifyEventCancelled, notifyNewParticipant } from './notificationService';

/**
 * イベント開始30分前のリマインダーをスケジュール
 */
export async function scheduleEventStartReminder(
  eventId: string,
  eventTitle: string,
  startAt: string
) {
  try {
    // イベント開始30分前の時刻を計算
    const startTime = new Date(startAt);
    const reminderTime = new Date(startTime.getTime() - 30 * 60 * 1000);

    // 現在時刻よりも前の場合はスケジュールしない
    if (reminderTime <= new Date()) {
      console.log('⚠️ Reminder time is in the past, skipping');
      return;
    }

    // イベントの参加者を取得
    const { data: participants, error } = await supabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', eventId)
      .is('left_at', null);

    if (error) {
      console.error('❌ Error fetching participants:', error);
      return;
    }

    // 各参加者にローカル通知をスケジュール
    for (const participant of participants || []) {
      await scheduleNotificationAtTime(
        'イベント開始まであと少し',
        `「${eventTitle}」が30分後に始まります。`,
        reminderTime,
        {
          type: 'event_starting',
          eventId,
        }
      );
    }

    console.log(`✅ Scheduled ${participants?.length || 0} event start reminders`);
  } catch (error) {
    console.error('❌ Error scheduling event start reminders:', error);
  }
}

/**
 * イベント参加時に開始リマインダーをスケジュール
 */
export async function scheduleReminderOnJoin(
  userId: string,
  eventId: string,
  eventTitle: string,
  startAt: string
) {
  try {
    const startTime = new Date(startAt);
    const reminderTime = new Date(startTime.getTime() - 30 * 60 * 1000);

    if (reminderTime <= new Date()) {
      console.log('⚠️ Reminder time is in the past, skipping');
      return;
    }

    await scheduleNotificationAtTime(
      'イベント開始まであと少し',
      `「${eventTitle}」が30分後に始まります。`,
      reminderTime,
      {
        type: 'event_starting',
        eventId,
      }
    );

    console.log('✅ Scheduled event start reminder for user');
  } catch (error) {
    console.error('❌ Error scheduling reminder on join:', error);
  }
}

/**
 * イベントキャンセル時に全参加者に通知
 */
export async function notifyEventCancellation(eventId: string, eventTitle: string) {
  try {
    // イベントの参加者を取得
    const { data: participants, error } = await supabase
      .from('event_participants')
      .select('user_id, users!event_participants_user_id_fkey(id)')
      .eq('event_id', eventId)
      .is('left_at', null);

    if (error) {
      console.error('❌ Error fetching participants for cancellation:', error);
      return;
    }

    console.log(`📤 Notifying ${participants?.length || 0} participants of cancellation`);

    // 各参加者に通知を送信
    for (const participant of participants || []) {
      await notifyEventCancelled(participant.user_id, eventTitle, eventId);
    }

    console.log('✅ Sent cancellation notifications to all participants');
  } catch (error) {
    console.error('❌ Error notifying event cancellation:', error);
  }
}

/**
 * 新規参加者がイベントに参加した時にホストに通知
 */
export async function notifyHostOfNewParticipant(
  eventId: string,
  eventTitle: string,
  participantUserId: string
) {
  try {
    // イベントのホストを取得
    const { data: event, error: eventError } = await supabase
      .from('posts_events')
      .select('host_user_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('❌ Error fetching event host:', eventError);
      return;
    }

    // 参加者のプロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', participantUserId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching participant profile:', profileError);
      return;
    }

    const participantName = profile?.display_name || '新しいユーザー';

    // ホストに通知を送信
    await notifyNewParticipant(
      event.host_user_id,
      participantName,
      eventTitle,
      eventId
    );

    console.log('✅ Notified host of new participant');
  } catch (error) {
    console.error('❌ Error notifying host of new participant:', error);
  }
}
