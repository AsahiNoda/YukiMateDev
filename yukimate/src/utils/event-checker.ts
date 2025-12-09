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
        console.log('[EventChecker] 🔍 Checking pending event actions for user:', userId);

        // まず、ユーザーがホストのイベントも確認
        console.log('[EventChecker] 📡 Checking events where user is host...');
        const { data: hostedEvents, error: hostedError } = await supabase
            .from('posts_events')
            .select('id, start_at, host_user_id')
            .eq('host_user_id', userId);

        console.log('[EventChecker] 👑 Hosted events:', JSON.stringify(hostedEvents, null, 2));
        if (hostedError) {
            console.error('[EventChecker] ❌ Error fetching hosted events:', hostedError);
        }

        // ユーザーが参加している全イベントを取得（left_at=null のもののみ）
        console.log('[EventChecker] 📡 Querying event_participants table...');
        const { data: participations, error: participationsError } = await supabase
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
            .is('left_at', null);

        if (participationsError) {
            console.error('[EventChecker] ❌ Error fetching participations:', participationsError);
            console.error('[EventChecker] 📄 Error details:', JSON.stringify(participationsError, null, 2));
            return null;
        }

        console.log('[EventChecker] ✅ Query successful, raw data:', JSON.stringify(participations, null, 2));

        // 参加イベントとホストイベントを統合
        const allEvents: Array<{ id: string; start_at: string; host_user_id: string }> = [];

        // 参加イベントを追加
        if (participations && participations.length > 0) {
            participations.forEach((p: any) => {
                if (p.posts_events) {
                    allEvents.push(p.posts_events);
                }
            });
        }

        // ホストイベントを追加（重複を避ける）
        if (hostedEvents && hostedEvents.length > 0) {
            hostedEvents.forEach((event) => {
                if (!allEvents.find((e) => e.id === event.id)) {
                    allEvents.push(event);
                }
            });
        }

        console.log('[EventChecker] 📋 Total events to check:', allEvents.length);
        console.log('[EventChecker] 📋 Events breakdown:', {
            participations: participations?.length || 0,
            hosted: hostedEvents?.length || 0,
            total: allEvents.length,
        });

        if (allEvents.length === 0) {
            console.log('[EventChecker] ℹ️ No active events found');
            return null;
        }

        const now = new Date();
        console.log('[EventChecker] 🕐 Current time:', now.toISOString());
        console.log('[EventChecker] 🔁 Starting loop through', allEvents.length, 'events...');

        // 各イベントをチェック
        for (let i = 0; i < allEvents.length; i++) {
            const event = allEvents[i];
            console.log(`[EventChecker] 📌 Processing event ${i + 1}/${allEvents.length}`);

            const eventId = event.id;
            const eventStartTime = new Date(event.start_at);
            const hoursSinceStart = (now.getTime() - eventStartTime.getTime()) / (1000 * 60 * 60);
            const minutesSinceStart = (now.getTime() - eventStartTime.getTime()) / (1000 * 60);

            console.log('[EventChecker] ⏰ Event time analysis:', {
                eventId,
                startAt: event.start_at,
                startTime: eventStartTime.toISOString(),
                currentTime: now.toISOString(),
                hoursSinceStart: hoursSinceStart.toFixed(2),
                minutesSinceStart: minutesSinceStart.toFixed(2),
                requiresAction: hoursSinceStart >= 6,
                hostUserId: event.host_user_id,
            });

            // イベント開始から6時間経過しているかチェック
            if (hoursSinceStart >= 6) {
                console.log('[EventChecker] ✅ Event passed 6 hour threshold, checking completion status...');

                // AsyncStorageでpost-action完了済みかチェック
                const storageKey = `post_action_completed_${eventId}`;
                console.log('[EventChecker] 🔑 Checking AsyncStorage key:', storageKey);
                const hasCompletedPostAction = await AsyncStorage.getItem(storageKey);

                console.log('[EventChecker] 📋 Post action status:', {
                    eventId,
                    storageKey,
                    hasCompletedPostAction: !!hasCompletedPostAction,
                    rawValue: hasCompletedPostAction,
                });

                if (!hasCompletedPostAction) {
                    console.log('[EventChecker] 🎯 Found pending event action for:', eventId);
                    console.log('[EventChecker] 🎯 This event requires user action!');

                    // イベントの全参加者を取得
                    console.log('[EventChecker] 📡 Fetching all participants for event:', eventId);
                    const { data: allParticipantsData, error: participantsError } = await supabase
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
                        .is('left_at', null);

                    if (participantsError) {
                        console.error('[EventChecker] ❌ Error fetching participants:', participantsError);
                        console.error('[EventChecker] 📄 Error details:', JSON.stringify(participantsError, null, 2));
                        continue;
                    }

                    console.log('[EventChecker] ✅ Participants fetched:', allParticipantsData?.length || 0);
                    console.log('[EventChecker] 📄 Participants data:', JSON.stringify(allParticipantsData, null, 2));

                    // ホスト情報を取得
                    console.log('[EventChecker] 📡 Fetching host profile for user:', event.host_user_id);
                    const { data: hostProfile, error: hostError } = await supabase
                        .from('profiles')
                        .select('user_id, display_name, avatar_url, level')
                        .eq('user_id', event.host_user_id)
                        .single();

                    if (hostError) {
                        console.error('[EventChecker] ❌ Error fetching host profile:', hostError);
                    } else {
                        console.log('[EventChecker] ✅ Host profile fetched:', hostProfile?.display_name);
                    }

                    // 全参加者を整形（ホストを含む）
                    const allParticipants: Array<{
                        user: {
                            id: string;
                            profiles: Profile;
                        };
                    }> = [];

                    // ホストを最初に追加
                    console.log('[EventChecker] 👑 Adding host to participants list...');
                    if (hostProfile) {
                        allParticipants.push({
                            user: {
                                id: event.host_user_id,
                                profiles: hostProfile as Profile,
                            },
                        });
                        console.log('[EventChecker] ✅ Host added:', event.host_user_id);
                    } else {
                        console.log('[EventChecker] ⚠️ Host profile not found, skipping host');
                    }

                    // その他の参加者を追加（ホストが重複しないようにチェック）
                    console.log('[EventChecker] 👥 Adding other participants...');
                    if (allParticipantsData) {
                        let addedCount = 0;
                        allParticipantsData.forEach((p: any) => {
                            if (p.user_id !== event.host_user_id) {
                                allParticipants.push({
                                    user: {
                                        id: p.user_id,
                                        profiles: p.users?.profiles as Profile,
                                    },
                                });
                                addedCount++;
                            }
                        });
                        console.log('[EventChecker] ✅ Added', addedCount, 'other participants (excluding host)');
                    }

                    // 自分以外の参加者のみをフィルター
                    console.log('[EventChecker] 🔍 Filtering out current user from participants...');
                    const otherParticipants = allParticipants.filter((p) => p.user.id !== userId);

                    console.log('[EventChecker] 👥 Final participants summary:', {
                        eventId,
                        currentUserId: userId,
                        totalParticipants: allParticipants.length,
                        otherParticipants: otherParticipants.length,
                        participantIds: otherParticipants.map(p => p.user.id),
                        participantNames: otherParticipants.map(p => p.user.profiles?.display_name || 'Unknown'),
                    });

                    console.log('[EventChecker] 🚀 Returning pending event action with', otherParticipants.length, 'participants');
                    return {
                        eventId,
                        participants: otherParticipants,
                    };
                } else {
                    console.log('[EventChecker] ℹ️ Post action already completed for event:', eventId);
                }
            } else {
                console.log('[EventChecker] ⏳ Event has not reached 6 hour threshold yet');
                console.log('[EventChecker] ⏳ Time remaining:', (6 - hoursSinceStart).toFixed(2), 'hours');
            }
        }

        console.log('[EventChecker] 🔁 Finished checking all', allEvents.length, 'events');

        console.log('[EventChecker] ✅ No pending event actions found');
        return null;
    } catch (error) {
        console.error('[EventChecker] ❌ Unexpected error checking pending event actions:', error);
        console.error('[EventChecker] 📄 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('[EventChecker] 📄 Error details:', JSON.stringify(error, null, 2));
        return null;
    }
}
