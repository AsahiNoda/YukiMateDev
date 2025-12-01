import { supabase } from '@/lib/supabase';
import type { DiscoverEvent } from '@types';
import { useEffect, useState } from 'react';

/**
 * Explore検索フィルター
 */
export interface ExploreFilters {
  keyword?: string;
  category?: 'event' | 'lesson' | 'filming' | 'group';
  resortIds?: number[];
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  dateRange?: {
    start?: string;
    end?: string;
  };
  languages?: string[];
  hasAvailability?: boolean; // 空きがあるもののみ
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

      // ブロックしたユーザーIDリストを取得
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_user_id')
        .eq('user_id', userId);

      const blockedUserIds = blocks?.map(b => b.blocked_user_id) || [];

      // 自分がapprovedされたイベントIDリストを取得
      const { data: approvedApplications } = await supabase
        .from('event_applications')
        .select('event_id')
        .eq('applicant_user_id', userId)
        .eq('status', 'approved');

      const approvedEventIds = approvedApplications?.map(a => a.event_id) || [];

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
          tags,
          photos,
          host_user_id,
          resort_id,
          status,
          created_at,
          resorts(id, name),
          profiles!posts_events_host_user_id_fkey(
            user_id,
            display_name,
            avatar_url,
            level,
            languages,
            users!profiles_user_id_fkey(role)
          )
        `)
        .eq('status', 'open')
        .gte('start_at', new Date().toISOString())
        .neq('host_user_id', userId); // 自分がホストのイベントを除外

      // ブロックユーザー除外
      if (blockedUserIds.length > 0) {
        query = query.not('host_user_id', 'in', `(${blockedUserIds.join(',')})`);
      }

      // approvedされたイベント除外
      if (approvedEventIds.length > 0) {
        query = query.not('id', 'in', `(${approvedEventIds.join(',')})`);
      }

      // キーワード検索
      if (filters.keyword) {
        query = query.or(
          `title.ilike.%${filters.keyword}%,` +
          `description.ilike.%${filters.keyword}%`
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

      // 参加者数を取得
      const eventsWithParticipants = await Promise.all(
        results.map(async (event) => {
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
          resortName: event.resorts?.name || 'Unknown Resort',
          startAt: event.start_at,
          endAt: event.end_at,
          capacityTotal: event.capacity_total || 0,
          spotsTaken: event.spotsTaken,
          levelRequired: event.level_required,
          pricePerPersonJpy: event.price_per_person_jpy,
          meetingPlace: event.meeting_place,
          tags: event.tags || [],
          photoUrl: photoUrls[0] || null,
          photoUrls,
          hostUserId: event.host_user_id,
          hostRole: event.profiles?.users?.role || 'user',
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
