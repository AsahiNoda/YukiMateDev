import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Event} from '@/lib/database.types';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
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

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function refetch() {
    await fetchEvents();
  }

  return { events, loading, error, refetch };
}