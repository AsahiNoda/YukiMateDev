import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Resort {
  id: string;
  name: string;
  area: string;
}

type ResortsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; resorts: Resort[] };

/**
 * リゾート一覧取得フック
 */
export function useResorts(): ResortsState {
  const [state, setState] = useState<ResortsState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('resorts')
          .select('id, name, area')
          .order('name', { ascending: true });

        if (error) throw error;

        if (!isMounted) return;

        setState({
          status: 'success',
          resorts: data || [],
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading resorts:', error);
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
  }, []);

  return state;
}
