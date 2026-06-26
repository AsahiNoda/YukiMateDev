import { supabase } from '@/lib/supabase';
import { notifyStarredUserEvent } from '@/services/notificationService';

/**
 * イベント作成後に★登録ユーザーに通知を送信
 */
export async function notifyStarredUsersOfNewEvent(
  hostUserId: string,
  eventTitle: string,
  eventId: string
) {
  try {
    // このホストを★登録しているユーザーを取得
    const { data: stars, error } = await supabase
      .from('starred_users')
      .select('user_id')
      .eq('starred_user_id', hostUserId);

    if (error) {
      console.error('Failed to fetch starred users:', error);
      return;
    }

    if (!stars || stars.length === 0) {
      console.log('No starred users for this host');
      return;
    }

    // ホストのプロフィールを取得
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', hostUserId)
      .single();

    const hostName = hostProfile?.display_name || 'Someone';

    // 各ユーザーに通知を送信
    for (const star of stars) {
      await notifyStarredUserEvent(
        star.user_id,
        hostName,
        eventTitle,
        eventId,
        true // isHost = true
      );
    }

    console.log(`Notified ${stars.length} starred users of new event`);
  } catch (error) {
    console.error('Error notifying starred users:', error);
  }
}

/**
 * イベント参加後に★登録ユーザーに通知を送信
 */
export async function notifyStarredUsersOfParticipation(
  participantUserId: string,
  eventTitle: string,
  eventId: string
) {
  try {
    // この参加者を★登録しているユーザーを取得（イベントの参加者のみ）
    const { data: stars, error: starsError } = await supabase
      .from('starred_users')
      .select('user_id')
      .eq('starred_user_id', participantUserId);

    if (starsError) {
      console.error('Failed to fetch starred users:', starsError);
      return;
    }

    if (!stars || stars.length === 0) {
      return;
    }

    // イベントの参加者を取得
    const { data: participants, error: participantsError } = await supabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', eventId)
      .is('left_at', null);

    if (participantsError) {
      console.error('Failed to fetch event participants:', participantsError);
      return;
    }

    const participantIds = participants?.map(p => p.user_id) || [];

    // 参加者のプロフィールを取得
    const { data: participantProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', participantUserId)
      .single();

    const participantName = participantProfile?.display_name || 'Someone';

    // ★登録ユーザーかつイベントの参加者にのみ通知
    const notifyUserIds = stars
      .map(s => s.user_id)
      .filter(userId => participantIds.includes(userId));

    for (const userId of notifyUserIds) {
      await notifyStarredUserEvent(
        userId,
        participantName,
        eventTitle,
        eventId,
        false // isHost = false
      );
    }

    console.log(`Notified ${notifyUserIds.length} starred users of participation`);
  } catch (error) {
    console.error('Error notifying starred users of participation:', error);
  }
}
