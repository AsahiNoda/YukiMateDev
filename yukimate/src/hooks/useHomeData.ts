import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchWeatherData } from '@/services/weatherApi';
import { getResortName } from '@/utils/resort-helpers';
import { mockHomeData, type HomeData } from '@data/mockHomeData';
import { useFocusEffect } from '@react-navigation/native';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from './useTranslation';

export type FavoriteResortInfo = {
  id: string;
  name: string;
  name_en: string | null;
  area: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  /** プロフィールのホームゲレンデ（profiles.home_resort_id） */
  isHome?: boolean;
};

type BaseState =
  | { status: 'loading'; data: null }
  | { status: 'error'; error: string; data: null }
  | { status: 'success'; data: HomeData };

export type HomeDataResult = BaseState & {
  /** ユーザーのお気に入りスキー場（天気の切り替え表示用） */
  favorites: FavoriteResortInfo[];
  /** 現在表示中のリゾートID */
  selectedResortId: string | null;
  /** 表示リゾートを切り替える */
  setSelectedResortId: (id: string) => void;
};

/** React Query のキー（他画面から invalidate できるよう export） */
export const homeQueryKeys = {
  all: ['home'] as const,
  favorites: (userId: string | undefined) => ['home', 'favorites', userId] as const,
  feed: (locale: string) => ['home', 'feed', locale] as const,
  weather: (resortId: string | undefined) => ['home', 'weather', resortId] as const,
};

const toPublicUrl = (bucket: string, path: string) =>
  path.startsWith('http') ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

/**
 * ホームに出すゲレンデ。今はプロフィールのホームゲレンデ（profiles.home_resort_id）だけを使う。
 * お気に入りスキー場（favorite_resorts）はマイページの表示用として残しているが、ホームの切り替えには使わない。
 * （以前はお気に入りの先頭を使っていたため、ホームゲレンデを変えてもホームに反映されなかった）
 * 将来お気に入りで切り替えられるようにするときは、ここに favorite_resorts を足せば一覧になる。
 */
async function fetchFavorites(userId: string): Promise<FavoriteResortInfo[]> {
  const RESORT_FIELDS = 'id, name, name_en, area, region, latitude, longitude';
  const { data, error } = await supabase
    .from('profiles')
    .select(`home_resort:resorts!profiles_home_resort_id_fkey(${RESORT_FIELDS})`)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  const one = (value: any) => (Array.isArray(value) ? value[0] : value);
  const home = one((data as any)?.home_resort) as FavoriteResortInfo | null | undefined;
  return home?.id ? [{ ...home, isHome: true }] : [];
}

