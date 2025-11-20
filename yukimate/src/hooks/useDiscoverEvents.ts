import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DiscoverEvent, EventFilterOptions } from '@types';

type DiscoverEventsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; events: DiscoverEvent[] };

/**
 * Discoverイベント取得フック
 * - Supabaseからイベントデータを取得
 * - パーソナライゼーション（スコアリング）
 * - ブロックユーザーの除外
 */
export function useDiscoverEvents(options: EventFilterOptions = {}): DiscoverEventsState {
  const [state, setState] = useState<DiscoverEventsState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        // 1. 現在のユーザー情報を取得
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error('ユーザーがログインしていません');
        }

        const userId = session.user.id;

        // 2. ユーザープロフィールを取得（パーソナライゼーション用）
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('level, styles, home_resort_id')
          .eq('user_id', userId)
          .single();

        // 3. ブロックしたユーザーIDリストを取得
        const { data: blocks } = await supabase
          .from('blocks')
          .select('blocked_user_id')
          .eq('user_id', userId);

        const blockedUserIds = blocks?.map(b => b.blocked_user_id) || [];

        // 4. イベントデータを取得
        let query = supabase
          .from('posts_events')
          .select(`
            id,
            title,
            description,
            type,
            start_at,
            end_at,
            capacity_total,
            level_required,
            price_per_person_jpy,
            tags,
            photos,
            host_user_id,
            resort_id,
            status,
            resorts(id, name),
            profiles!posts_events_host_user_id_fkey(
              user_id,
              display_name,
              avatar_url,
              level
            )
          `)
          .eq('status', 'open')
          .gte('start_at', new Date().toISOString());

        // カテゴリフィルター適用
        if (options.category && options.category !== 'all') {
          query = query.eq('type', options.category);
        }

        // リゾートフィルター適用
        if (options.resortId) {
          query = query.eq('resort_id', options.resortId);
        }

        // レベルフィルター適用
        if (options.level) {
          query = query.eq('level_required', options.level);
        }

        const { data: events, error } = await query
          .order('start_at', { ascending: true })
          .limit(options.limit || 50);

        if (error) {
          throw error;
        }

        if (!isMounted) return;

        // 5. ブロックユーザーのイベントを除外
        const filteredEvents = events?.filter(
          event => !blockedUserIds.includes(event.host_user_id)
        ) || [];

        // 6. 参加者数を取得
        const eventsWithParticipants = await Promise.all(
          filteredEvents.map(async (event) => {
            const { count } = await supabase
              .from('event_participants')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .is('left_at', null);

            return {
              ...event,
              spotsTaken: count || 0,
            };
          })
        );

        // 7. パーソナライゼーション（スコアリング）
        const scoredEvents = eventsWithParticipants.map(event => {
          let score = 0;

          // レベル一致 +10
          if (userProfile?.level && event.level_required === userProfile.level) {
            score += 10;
          }

          // スタイル一致 +5 × 一致数
          if (userProfile?.styles && event.tags) {
            const matchingStyles = userProfile.styles.filter(style =>
              event.tags?.includes(style)
            );
            score += matchingStyles.length * 5;
          }

          // ホームリゾート +15
          if (userProfile?.home_resort_id && event.resort_id === userProfile.home_resort_id) {
            score += 15;
          }

          // 日付が近い（3日以内） +20
          const daysUntilEvent = Math.floor(
            (new Date(event.start_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilEvent <= 3) {
            score += 20;
          }

          // 公式イベント +25
          if (event.type === 'official') {
            score += 25;
          }

          return {
            ...event,
            score,
          };
        });

        // 8. スコア順にソート
        const sortedEvents = scoredEvents.sort((a, b) => b.score - a.score);

        // 9. DiscoverEvent型に変換
        const discoverEvents: DiscoverEvent[] = sortedEvents.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          hostName: event.profiles?.display_name || 'Unknown',
          hostAvatar: event.profiles?.avatar_url || null,
          resortName: event.resorts?.name || 'Unknown Resort',
          startAt: event.start_at,
          endAt: event.end_at,
          capacityTotal: event.capacity_total || 0,
          spotsTaken: event.spotsTaken,
          levelRequired: event.level_required,
          pricePerPersonJpy: event.price_per_person_jpy,
          tags: event.tags || [],
          photoUrl: event.photos?.[0] || null,
          hostUserId: event.host_user_id,
        }));

        setState({ status: 'success', events: discoverEvents });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading discover events:', error);
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
  }, [options.category, options.resortId, options.level, options.limit]);

  return state;
}

/**
 * イベント参加申請
 * - event_applicationsテーブルにINSERT
 * - status: 'pending'で申請
 */
export async function applyToEvent(
  eventId: string,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 現在のユーザーを取得
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    // 既に申請済みかチェック
    const { data: existingApplication } = await supabase
      .from('event_applications')
      .select('id')
      .eq('event_id', eventId)
      .eq('applicant_user_id', session.user.id)
      .single();

    if (existingApplication) {
      return { success: false, error: '既に申請済みです' };
    }

    // 申請を作成
    const { error } = await supabase
      .from('event_applications')
      .insert({
        event_id: eventId,
        applicant_user_id: session.user.id,
        status: 'pending',
        message: message || null,
      });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error applying to event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
