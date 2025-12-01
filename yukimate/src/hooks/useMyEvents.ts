import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export interface MyEvent {
    id: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string | null;
    capacityTotal: number;
    participantsCount: number;
    resortName: string;
    photos: string[];
    status: 'upcoming' | 'ongoing' | 'ended';
}

interface MyEventsHookReturn {
    events: MyEvent[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useMyEvents(): MyEventsHookReturn {
    const [events, setEvents] = useState<MyEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMyEvents();
    }, []);

    async function fetchMyEvents() {
        try {
            setLoading(true);
            setError(null);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('ログインが必要です');
            }

            // 自分がホストのイベントを取得
            const { data: eventsData, error: eventsError } = await supabase
                .from('posts_events')
                .select(`
          id,
          title,
          description,
          start_at,
          end_at,
          capacity_total,
          photos,
          resorts(id, name)
        `)
                .eq('host_user_id', user.id)
                .order('start_at', { ascending: false });

            if (eventsError) throw eventsError;

            if (!eventsData || eventsData.length === 0) {
                setEvents([]);
                setLoading(false);
                return;
            }

            // 各イベントの参加者数を取得してマッピング
            const eventsWithDetails = await Promise.all(
                eventsData.map(async (event: any) => {
                    // 参加者数を取得
                    const { count } = await supabase
                        .from('event_participants')
                        .select('*', { count: 'exact', head: true })
                        .eq('event_id', event.id)
                        .is('left_at', null);

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

                    // ステータスを判定
                    const now = new Date();
                    const startAt = new Date(event.start_at);
                    const endAt = event.end_at ? new Date(event.end_at) : null;

                    let status: 'upcoming' | 'ongoing' | 'ended' = 'upcoming';
                    if (endAt && now > endAt) {
                        status = 'ended';
                    } else if (now >= startAt) {
                        status = 'ongoing';
                    }

                    const myEvent: MyEvent = {
                        id: event.id,
                        title: event.title,
                        description: event.description,
                        startAt: event.start_at,
                        endAt: event.end_at,
                        capacityTotal: event.capacity_total || 0,
                        participantsCount: count || 0,
                        resortName: event.resorts?.name || 'Unknown Resort',
                        photos: photoUrls,
                        status,
                    };

                    return myEvent;
                })
            );

            setEvents(eventsWithDetails);
        } catch (err: any) {
            console.error('Fetch my events error:', err);
            setError(err.message || 'イベントの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }

    return { events, loading, error, refetch: fetchMyEvents };
}
