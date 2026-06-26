import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/database.types';
import { fetchWithCache, setCache, removeCache } from '@/lib/cache';

/**
 * イベントのキャッシュキー
 */
const EVENTS_CACHE_KEY = 'events_list';
const EVENT_DETAIL_CACHE_PREFIX = 'event_detail_';

/**
 * イベント一覧を取得する関数
 */
async function fetchEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      host:profiles!events_host_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        country_code,
        skill_level
      ),
      resort:resorts(
        id,
        name,
        name_en,
        location
      ),
      event_applications!event_applications_event_id_fkey(
        id,
        status
      )
    `)
    .eq('status', 'open')
    .order('date', { ascending: true });

  if (error) throw error;

  // データを型に合わせて変換
  const formattedEvents: Event[] = (data || []).map((event: any) => {
    // 承認された参加者数を計算（ホストを除く）
    const approvedApplications = (event.event_applications || []).filter(
      (app: any) => app.status === 'approved'
    ).length;
    // ホスト自身も参加者なので+1
    const currentParticipants = approvedApplications + 1;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      resortId: event.resort_id,
      resortName: event.resort?.name,
      resort: event.resort,
      hostId: event.host_id,
      host: event.host ? {
        id: event.host.id,
        username: event.host.username,
        displayName: event.host.display_name || event.host.username,
        avatar: event.host.avatar_url,
        countryCode: event.host.country_code,
        skillLevel: event.host.skill_level,
        ridingStyle: [],
        createdAt: '',
      } : undefined,
      date: event.date,
      maxParticipants: event.max_participants,
      currentParticipants,
      skillLevel: event.skill_level,
      status: event.status,
      imageUrl: event.image_url,
      createdAt: event.created_at,
    };
  });

  return formattedEvents;
}

/**
 * イベント一覧を取得するカスタムフック（React Query版）
 * オフライン対応とキャッシュ機能付き
 */
export function useEventsQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      // AsyncStorageキャッシュとReact Queryキャッシュの両方を使用
      return fetchWithCache(
        EVENTS_CACHE_KEY,
        fetchEvents,
        { expiryMs: 1000 * 60 * 5 } // 5分間キャッシュ
      );
    },
    staleTime: 1000 * 60 * 3, // 3分間はfreshと見なす
    gcTime: 1000 * 60 * 30, // 30分間キャッシュを保持
  });

  // 手動でリフレッシュする関数
  const refetch = async () => {
    // キャッシュをクリアして強制的に再フェッチ
    await removeCache(EVENTS_CACHE_KEY);
    return queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  return {
    events: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch,
    isRefreshing: query.isRefetching,
  };
}

/**
 * イベント詳細を取得する関数
 */
async function fetchEventDetail(eventId: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      host:profiles!events_host_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        country_code,
        skill_level
      ),
      resort:resorts(
        id,
        name,
        name_en,
        location
      ),
      event_applications!event_applications_event_id_fkey(
        id,
        status,
        user_id,
        created_at,
        user:profiles(
          id,
          username,
          display_name,
          avatar_url,
          country_code,
          skill_level
        )
      )
    `)
    .eq('id', eventId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Event not found');

  // 承認された参加者数を計算
  const approvedApplications = (data.event_applications || []).filter(
    (app: any) => app.status === 'approved'
  ).length;
  const currentParticipants = approvedApplications + 1;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    resortId: data.resort_id,
    resortName: data.resort?.name,
    resort: data.resort,
    hostId: data.host_id,
    host: data.host ? {
      id: data.host.id,
      username: data.host.username,
      displayName: data.host.display_name || data.host.username,
      avatar: data.host.avatar_url,
      countryCode: data.host.country_code,
      skillLevel: data.host.skill_level,
      ridingStyle: [],
      createdAt: '',
    } : undefined,
    date: data.date,
    maxParticipants: data.max_participants,
    currentParticipants,
    skillLevel: data.skill_level,
    status: data.status,
    imageUrl: data.image_url,
    createdAt: data.created_at,
    applications: data.event_applications,
  };
}

/**
 * イベント詳細を取得するカスタムフック
 */
export function useEventDetailQuery(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');

      const cacheKey = `${EVENT_DETAIL_CACHE_PREFIX}${eventId}`;
      return fetchWithCache(
        cacheKey,
        () => fetchEventDetail(eventId),
        { expiryMs: 1000 * 60 * 5 } // 5分間キャッシュ
      );
    },
    enabled: !!eventId, // eventIdが存在する場合のみクエリを実行
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 30,
  });

  // 手動でリフレッシュする関数
  const refetch = async () => {
    if (!eventId) return;
    const cacheKey = `${EVENT_DETAIL_CACHE_PREFIX}${eventId}`;
    await removeCache(cacheKey);
    return queryClient.invalidateQueries({ queryKey: ['event', eventId] });
  };

  return {
    event: query.data,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch,
    isRefreshing: query.isRefetching,
  };
}

/**
 * イベント作成のミューテーション
 */
interface CreateEventData {
  title: string;
  description: string;
  category: string;
  resortId: string;
  date: string;
  maxParticipants: number;
  skillLevel: string;
  imageUrl?: string;
}

export function useCreateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          category: eventData.category,
          resort_id: eventData.resortId,
          host_id: session.session.user.id,
          date: eventData.date,
          max_participants: eventData.maxParticipants,
          skill_level: eventData.skillLevel,
          image_url: eventData.imageUrl,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // イベント作成成功後、キャッシュをクリアしてイベント一覧を再フェッチ
      await removeCache(EVENTS_CACHE_KEY);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      console.log('✅ Event created, cache invalidated');
    },
  });
}

export default {
  useEventsQuery,
  useEventDetailQuery,
  useCreateEventMutation,
};
