import { useEffect, useState } from 'react';
import { mockDiscoverEvents } from '@data/mockDiscoverEvents';
import type { DiscoverEvent, EventFilterOptions } from '@types';

type DiscoverEventsState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; events: DiscoverEvent[] };

export function useDiscoverEvents(_options: EventFilterOptions = {}): DiscoverEventsState {
  const [state, setState] = useState<DiscoverEventsState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!isMounted) return;

        setState({ status: 'success', events: mockDiscoverEvents });
      } catch (error) {
        if (!isMounted) return;
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

export async function applyToEvent(
  _eventId: string,
  _message?: string
): Promise<{ success: boolean; error?: string }> {
  // In mock mode, always succeed without hitting a backend.
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { success: true };
}

