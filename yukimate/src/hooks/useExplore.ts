import { supabase } from '@/lib/supabase';
import { getResortName } from '@/utils/resort-helpers';
import type { DiscoverEvent } from '@types';
import { useEffect, useState } from 'react';
import { useTranslation } from './useTranslation';

/**
 * Explore検索フィルター
 */
export interface ExploreFilters {
  keyword?: string;
  category?: 'event' | 'lesson' | 'filming' | 'group';
  resortIds?: string[];
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  dateRange?: {
    start?: string;
    end?: string;
  };
  languages?: string[];
  hasAvailability?: boolean; // 空きがあるもののみ
  soloOnly?: boolean; // 一人参加OK（posts_events.solo_ok）のみ
}

/**
 * ソートオプション
 */
export interface SortOptions {
  sortBy: 'date' | 'popular' | 'newest';
  order: 'asc' | 'desc';
}

type ExploreState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; events: DiscoverEvent[]; hasMore: boolean };

/**
 * Explore検索フック
 */
export function useExplore(
  filters: ExploreFilters = {},
  sort: SortOptions = { sortBy: 'date', order: 'asc' },
  page: number = 0
): ExploreState & { refetch: () => void; loadMore: () => void } {
  const [state, setState] = useState<ExploreState>({ status: 'loading' });
  const [currentPage, setCurrentPage] = useState(page);
  const { locale } = useTranslation();

  const load = async (pageNum: number = 0) => {
    try {
      if (pageNum === 0) {
        setState({ status: 'loading' });
      }

      const pageSize = 20;

      // 現在のユーザー情報を取得
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('ユーザーがログインしていません');
      }

      const userId = session.user.id;

      // ブロック・参加済みイベント・★登録ユーザーを並列で取得（以前は直列で4回）
      const [
        { data: blocks },
        { data: participatingEvents },
        { data: starredUsers },
      ] = await Promise.all([
        supabase.from('blocks').select('blocked_user_id').eq('user_id', userId),
        // 自分が参加中のイベント（left_atがnull）だけを除外する。
        // event_applications の approved は退会後も残ることがあるため除外条件に使わない
        // （退会したイベントが一覧に再表示されない不具合の修正）
        supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', userId)
          .is('left_at', null),
        supabase.from('stars').select('target_user_id').eq('user_id', userId),
      ]);

      const blockedUserIds = blocks?.map(b => b.blocked_user_id) || [];
      const excludedEventIds = [...new Set(participatingEvents?.map(p => p.event_id) || [])];

      // ベースクエリ
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
          solo_ok,
          tags,
          photos,
          host_user_id,
          resort_id,
          status,
          created_at,
          resorts(id, name, name_en),
          profiles!posts_events_host_user_id_fkey(
            user_id,
            display_name,
            avatar_url,
            level,
            languages,
            users!profiles_user_id_fkey(role)
          ),
          event_participants(user_id, left_at)
        `)
        .eq('status', 'open')
        .gte('start_at', new Date().toISOString())
        .neq('host_user_id', userId); // 自分がホストのイベントを除外

      // ブロックユーザー除外
      if (blockedUserIds.length > 0) {
        query = query.not('host_user_id', 'in', `(${blockedUserIds.join(',')})`);
      }

      // 参加中のイベント除外
      if (excludedEventIds.length > 0) {
        query = query.not('id', 'in', `(${excludedEventIds.join(',')})`);
      }

      // キーワード検索（タイトル、説明、タグを検索）
      if (filters.keyword) {
        query = query.or(
          `title.ilike.%${filters.keyword}%,` +
          `description.ilike.%${filters.keyword}%,` +
          `tags.cs.{${filters.keyword}}`
        );
      }

      // カテゴリフィルター
      if (filters.category) {
        query = query.eq('type', filters.category);
      }

      // スキー場フィルター
      if (filters.resortIds && filters.resortIds.length > 0) {
        query = query.in('resort_id', filters.resortIds);
      }

      // 一人参加OKのみ
      if (filters.soloOnly) {
        query = query.eq('solo_ok', true);
      }

      // レベルフィルター
      if (filters.skillLevel) {
        query = query.eq('level_required', filters.skillLevel);
      }

      // 日付範囲フィルター
      if (filters.dateRange?.start) {
        query = query.gte('start_at', filters.dateRange.start);
      }
      if (filters.dateRange?.end) {
        query = query.lte('start_at', filters.dateRange.end);
      }

      // ソート（DBレベル）
      if (sort.sortBy === 'date') {
        query = query.order('start_at', { ascending: sort.order === 'asc' });
      } else if (sort.sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      }

      // ページネーション
      const rangeStart = pageNum * pageSize;
      const rangeEnd = (pageNum + 1) * pageSize;
      query = query.range(rangeStart, rangeEnd);

      const { data, error } = await query;

      if (error) throw error;

      let results = data || [];

      const starredUserIds = starredUsers?.map(s => s.target_user_id) || [];
      const starredUserIdSet = new Set(starredUserIds);

      // 参加者数と★登録された参加者（埋め込み取得した参加者から計算。以前はイベントごとに1クエリ）
      const eventsWithParticipants = results.map((event: any) => {
        const activeParticipantIds: string[] = (event.event_participants || [])
          .filter((p: any) => p.left_at === null)
          .map((p: any) => p.user_id);

        return {
          ...event,
          spotsTaken: activeParticipantIds.length,
          starredParticipants: activeParticipantIds.filter(id => starredUserIdSet.has(id)),
        };
      });

      results = eventsWithParticipants;

      // 言語フィルター（後処理）
      if (filters.languages && filters.languages.length > 0) {
        results = results.filter(event => {
          const hostLanguages = event.profiles?.languages || [];
          return filters.languages!.some(lang =>
            hostLanguages.includes(lang)
          );
        });
      }

      // 空き状況フィルター（後処理）
      if (filters.hasAvailability) {
        results = results.filter(event => {
          const participantCount = event.spotsTaken || 0;
          return participantCount < event.capacity_total;
        });
      }

      // 満員のイベントを除外（常に適用）
      results = results.filter(event => {
        const participantCount = event.spotsTaken || 0;
        return participantCount < (event.capacity_total || 0);
      });

      // 人気順ソート（後処理）
      if (sort.sortBy === 'popular') {
        results.sort((a, b) => {
          const aCount = a.spotsTaken || 0;
          const bCount = b.spotsTaken || 0;
          return sort.order === 'asc' ? aCount - bCount : bCount - aCount;
        });
      }

      // DiscoverEvent型に変換
      const discoverEvents: DiscoverEvent[] = results.map(event => {
        // 画像URLを生成
        const photoUrls: string[] = [];
        if (event.photos && event.photos.length > 0) {
          event.photos.forEach((photoPath: string) => {
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
          soloOk: !!event.solo_ok,
          tags: event.tags || [],
          photoUrl: photoUrls[0] || null,
          photoUrls,
          hostUserId: event.host_user_id,
          hostRole: event.profiles?.users?.role || 'user',
          isHostStarred: starredUserIds.includes(event.host_user_id),
          starredParticipants: event.starredParticipants || [],
        };
      });

      const hasMore = discoverEvents.length === pageSize + 1;
      const eventsToReturn = hasMore ? discoverEvents.slice(0, pageSize) : discoverEvents;

      setState({ status: 'success', events: eventsToReturn, hasMore });
    } catch (error) {
      console.error('Error in useExplore:', error);
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  useEffect(() => {
    setCurrentPage(0);
    load(0);
  }, [
    filters.keyword,
    filters.category,
    filters.resortIds,
    filters.skillLevel,
    filters.dateRange,
    filters.languages,
    filters.hasAvailability,
    filters.soloOnly,
    sort.sortBy,
    sort.order,
  ]);

  const refetch = () => {
    setCurrentPage(0);
    load(0);
  };

  const loadMore = () => {
    if (state.status === 'success' && state.hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      load(nextPage);
    }
  };

  return {
    ...state,
    refetch,
    loadMore,
  };
}
