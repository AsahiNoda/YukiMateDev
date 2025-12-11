import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export interface SavedPost {
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

interface SavedPostsHookReturn {
    posts: SavedPost[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useSavedPosts(): SavedPostsHookReturn {
    const [posts, setPosts] = useState<SavedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSavedPosts();
    }, []);

    async function fetchSavedPosts() {
        try {
            setLoading(true);
            setError(null);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('ログインが必要です');
            }

            // 保存した投稿を取得 (saved_events テーブルから)
            const { data: bookmarksData, error: bookmarksError } = await supabase
                .from('saved_events')
                .select(`
          event_id,
          posts_events(
            id,
            title,
            description,
            start_at,
            end_at,
            capacity_total,
            photos,
            status,
            resorts(id, name)
          )
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (bookmarksError) throw bookmarksError;

            if (!bookmarksData || bookmarksData.length === 0) {
                setPosts([]);
                setLoading(false);
                return;
            }

            // ステータスが "open" のもののみをフィルタリング
            const openEvents = bookmarksData.filter((bookmark: any) =>
                bookmark.posts_events && bookmark.posts_events.status === 'open'
            );

            // 各イベントの参加者数を取得してマッピング
            const postsWithDetails = await Promise.all(
                openEvents.map(async (bookmark: any) => {
                    const event = bookmark.posts_events;

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

                    const savedPost: SavedPost = {
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

                    return savedPost;
                })
            );

            setPosts(postsWithDetails);
        } catch (err: any) {
            console.error('Fetch saved posts error:', err);
            setError(err.message || '保存した投稿の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }

    return { posts, loading, error, refetch: fetchSavedPosts };
}
