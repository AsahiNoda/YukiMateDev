import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import { fetchWeatherData } from '../services/weatherApi';
import { getResortName } from '@/utils/resort-helpers';
import type { SocialResortRating as ResortRating, SnowfeedWeather, SnowfeedPost, SnowfeedData } from '@types';
import { useTranslation } from './useTranslation';

type SnowfeedState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: SnowfeedData };

export function useSnowfeed(resortId: string | null, refreshKey?: number): SnowfeedState {
  const [state, setState] = useState<SnowfeedState>({ status: 'loading' });
  const { locale } = useTranslation();

  useEffect(() => {
    if (!resortId) {
      setState({ status: 'success', data: { rating: null, weather: null, posts: [] } });
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        // 0〜4. 互いに依存しないクエリを並列に取得（以前は最大7回の直列通信）
        // 投稿者情報・いいね数・コメント数は投稿クエリに埋め込んで1クエリにまとめる
        const [
          { data: resortData, error: resortError },
          { data: ratingData, error: ratingError },
          { data: weatherData, error: weatherError },
          { data: postsData, error: postsError },
        ] = await Promise.all([
          // 0. リゾート情報（名前、座標、都道府県）
          supabase
            .from('resorts')
            .select('name, name_en, latitude, longitude, area, region')
            .eq('id', resortId)
            .single(),
          // 1. レーティングサマリー
          supabase
            .from('resort_rating_summary')
            .select('*')
            .eq('resort_id', resortId)
            .single(),
          // 2. 天気データ（DBキャッシュ）
          supabase
            .from('weather_daily_cache')
            .select('*')
            .eq('resort_id', resortId)
            .order('date', { ascending: false })
            .limit(1)
            .single(),
          // 3〜4. 投稿 + 投稿者プロフィール・ロール + いいね数・コメント数
          supabase
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
              resorts(name, name_en),
              author:users!feed_posts_user_id_fkey(
                role,
                profiles(display_name, avatar_url)
              ),
              feed_reactions(count),
              feed_comments(count)
            `
            )
            .eq('resort_id', resortId)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        if (resortError) {
          console.warn('リゾート情報取得エラー:', resortError);
        }
        if (ratingError && ratingError.code !== 'PGRST116') {
          // PGRST116は「行が見つからない」エラー（許容）
          console.warn('レーティング取得エラー:', ratingError);
        }
        if (weatherError && weatherError.code !== 'PGRST116') {
          console.warn('天気データ取得エラー:', weatherError);
        }
        if (postsError) {
          throw new Error(`投稿取得エラー: ${postsError.message}`);
        }

        const resortName = resortData ? getResortName(resortData, locale) : resortId;
        const resortCoords = resortData?.latitude && resortData?.longitude
          ? { latitude: resortData.latitude, longitude: resortData.longitude }
          : undefined;
        // areaは常に使用（天気APIは日本語の県名が必要）
        const resortPrefecture = resortData?.area;

        // 2.5. DBに天気データがない、または古い場合、APIから取得
        let apiWeatherData = null;
        const today = new Date().toISOString().split('T')[0];
        const isDataStale = !weatherData || weatherData.date !== today;

        if (isDataStale) {
          try {
            // リゾート名、座標、都道府県を使用して天気データを取得
            apiWeatherData = await fetchWeatherData(resortName, resortCoords, resortPrefecture ?? undefined);

            if (apiWeatherData) {
              // APIから取得したデータをDBに保存（画面表示を待たせないよう完了を待たない）
              supabase
                .from('weather_daily_cache')
                .upsert({
                  resort_id: resortId,
                  date: today,
                  temp_c: apiWeatherData.tempC,
                  new_snow_cm: apiWeatherData.newSnowCm,
                  base_depth_cm: apiWeatherData.baseDepthCm,
                  wind_ms: apiWeatherData.windMs,
                  visibility: apiWeatherData.visibility,
                  snow_quality: apiWeatherData.snowQuality,
                  weather_code: apiWeatherData.weatherCode,
                }, {
                  onConflict: 'resort_id,date'
                })
                .then(({ error: upsertError }) => {
                  if (upsertError) {
                    console.warn('天気データのDB保存エラー:', upsertError);
                  }
                });
            } else {
              console.warn('天気APIからデータを取得できませんでした（nullが返されました）');
            }
          } catch (apiError) {
            console.error('天気API取得中にエラーが発生:', apiError);
          }
        }

        // 投稿者プロフィール（埋め込み取得した author から）
        const profilesMap = new Map<string, { display_name: string | null; avatar_url: string | null; role: string }>();
        ((postsData || []) as any[]).forEach((post: any) => {
          const author = Array.isArray(post.author) ? post.author[0] : post.author;
          const profile = Array.isArray(author?.profiles) ? author.profiles[0] : author?.profiles;
          if (author || profile) {
            profilesMap.set(post.user_id, {
              display_name: profile?.display_name ?? null,
              avatar_url: profile?.avatar_url ?? null,
              role: author?.role || 'user',
            });
          }
        });

        // いいね数とコメント数（埋め込みの count 集計から）
        const likeCountByPost = new Map<string, number>();
        const commentCountByPost = new Map<string, number>();
        ((postsData || []) as any[]).forEach((post: any) => {
          likeCountByPost.set(post.id, post.feed_reactions?.[0]?.count || 0);
          commentCountByPost.set(post.id, post.feed_comments?.[0]?.count || 0);
        });

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

        // APIから取得した新しいデータを優先
        const weather: SnowfeedWeather | null = apiWeatherData
          ? {
              tempC: apiWeatherData.tempC,
              newSnowCm: apiWeatherData.newSnowCm,
              baseDepthCm: apiWeatherData.baseDepthCm,
              windMs: apiWeatherData.windMs,
              visibility: apiWeatherData.visibility,
              snowQuality: apiWeatherData.snowQuality,
              weatherCode: apiWeatherData.weatherCode,
            }
          : weatherData
          ? {
              tempC: weatherData.temp_c ? Number(weatherData.temp_c) : null,
              newSnowCm: weatherData.new_snow_cm ? Number(weatherData.new_snow_cm) : null,
              baseDepthCm: weatherData.base_depth_cm ? Number(weatherData.base_depth_cm) : null,
              windMs: weatherData.wind_ms ? Number(weatherData.wind_ms) : null,
              visibility: weatherData.visibility as SnowfeedWeather['visibility'],
              snowQuality: weatherData.snow_quality as SnowfeedWeather['snowQuality'],
              weatherCode: weatherData.weather_code ? Number(weatherData.weather_code) : null,
            }
          : null;

        const posts: SnowfeedPost[] = (postsData || []).map((row: any) => {
          const resort = Array.isArray(row.resorts) ? row.resorts[0] : row.resorts;
          const profile = profilesMap.get(row.user_id);

          return {
            id: row.id,
            userId: row.user_id,
            userName: profile?.display_name || 'Unknown',
            userAvatar: profile?.avatar_url || null,
            userRole: profile?.role || 'user',
            resortId: row.resort_id,
            resortName: resort ? getResortName(resort, locale) : null,
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
  }, [resortId, refreshKey, locale]);

  return state;
}

export async function getResorts(): Promise<
  { id: string; name: string; name_en: string | null }[] | { error: string }
> {
  try {
    const { data, error } = await supabase
      .from('resorts')
      .select('id, name, name_en')
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

