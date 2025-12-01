import { supabase } from '@/lib/supabase';
import { mockHomeData, type HomeData } from '@data/mockHomeData';
import { useEffect, useState } from 'react';

type HomeDataState =
  | { status: 'loading'; data: null }
  | { status: 'error'; error: string; data: null }
  | { status: 'success'; data: HomeData };

export function useHomeData(): HomeDataState {
  const [state, setState] = useState<HomeDataState>({ status: 'loading', data: null });

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

        if (!isMounted) return;

        setState({
          status: 'success',
          data: {
            ...mockHomeData,
            recommendedEvents: featuredEvents,
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
  }, []);

  return state;
}
