import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import type { EventMessage, EventChat } from '@types';

type EventChatsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; chats: EventChat[] };

export function useEventChats(): EventChatsState {
  const [state, setState] = useState<EventChatsState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          throw new Error('ユーザーがログインしていません。');
        }

        // 1. ユーザーが参加しているイベントを取得
        const { data: participantsData, error: participantsError } = await supabase
          .from('event_participants')
          .select(
            `
            event_id,
            posts_events!inner(
              id,
              title,
              start_at,
              resort_id,
              resorts(name),
              event_chats(id)
            )
          `
          )
          .eq('user_id', session.user.id)
          .is('left_at', null);

        if (participantsError) {
          throw new Error(`参加イベント取得エラー: ${participantsError.message}`);
        }

        if (!participantsData || participantsData.length === 0) {
          if (!isMounted) return;
          setState({ status: 'success', chats: [] });
          return;
        }

        // 2. 各イベントのチャットとメッセージを取得
        const chats: EventChat[] = [];

        for (const participant of participantsData) {
          const event = participant.posts_events as any;
          const chatId = event.event_chats?.id;

          if (!chatId) continue;

          const resort = Array.isArray(event.resorts) ? event.resorts[0] : event.resorts;

          // メッセージを取得
          const { data: messagesData, error: messagesError } = await supabase
            .from('event_messages')
            .select(
              `
              id,
              chat_id,
              sender_user_id,
              content_text,
              content_image_url,
              created_at,
              profiles!event_messages_sender_user_id_fkey(display_name, avatar_url)
            `
            )
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })
            .limit(50);

          if (messagesError) {
            console.warn(`メッセージ取得エラー (chat ${chatId}):`, messagesError);
            continue;
          }

          const messages: EventMessage[] = (messagesData || []).map((msg: any) => {
            const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;

            return {
              id: msg.id,
              chatId: msg.chat_id,
              senderUserId: msg.sender_user_id,
              senderName: profile?.display_name || 'Unknown',
              senderAvatar: profile?.avatar_url || null,
              contentText: msg.content_text,
              contentImageUrl: msg.content_image_url,
              createdAt: msg.created_at,
            };
          });

          chats.push({
            id: chatId,
            eventId: event.id,
            eventTitle: event.title || 'Untitled Event',
            eventResortName: resort?.name || null,
            eventStartAt: event.start_at,
            messages,
          });
        }

        if (!isMounted) return;

        setState({ status: 'success', chats });
      } catch (error) {
        if (!isMounted) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}

export async function sendEventMessage(
  chatId: string,
  contentText: string,
  contentImageUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { success: false, error: 'ユーザーがログインしていません。' };
    }

    const { error } = await supabase.from('event_messages').insert({
      chat_id: chatId,
      sender_user_id: session.user.id,
      content_text: contentText || null,
      content_image_url: contentImageUrl || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

