import { supabase } from '@/lib/supabase';
import { notifyEventCancellation } from '@/services/eventNotificationService';

/**
 * イベントを削除またはキャンセル
 * - イベントのstatusを'cancelled'に更新
 * - 全参加者に通知を送信
 */
export async function deleteEvent(
  eventId: string,
  eventTitle: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 現在のユーザーを取得
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'ログインが必要です' };
    }

    // イベントがホストのものか確認
    const { data: event, error: eventError } = await supabase
      .from('posts_events')
      .select('host_user_id, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'イベントが見つかりません' };
    }

    if (event.host_user_id !== session.user.id) {
      return { success: false, error: '権限がありません' };
    }

    // イベントのstatusを'cancelled'に更新
    const { error: updateError } = await supabase
      .from('posts_events')
      .update({ status: 'cancelled' })
      .eq('id', eventId);

    if (updateError) {
      throw updateError;
    }

    // 全参加者に通知を送信
    try {
      await notifyEventCancellation(eventId, eventTitle);
    } catch (notifyError) {
      console.error('Failed to send cancellation notifications:', notifyError);
      // 通知失敗してもキャンセルは成功として扱う
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * イベントを完全に削除（物理削除）
 * - 開発/テスト用途
 * - 本番環境では使用しないことを推奨
 */
export async function hardDeleteEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 現在のユーザーを取得
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'ログインが必要です' };
    }

    // イベントがホストのものか確認
    const { data: event, error: eventError } = await supabase
      .from('posts_events')
      .select('host_user_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'イベントが見つかりません' };
    }

    if (event.host_user_id !== session.user.id) {
      return { success: false, error: '権限がありません' };
    }

    // 関連データを削除（カスケード削除が設定されていない場合）
    // 1. イベント参加者
    await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId);

    // 2. イベント申請
    await supabase
      .from('event_applications')
      .delete()
      .eq('event_id', eventId);

    // 3. チャットメッセージとチャットルーム
    const { data: chatRoom } = await supabase
      .from('event_chats')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (chatRoom) {
      await supabase
        .from('event_messages')
        .delete()
        .eq('chat_id', chatRoom.id);

      await supabase
        .from('event_chats')
        .delete()
        .eq('id', chatRoom.id);
    }

    // 4. イベント本体を削除
    const { error: deleteError } = await supabase
      .from('posts_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      throw deleteError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error hard deleting event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
