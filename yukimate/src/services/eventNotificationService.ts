import type { Locale } from '@/contexts/LocaleContext';
import { getTranslation } from '@/i18n/translations';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { notifyEventCancelled, notifyNewParticipant } from './notificationService';

/** イベント開始の何分前に知らせるか */
export const EVENT_REMINDER_MINUTES = 30;

const REMINDER_ID_PREFIX = 'event-reminder-';
const reminderIdFor = (eventId: string) => `${REMINDER_ID_PREFIX}${eventId}`;

/**
 * イベント開始30分前のリマインダーを、この端末（ログイン中のユーザー本人）に合わせて揃える。
 *
 * 以前はホストが参加を承認したときに予約していたため、リマインダーがホストの端末に入り、
 * 参加者本人には届いていなかった（承認した人数ぶん、ホストに重複して入っていた）。
 * 今は本人のアプリが起動・前面に戻ったとき・承認の通知を受け取ったときにこの関数を呼び、
 *  - 参加中（left_at が空）または主催しているこれからのイベントには、リマインダーを予約する
 *  - 退会した・キャンセルされた・終わったイベントのリマインダーは取り消す
 *  - 開始時刻やタイトルが変わったものは予約し直す
 * 通知の許可がない端末では何もしない。
 */
export async function syncEventReminders(userId: string, locale: Locale): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const nowIso = new Date().toISOString();
    const [participantRes, hostRes] = await Promise.all([
      supabase.from('event_participants').select('event_id').eq('user_id', userId).is('left_at', null),
      supabase.from('posts_events').select('id').eq('host_user_id', userId).gte('start_at', nowIso),
    ]);
    if (participantRes.error) throw participantRes.error;
    if (hostRes.error) throw hostRes.error;

    const ids = [
      ...new Set([
        ...(participantRes.data || []).map((p) => p.event_id as string),
        ...(hostRes.data || []).map((e) => e.id as string),
      ]),
    ];

    // 予約したいリマインダー：eventId → { title, startAt }
    const wanted = new Map<string, { title: string; startAt: string }>();
    if (ids.length > 0) {
      const { data: events, error } = await supabase
        .from('posts_events')
        .select('id, title, start_at, status')
        .in('id', ids)
        .gte('start_at', nowIso)
        .neq('status', 'cancelled');
      if (error) throw error;
      for (const e of events || []) {
        const remindAt = new Date(e.start_at).getTime() - EVENT_REMINDER_MINUTES * 60 * 1000;
        if (remindAt > Date.now()) wanted.set(e.id, { title: e.title, startAt: e.start_at });
      }
    }

    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();

    // 以前の仕組み（ホストの端末に予約していた）で残っているリマインダーを取り消す
    for (const n of allScheduled) {
      const type = (n.content.data as { type?: string } | undefined)?.type;
      if (type === 'event_starting' && !n.identifier.startsWith(REMINDER_ID_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    // すでにこの端末に予約されているリマインダー
    const scheduled = allScheduled.filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX));
    const scheduledById = new Map(scheduled.map((n) => [n.identifier, n]));

    // いらなくなった・内容が変わったものを取り消す
    for (const n of scheduled) {
      const eventId = n.identifier.slice(REMINDER_ID_PREFIX.length);
      const want = wanted.get(eventId);
      const data = (n.content.data || {}) as { startAt?: string; title?: string };
      if (!want || data.startAt !== want.startAt || data.title !== want.title) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
        scheduledById.delete(n.identifier);
      }
    }

    // まだ予約されていないものを予約する
    for (const [eventId, e] of wanted) {
      const identifier = reminderIdFor(eventId);
      if (scheduledById.has(identifier)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: getTranslation(locale, 'notifications.eventStarting.title'),
          body: getTranslation(locale, 'notifications.eventStarting.body', {
            eventTitle: e.title,
            minutes: EVENT_REMINDER_MINUTES,
          }),
          data: { type: 'event_starting', eventId, startAt: e.startAt, title: e.title },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(new Date(e.startAt).getTime() - EVENT_REMINDER_MINUTES * 60 * 1000),
        },
      });
    }
  } catch (error) {
    console.warn('[syncEventReminders] failed', error);
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
