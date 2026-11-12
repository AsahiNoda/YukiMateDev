import { supabase } from '@/lib/supabase';
import { fetchWeatherData } from '@/services/weatherApi';
import { getResortName } from '@/utils/resort-helpers';
import { mockHomeData, type HomeData } from '@data/mockHomeData';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from './useTranslation';

export type FavoriteResortInfo = {
  id: string;
  name: string;
  name_en: string | null;
  area: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
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

export function useHomeData(): HomeDataResult {
  const [state, setState] = useState<BaseState>({ status: 'loading', data: null });
  const [favorites, setFavorites] = useState<FavoriteResortInfo[]>([]);
  const [selectedResortId, setSelectedResortId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { locale } = useTranslation();

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setRefreshKey((prev) => prev + 1);
    }, [])
  );

  // お気に入りスキー場を取得し、選択中リゾートを決定
  useEffect(() => {
    let isMounted = true;

    const loadFavorites = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: favRows } = await supabase
        .from('favorite_resorts')
        .select('resort_id, resorts(id, name, name_en, area, region, latitude, longitude)')
        .eq('user_id', user.id);

      if (!isMounted) return;

      const favs = (favRows || [])
        .map((row: any) => row.resorts)
        .filter(Boolean) as FavoriteResortInfo[];

      setFavorites(favs);
      setSelectedResortId((prev) => {
        if (prev && favs.some((f) => f.id === prev)) return prev;
        return favs.length > 0 ? favs[0].id : null;
      });
    };

    loadFavorites();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // イベント・天気・トレンド投稿を取得（選択リゾートの天気を表示）
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        // Fetch featured events (real data)
        const { data: events, error } = await supabase
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
          .limit(10);

        if (error) throw error;

        const featuredEvents = events?.map((event) => ({
          id: event.id,
          title: event.title,
          photoUrl: event.photos && event.photos.length > 0
            ? (event.photos[0].startsWith('http')
              ? event.photos[0]
              : supabase.storage.from('event_images').getPublicUrl(event.photos[0]).data.publicUrl)
            : null,
          hostRole: event.profiles?.users?.role || 'user',
          resortName: event.resorts ? getResortName(event.resorts, locale) : '',
          resortArea: event.resorts?.area,
          resortRegion: event.resorts?.region,
          startAt: '',
          endAt: '',
          levelRequired: 'beginner' as const,
          spotsTaken: event.event_participants?.[0]?.count || 0,
          capacityTotal: 0,
          pricePerPersonJpy: 0,
        })) || [];

        // Sort: developer/official first
        featuredEvents.sort((a, b) => {
          const priorityA = a.hostRole === 'developer' ? 0 : a.hostRole === 'official' ? 1 : 2;
          const priorityB = b.hostRole === 'developer' ? 0 : b.hostRole === 'official' ? 1 : 2;
          return priorityA - priorityB;
        });

        // 選択中のお気に入りリゾートの天気を取得
        const resort = favorites.find((f) => f.id === selectedResortId) || null;
        let weatherData = null;

        if (resort) {
          console.log('[useHomeData] Fetching weather for:', resort.name);
          const coordinates = resort.latitude && resort.longitude
            ? { latitude: resort.latitude, longitude: resort.longitude }
            : undefined;

          const weather = await fetchWeatherData(resort.id, coordinates, resort.area ?? undefined);

          if (weather) {
            weatherData = {
              resortName: getResortName(resort, locale),
              description: `${weather.snowQuality} snow with ${weather.visibility} visibility`,
              temperatureC: weather.tempC,
              newSnowCm: weather.newSnowCm,
              snowDepthCm: weather.baseDepthCm,
              windSpeedMs: weather.windMs,
              visibility: weather.visibility,
              snowQuality: weather.snowQuality,
              weatherCode: weather.weatherCode,
            };
          }
        }

        // Fetch trending posts from posts_snow
        const { data: trendingPostsData } = await supabase
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
          .limit(5);

        const trendingPosts = trendingPostsData?.map((post) => ({
          id: post.id,
          resortName: post.resorts ? getResortName(post.resorts, locale) : 'Unknown Resort',
          photoUrl: post.photos && post.photos.length > 0
            ? (post.photos[0].startsWith('http')
              ? post.photos[0]
              : supabase.storage.from('snow_images').getPublicUrl(post.photos[0]).data.publicUrl)
            : null,
          snowTag: post.snow_tag || 'Snow',
          comment: post.comment || '',
          likeCount: post.like_count || 0,
          createdAt: post.created_at,
        })) || [];

        if (!isMounted) return;

        setState({
          status: 'success',
          data: {
            weather: resort ? weatherData : null, // お気に入り未設定の場合はnull
            recommendedEvents: featuredEvents,
            suggestedEvents: [],
            trendingPosts: trendingPosts.length > 0 ? trendingPosts : mockHomeData.trendingPosts,
          },
        });
      } catch (error) {
        if (!isMounted) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null,
        });
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [refreshKey, selectedResortId, favorites, locale]);

  return { ...state, favorites, selectedResortId, setSelectedResortId };
}
