import type { Profile } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PendingEventAction {
    eventId: string;
    participants: Array<{
        user: {
            id: string;
            profiles: Profile;
        };
    }>;
}

/**
 * ユーザーが参加している全イベントをチェックし、
 * イベント開始から6時間経過しているが、まだpost-actionを完了していないイベントを探す
 * @param userId - 現在のユーザーID
 * @returns 最初に見つかったペンディングアクションがあるイベント、または null
 */
export async function checkPendingEventActions(
    userId: string
): Promise<PendingEventAction | null> {
    try {
        // 開始から6時間以上経過したイベントだけが対象なので、DB側で絞り込む
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

        // ホストしているイベント と 参加しているイベント を並列で取得
        const [
            { data: hostedEvents, error: hostedError },
            { data: participations, error: participationsError },
        ] = await Promise.all([
            supabase
                .from('posts_events')
                .select('id, start_at, host_user_id')
                .eq('host_user_id', userId)
                .lte('start_at', sixHoursAgo),
            supabase
                .from('event_participants')
                .select(
                    `
        event_id,
        posts_events!inner(
          id,
          start_at,
          host_user_id
        )
      `
                )
                .eq('user_id', userId)
                .is('left_at', null)
                .lte('posts_events.start_at', sixHoursAgo),
        ]);

        if (hostedError) {
            console.error('[EventChecker] Error fetching hosted events:', hostedError);
        }

        if (participationsError) {
            console.error('[EventChecker] Error fetching participations:', participationsError);
            return null;
        }

        // 参加イベントとホストイベントを統合
        const allEvents: Array<{ id: string; start_at: string; host_user_id: string }> = [];

        if (participations && participations.length > 0) {
            participations.forEach((p: any) => {
                if (p.posts_events) {
                    allEvents.push(p.posts_events);
                }
            });
        }

        if (hostedEvents && hostedEvents.length > 0) {
            hostedEvents.forEach((event) => {
                if (!allEvents.find((e) => e.id === event.id)) {
                    allEvents.push(event);
                }
            });
        }

        if (allEvents.length === 0) {
            return null;
        }

        const now = new Date();

        // post-action 完了済みフラグをまとめて読み込む（以前はイベントごとに直列で読んでいた）
        const storageKeys = allEvents.map((event) => `post_action_completed_${event.id}`);
        const completedFlags = new Map(await AsyncStorage.multiGet(storageKeys));

        // 各イベントをチェック
        for (const event of allEvents) {
            const eventId = event.id;
            const eventStartTime = new Date(event.start_at);
            const hoursSinceStart = (now.getTime() - eventStartTime.getTime()) / (1000 * 60 * 60);

            // イベント開始から6時間経過しているかチェック
            if (hoursSinceStart >= 6) {
                // AsyncStorageでpost-action完了済みかチェック
                const hasCompletedPostAction = completedFlags.get(`post_action_completed_${eventId}`);

                if (!hasCompletedPostAction) {
                    // イベントの全参加者 と ホスト情報 を並列で取得
                    const [
                        { data: allParticipantsData, error: participantsError },
                        { data: hostProfile, error: hostError },
                    ] = await Promise.all([
                        supabase
                            .from('event_participants')
                            .select(
                                `
              user_id,
              users!event_participants_user_id_fkey(
                id,
                profiles(
                  user_id,
                  display_name,
                  avatar_url,
                  level
                )
              )
            `
                            )
                            .eq('event_id', eventId)
                            .is('left_at', null),
                        supabase
                            .from('profiles')
                            .select('user_id, display_name, avatar_url, level')
                            .eq('user_id', event.host_user_id)
                            .single(),
                    ]);

                    if (participantsError) {
                        console.error('[EventChecker] Error fetching participants:', participantsError);
                        continue;
                    }

                    if (hostError) {
                        console.error('[EventChecker] Error fetching host profile:', hostError);
                    }

                    // 全参加者を整形（ホストを含む）
                    const allParticipants: Array<{
                        user: {
                            id: string;
                            profiles: Profile;
                        };
                    }> = [];

                    // ホストを追加
                    if (hostProfile) {
                        allParticipants.push({
                            user: {
                                id: event.host_user_id,
                                profiles: hostProfile as Profile,
                            },
                        });
                    }

                    // その他の参加者を追加
                    if (allParticipantsData) {
                        allParticipantsData.forEach((p: any) => {
                            if (p.user_id !== event.host_user_id) {
                                allParticipants.push({
                                    user: {
                                        id: p.user_id,
                                        profiles: p.users?.profiles as Profile,
                                    },
                                });
                            }
                        });
                    }

                    // 自分以外の参加者のみをフィルター
                    const otherParticipants = allParticipants.filter((p) => p.user.id !== userId);

                    return {
                        eventId,
                        participants: otherParticipants,
                    };
                }
            }
        }

        return null;
    } catch (error) {
        console.error('[EventChecker] Error:', error);
        return null;
    }
}
