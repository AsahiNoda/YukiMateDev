import { supabase } from '@/lib/supabase';
import { getResortName } from '@/utils/resort-helpers';
import type { DiscoverEvent, EventFilterOptions } from '@types';
import { useEffect, useState } from 'react';
import { useTranslation } from './useTranslation';

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
  const { locale } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        // 1. 現在のユーザー情報を取得
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error('セッション取得エラー: ' + sessionError.message);
        }

        if (!session?.user) {
          if (!isMounted) return;
          setState({
            status: 'error',
            error: 'ログインが必要です。アカウント設定からログインしてください。',
          });
          return;
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

        // 3.5. 自分が参加中のイベントIDリストを取得（approvedまたはevent_participantsに存在）
        const { data: approvedApplications } = await supabase
          .from('event_applications')
          .select('event_id')
          .eq('applicant_user_id', userId)
          .eq('status', 'approved');

        const approvedEventIds = approvedApplications?.map(a => a.event_id) || [];

        // 自分が参加中のイベント（left_atがnull）も取得
        const { data: participatingEvents } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', userId)
          .is('left_at', null);

        const participatingEventIds = participatingEvents?.map(p => p.event_id) || [];

        // 両方のリストを結合して重複を除去
        const excludedEventIds = [...new Set([...approvedEventIds, ...participatingEventIds])];

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
            meeting_place,
            tags,
            photos,
            host_user_id,
            resort_id,
            status,
            resorts(id, name, name_en),
            profiles!posts_events_host_user_id_fkey(
              user_id,
              display_name,
              avatar_url,
              level,
              users!profiles_user_id_fkey(role)
            )
          `)
          .eq('status', 'open')
          .gte('start_at', new Date().toISOString())
          .neq('host_user_id', userId); // 自分がホストのイベントを除外

        // カテゴリフィルター適用
        if (options.category) {
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

        // 5. ブロックユーザーのイベントと参加中のイベントを除外
        const filteredEvents = events?.filter(
          event => !blockedUserIds.includes(event.host_user_id) && !excludedEventIds.includes(event.id)
        ) || [];

        // 6. ★登録したユーザーIDリストを取得
        const { data: starredUsers } = await supabase
          .from('stars')
          .select('target_user_id')
          .eq('user_id', userId);

        const starredUserIds = starredUsers?.map(s => s.target_user_id) || [];

        // 7. 参加者数と★登録された参加者を取得
        const eventsWithParticipants = await Promise.all(
          filteredEvents.map(async (event) => {
            const { count, data: participants } = await supabase
              .from('event_participants')
              .select('user_id', { count: 'exact' })
              .eq('event_id', event.id)
              .is('left_at', null);

            // ★登録された参加者をフィルター
            const participantUserIds = participants?.map(p => p.user_id) || [];
            const starredParticipants = participantUserIds.filter(id => starredUserIds.includes(id));

            return {
              ...event,
              spotsTaken: count || 0,
              starredParticipants,
            };
          })
        );

        // 7.5. 満員のイベントを除外
        const availableEvents = eventsWithParticipants.filter(
          event => event.spotsTaken < (event.capacity_total || 0)
        );

        // 8. パーソナライゼーション（スコアリング）
        const scoredEvents = availableEvents.map(event => {
          let score = 0;

          // レベル一致 +10
          if (userProfile?.level && event.level_required === userProfile.level) {
            score += 10;
          }

          // スタイル一致 +5 × 一致数
          if (userProfile?.styles && event.tags) {
            const matchingStyles = userProfile.styles.filter((style: string) =>
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

        // 9. スコア順にソート
        const sortedEvents = scoredEvents.sort((a, b) => b.score - a.score);

        // 10. DiscoverEvent型に変換
        const discoverEvents: DiscoverEvent[] = sortedEvents.map(event => {
          // event_imagesストレージから画像URLを取得（全画像）
          const photoUrls: string[] = [];
          if (event.photos && event.photos.length > 0) {
            event.photos.forEach((photoPath: string) => {
              // パスがすでに完全なURLの場合はそのまま使用、そうでなければStorage URLを生成
              if (photoPath.startsWith('http')) {
                photoUrls.push(photoPath);
              } else {
                const { data } = supabase.storage
                  .from('event_images')
                  .getPublicUrl(photoPath);
                photoUrls.push(data.publicUrl);
              }
            });
          }

          // プロフィールアバターのURLを取得
          let hostAvatarUrl: string | null = null;
          if (event.profiles?.avatar_url) {
            const avatarPath = event.profiles.avatar_url;
            // パスがすでに完全なURLの場合はそのまま使用、そうでなければStorage URLを生成
            if (avatarPath.startsWith('http')) {
              hostAvatarUrl = avatarPath;
            } else {
              const { data } = supabase.storage
                .from('profile_avatar')
                .getPublicUrl(avatarPath);
              hostAvatarUrl = data.publicUrl;
            }
          }

          return {
            id: event.id,
            title: event.title,
            description: event.description,
            category: event.type as 'event' | 'lesson' | 'filming' | 'group',
            hostName: event.profiles?.display_name || 'Unknown',
            hostAvatar: hostAvatarUrl,
            resortName: event.resorts ? getResortName(event.resorts, locale) : 'Unknown Resort',
            startAt: event.start_at,
            endAt: event.end_at,
            capacityTotal: event.capacity_total || 0,
            spotsTaken: event.spotsTaken,
            levelRequired: event.level_required,
            pricePerPersonJpy: event.price_per_person_jpy,
            meetingPlace: event.meeting_place,
            tags: event.tags || [],
            photoUrl: photoUrls[0] || null, // 下位互換性のため最初の画像
            photoUrls, // 全画像
            hostUserId: event.host_user_id,
            hostRole: event.profiles?.users?.role || 'user',
            isHostStarred: starredUserIds.includes(event.host_user_id),
            starredParticipants: event.starredParticipants || [],
          };
        });

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
  }, [options.category, options.resortId, options.level, options.limit, locale]);

  return state;
}

/**
 * イベント参加申請
 * - event_applicationsテーブルにINSERT
 * - status: 'pending'で申請
 * - 定員チェックを実施
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

    // イベント情報を取得（定員チェック用）
    const { data: event, error: eventError } = await supabase
      .from('posts_events')
      .select('capacity_total')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return { success: false, error: 'イベントが見つかりません' };
    }

    // 現在の参加者数を取得
    const { count } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .is('left_at', null);

    // 定員チェック
    if (count !== null && count >= (event.capacity_total || 0)) {
      return { success: false, error: 'このイベントは定員に達しています' };
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

/**
 * イベント保存
 * - saved_eventsテーブルにINSERT
 */
export async function saveEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 現在のユーザーを取得
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    // 既に保存済みかチェック
    const { data: existingSave } = await supabase
      .from('saved_events')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', session.user.id)
      .single();

    if (existingSave) {
      return { success: false, error: '既に保存済みです' };
    }

    // 保存を作成
    const { error } = await supabase
      .from('saved_events')
      .insert({
        event_id: eventId,
        user_id: session.user.id,
      });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * イベント保存解除
 * - saved_eventsテーブルからDELETE
 */
export async function unsaveEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 現在のユーザーを取得
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    // 保存を削除
    const { error } = await supabase
      .from('saved_events')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', session.user.id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error unsaving event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