/** おすすめイベントと人気投稿（互いに依存しないので並列取得） */
async function fetchHomeFeed(locale: string) {
  const [eventsRes, trendingRes] = await Promise.all([
    supabase
      .from('posts_events')
      .select(`
        id,
        title,
        photos,
        host_user_id,
        resorts(name, name_en, area, region),
        profiles!posts_events_host_user_id_fkey(
          user_id,
          users!profiles_user_id_fkey(role)
        ),
        event_participants(count)
      `)
      .eq('status', 'open')
      .gte('start_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('posts_snow')
      .select(`
        id,
        comment,
        like_count,
        created_at,
        snow_tag,
        resort_id,
        resorts!posts_snow_resort_id_fkey(name, name_en),
        photos
      `)
      .order('like_count', { ascending: false })
      .limit(5),
  ]);

  if (eventsRes.error) throw eventsRes.error;

  const featuredEvents = (eventsRes.data || []).map((event: any) => ({
    id: event.id,
    title: event.title,
    photoUrl: event.photos && event.photos.length > 0 ? toPublicUrl('event_images', event.photos[0]) : null,
    hostRole: event.profiles?.users?.role || 'user',
    resortName: event.resorts ? getResortName(event.resorts, locale as any) : '',
    resortArea: event.resorts?.area,
    resortRegion: event.resorts?.region,
    startAt: '',
    endAt: '',
    levelRequired: 'beginner' as const,
    spotsTaken: event.event_participants?.[0]?.count || 0,
    capacityTotal: 0,
    pricePerPersonJpy: 0,
  }));

  // Sort: developer/official first
  const priority = (role: string) => (role === 'developer' ? 0 : role === 'official' ? 1 : 2);
  featuredEvents.sort((a, b) => priority(a.hostRole) - priority(b.hostRole));

  const trendingPosts = (trendingRes.data || []).map((post: any) => ({
    id: post.id,
    resortName: post.resorts ? getResortName(post.resorts, locale as any) : 'Unknown Resort',
    photoUrl: post.photos && post.photos.length > 0 ? toPublicUrl('snow_images', post.photos[0]) : null,
    snowTag: post.snow_tag || 'Snow',
    comment: post.comment || '',
    likeCount: post.like_count || 0,
    createdAt: post.created_at,
  }));

  return { featuredEvents, trendingPosts };
}

export function useHomeData(): HomeDataResult {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  const [userSelectedResortId, setSelectedResortId] = useState<string | null>(null);

  // 画面に戻ってきたとき: 古くなった（stale）データだけ再取得する
  // （以前はフォーカスのたびに全データを取り直していた）
  useFocusEffect(
    useCallback(() => {
      // cancelRefetch: false → 取得中のリクエストがあればキャンセルせずに合流（初回表示時の二重取得を防ぐ）
      queryClient.refetchQueries(
        { queryKey: homeQueryKeys.all, type: 'active', stale: true },
        { cancelRefetch: false }
      );
    }, [queryClient])
  );

  // お気に入りスキー場（他画面で変更されうるので常に stale 扱い。軽いクエリ）
  const favoritesQuery = useQuery({
    queryKey: homeQueryKeys.favorites(userId),
    queryFn: () => fetchFavorites(userId!),
    enabled: !!userId,
    staleTime: 0,
  });

  // イベント・人気投稿（お気に入り取得を待たずに並列で開始）
  const feedQuery = useQuery({
    queryKey: homeQueryKeys.feed(locale),
    queryFn: () => fetchHomeFeed(locale),
    staleTime: 1000 * 60 * 2,
  });

  const favorites = favoritesQuery.data ?? [];

  // ホームゲレンデが変わったら、選んでいたゲレンデを解除して新しいホームゲレンデを表示する
  const homeResortId = favorites.find((f) => f.isHome)?.id ?? null;
  const prevHomeResortId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!favoritesQuery.isSuccess) return;
    if (prevHomeResortId.current !== undefined && prevHomeResortId.current !== homeResortId) {
      setSelectedResortId(null);
    }
    prevHomeResortId.current = homeResortId;
  }, [homeResortId, favoritesQuery.isSuccess]);

  const selectedResortId =
    userSelectedResortId && favorites.some((f) => f.id === userSelectedResortId)
      ? userSelectedResortId
      : favorites[0]?.id ?? null;
  const resort = favorites.find((f) => f.id === selectedResortId) ?? null;

  // 天気（外部API。リゾートごとに15分キャッシュ）
  const weatherQuery = useQuery({
    queryKey: homeQueryKeys.weather(resort?.id),
    queryFn: async () => {
      const coordinates =
        resort!.latitude && resort!.longitude
          ? { latitude: resort!.latitude, longitude: resort!.longitude }
          : undefined;
      return (await fetchWeatherData(resort!.id, coordinates, resort!.area ?? undefined)) ?? null;
    },
    enabled: !!resort,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    // リゾート切り替え中は前の天気を表示し続ける
    placeholderData: keepPreviousData,
  });

  const base = { favorites, selectedResortId, setSelectedResortId };

  if (feedQuery.isError && !feedQuery.data) {
    const error = feedQuery.error;
    return {
      status: 'error',
      error: error instanceof Error ? error.message : (error as any)?.message || 'Unknown error',
      data: null,
      ...base,
    };
  }

  // 初回のみローディング表示（お気に入り → 天気 の確定まで待ち、
  // 天気未取得の状態で「お気に入り未設定」カードが一瞬出るのを防ぐ）
  const favoritesPending = userId ? favoritesQuery.isPending : authLoading;
  const weatherPending = !!resort && weatherQuery.isPending;
  if (!feedQuery.data || favoritesPending || weatherPending) {
    return { status: 'loading', data: null, ...base };
  }

  const weather = weatherQuery.data;
  const weatherData =
    resort && weather
      ? {
          resortName: getResortName(resort, locale),
          description: `${weather.snowQuality} snow with ${weather.visibility} visibility`,
          temperatureC: weather.tempC,
          newSnowCm: weather.newSnowCm,
          snowDepthCm: weather.baseDepthCm,
          windSpeedMs: weather.windMs,
          visibility: weather.visibility,
          snowQuality: weather.snowQuality,
          weatherCode: weather.weatherCode,
          observedAt: weather.observedAt ?? null,
        }
      : null;

  const { featuredEvents, trendingPosts } = feedQuery.data;

  return {
    status: 'success',
    data: {
      weather: resort ? (weatherData as any) : null, // お気に入り未設定の場合はnull
      recommendedEvents: featuredEvents as any,
      suggestedEvents: [],
      trendingPosts: trendingPosts.length > 0 ? (trendingPosts as any) : mockHomeData.trendingPosts,
    },
    ...base,
  };
}
