import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import type { SocialResortRating as ResortRating, SnowfeedWeather, SnowfeedPost, SnowfeedData } from '@types';

type SnowfeedState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: SnowfeedData };

export function useSnowfeed(resortId: string | null): SnowfeedState {
  const [state, setState] = useState<SnowfeedState>({ status: 'loading' });

  useEffect(() => {
    if (!resortId) {
      setState({ status: 'success', data: { rating: null, weather: null, posts: [] } });
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        // 1. レーティングサマリーを取得
        const { data: ratingData, error: ratingError } = await supabase
          .from('resort_rating_summary')
          .select('*')
          .eq('resort_id', resortId)
          .single();

        if (ratingError && ratingError.code !== 'PGRST116') {
          // PGRST116は「行が見つからない」エラー（許容）
          console.warn('レーティング取得エラー:', ratingError);
        }

        // 2. 天気データを取得
        const { data: weatherData, error: weatherError } = await supabase
          .from('weather_daily_cache')
          .select('*')
          .eq('resort_id', resortId)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (weatherError && weatherError.code !== 'PGRST116') {
          console.warn('天気データ取得エラー:', weatherError);
        }

        // 3. 投稿を取得
        const { data: postsData, error: postsError } = await supabase
          .from('feed_posts')
          .select(
            `
            id,
            user_id,
            resort_id,
            type,
            text,
            tags,
            photos,
            created_at,
            resorts(name),
            profiles!feed_posts_user_id_fkey(display_name, avatar_url)
          `
          )
          .eq('resort_id', resortId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (postsError) {
          throw new Error(`投稿取得エラー: ${postsError.message}`);
        }

        // 4. いいね数とコメント数を取得
        const postIds = postsData?.map((p: any) => p.id) || [];
        const [reactionsResult, commentsResult] = await Promise.all([
          supabase
            .from('feed_reactions')
            .select('post_id')
            .in('post_id', postIds),
          supabase
            .from('feed_comments')
            .select('post_id')
            .in('post_id', postIds),
        ]);

        // いいね数とコメント数を集計
        const likeCountByPost = new Map<string, number>();
        if (reactionsResult.data) {
          reactionsResult.data.forEach((r: any) => {
            const count = likeCountByPost.get(r.post_id) || 0;
            likeCountByPost.set(r.post_id, count + 1);
          });
        }

        const commentCountByPost = new Map<string, number>();
        if (commentsResult.data) {
          commentsResult.data.forEach((c: any) => {
            const count = commentCountByPost.get(c.post_id) || 0;
            commentCountByPost.set(c.post_id, count + 1);
          });
        }

        // 5. データを変換
        const rating: ResortRating | null = ratingData
          ? {
              powder: ratingData.powder_avg ? Number(ratingData.powder_avg) : null,
              carving: ratingData.carving_avg ? Number(ratingData.carving_avg) : null,
              family: ratingData.family_avg ? Number(ratingData.family_avg) : null,
              park: ratingData.park_avg ? Number(ratingData.park_avg) : null,
              night: ratingData.night_avg ? Number(ratingData.night_avg) : null,
              overall: ratingData.overall_avg ? Number(ratingData.overall_avg) : null,
              votesCount: ratingData.votes_count || 0,
            }
          : null;

        const weather: SnowfeedWeather | null = weatherData
          ? {
              tempC: weatherData.temp_c ? Number(weatherData.temp_c) : null,
              newSnowCm: weatherData.new_snow_cm ? Number(weatherData.new_snow_cm) : null,
              baseDepthCm: weatherData.base_depth_cm ? Number(weatherData.base_depth_cm) : null,
              windMs: weatherData.wind_ms ? Number(weatherData.wind_ms) : null,
              visibility: weatherData.visibility as SnowfeedWeather['visibility'],
              snowQuality: weatherData.snow_quality as SnowfeedWeather['snowQuality'],
            }
          : null;

        const posts: SnowfeedPost[] = (postsData || []).map((row: any) => {
          const resort = Array.isArray(row.resorts) ? row.resorts[0] : row.resorts;
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

          return {
            id: row.id,
            userId: row.user_id,
            userName: profile?.display_name || 'Unknown',
            userAvatar: profile?.avatar_url || null,
            resortId: row.resort_id,
            resortName: resort?.name || null,
            type: row.type,
            text: row.text,
            tags: row.tags || [],
            photos: row.photos || [],
            likeCount: likeCountByPost.get(row.id) || 0,
            commentCount: commentCountByPost.get(row.id) || 0,
            createdAt: row.created_at,
          };
        });

        if (!isMounted) return;

        setState({
          status: 'success',
          data: { rating, weather, posts },
        });
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
  }, [resortId]);

  return state;
}

export async function getResorts(): Promise<
  { id: string; name: string }[] | { error: string }
> {
  try {
    const { data, error } = await supabase
      .from('resorts')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return data || [];
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

