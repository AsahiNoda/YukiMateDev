import { supabase } from '@/lib/supabase';
import { mockHomeData, type HomeData } from '@data/mockHomeData';
import { fetchWeatherData } from '@/services/weatherApi';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

type HomeDataState =
  | { status: 'loading'; data: null }
  | { status: 'error'; error: string; data: null }
  | { status: 'success'; data: HomeData };

export function useHomeData(): HomeDataState {
  const [state, setState] = useState<HomeDataState>({ status: 'loading', data: null });
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setRefreshKey(prev => prev + 1);
    }, [])
  );

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
            profiles!posts_events_host_user_id_fkey(
              user_id,
              users!profiles_user_id_fkey(role)
            )
          `)
          .eq('status', 'open')
          .gte('start_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        // Transform to match HomeData structure
        const featuredEvents = events?.map(event => ({
          id: event.id,
          title: event.title,
          photoUrl: event.photos && event.photos.length > 0
            ? (event.photos[0].startsWith('http')
              ? event.photos[0]
              : supabase.storage.from('event_images').getPublicUrl(event.photos[0]).data.publicUrl)
            : null,
          hostRole: event.profiles?.users?.role || 'user',
          resortName: '', // Not needed for featured cards
          startAt: '', // Not needed for featured cards
          endAt: '', // Not needed for featured cards
          levelRequired: 'beginner' as const, // Not needed for featured cards
          spotsTaken: 0,
          capacityTotal: 0,
          pricePerPersonJpy: 0,
        })) || [];

        // Sort: developer/official first
        featuredEvents.sort((a, b) => {
          const priorityA = a.hostRole === 'developer' ? 0 : a.hostRole === 'official' ? 1 : 2;
          const priorityB = b.hostRole === 'developer' ? 0 : b.hostRole === 'official' ? 1 : 2;
          return priorityA - priorityB;
        });

        // Fetch user's home resort from profile
        const { data: { user } } = await supabase.auth.getUser();

        let resort = null;
        let resortError = null;

        if (user) {
          // Get user's profile to find home resort
          const { data: profile } = await supabase
            .from('profiles')
            .select('home_resort_id')
            .eq('user_id', user.id)
            .single();

          if (profile?.home_resort_id) {
            // Fetch home resort details
            const { data: homeResort, error: homeResortError } = await supabase
              .from('resorts')
              .select('id, name, area, latitude, longitude')
              .eq('id', profile.home_resort_id)
              .single();

            resort = homeResort;
            resortError = homeResortError;
          }
        }

        // Fallback to first searchable resort if no home resort
        if (!resort) {
          const { data: defaultResort, error: defaultError } = await supabase
            .from('resorts')
            .select('id, name, area, latitude, longitude')
            .eq('searchable', true)
            .order('name')
            .limit(1)
            .single();

          resort = defaultResort;
          resortError = defaultError;
        }

        let weatherData = null;

        if (!resortError && resort) {
          console.log('[useHomeData] Fetching weather for:', resort.name);

          // Fetch weather data using coordinates from database
          const coordinates = resort.latitude && resort.longitude
            ? { latitude: resort.latitude, longitude: resort.longitude }
            : undefined;

          const weather = await fetchWeatherData(
            resort.id,
            coordinates,
            resort.area
          );

          if (weather) {
            weatherData = {
              resortName: resort.name,
              description: `${weather.snowQuality} snow with ${weather.visibility} visibility`,
              temperatureC: weather.tempC,
              newSnowCm: weather.newSnowCm,
              snowDepthCm: weather.baseDepthCm,
              windSpeedMs: weather.windMs,
              visibility: weather.visibility,
              snowQuality: weather.snowQuality,
            };
          }
        }

        // Fetch trending posts from posts_snow
        const { data: trendingPostsData, error: postsError } = await supabase
          .from('posts_snow')
          .select(`
            id,
            comment,
            like_count,
            created_at,
            snow_tag,
            resort_id,
            resorts!posts_snow_resort_id_fkey(name),
            photos
          `)
          .order('like_count', { ascending: false })
          .limit(5);

        const trendingPosts = trendingPostsData?.map(post => ({
          id: post.id,
          resortName: post.resorts?.name || 'Unknown Resort',
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
            weather: weatherData || mockHomeData.weather,
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
  }, [refreshKey]);

  return state;
}
