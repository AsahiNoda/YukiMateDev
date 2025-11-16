import { useEffect, useState } from 'react';
import { mockHomeData, type HomeData } from '@data/mockHomeData';

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
        // Small delay so loading UI can show
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!isMounted) return;

        setState({ status: 'success', data: mockHomeData });
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

