import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import { fetchWeatherData } from '../services/weatherApi';
import type { SocialResortRating as ResortRating, SnowfeedWeather, SnowfeedPost, SnowfeedData } from '@types';

type SnowfeedState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: SnowfeedData };

export function useSnowfeed(resortId: string | null, refreshKey?: number): SnowfeedState {
  const [state, setState] = useState<SnowfeedState>({ status: 'loading' });

  useEffect(() => {
    if (!resortId) {
      setState({ status: 'success', data: { rating: null, weather: null, posts: [] } });
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        // 0. リゾート情報を取得（名前、座標、都道府県）
        const { data: resortData, error: resortError } = await supabase
          .from('resorts')
          .select('name, latitude, longitude, area')
          .eq('id', resortId)
          .single();

        if (resortError) {
          console.warn('リゾート情報取得エラー:', resortError);
        }

        const resortName = resortData?.name || resortId;
        const resortCoords = resortData?.latitude && resortData?.longitude
          ? { latitude: resortData.latitude, longitude: resortData.longitude }
          : undefined;
        const resortPrefecture = resortData?.area;

        console.log(`[useSnowfeed] Resort: ${resortName} (ID: ${resortId})`, {
          coords: resortCoords || 'no coordinates',
          prefecture: resortPrefecture || 'no prefecture'
        });

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

        // 2. 天気データを取得（DBから）
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

        // 2.5. DBに天気データがない、または古い場合、APIから取得
        let apiWeatherData = null;
        const today = new Date().toISOString().split('T')[0];
        const isDataStale = !weatherData || weatherData.date !== today;

        if (isDataStale) {
          console.log(
            weatherData
              ? `天気データが古い（${weatherData.date}）ため、APIから最新データを取得します...`
              : 'DBに天気データがないため、APIから取得します...'
          );
          try {
            // リゾート名、座標、都道府県を使用して天気データを取得
            apiWeatherData = await fetchWeatherData(resortName, resortCoords, resortPrefecture);

            if (apiWeatherData) {
              // APIから取得したデータをDBに保存（既存データがあればUPSERT）
              const { error: upsertError } = await supabase
                .from('weather_daily_cache')
                .upsert({
                  resort_id: resortId,
                  date: new Date().toISOString().split('T')[0],
                  temp_c: apiWeatherData.tempC,
                  new_snow_cm: apiWeatherData.newSnowCm,
                  base_depth_cm: apiWeatherData.baseDepthCm,
                  wind_ms: apiWeatherData.windMs,
                  visibility: apiWeatherData.visibility,
                  snow_quality: apiWeatherData.snowQuality,
                  weather_code: apiWeatherData.weatherCode,
                }, {
                  onConflict: 'resort_id,date'
                });

              if (upsertError) {
                console.warn('天気データのDB保存エラー:', upsertError);
              }
            } else {
              console.warn('天気APIからデータを取得できませんでした（nullが返されました）');
            }
          } catch (apiError) {
            console.error('天気API取得中にエラーが発生:', apiError);
          }
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
            resorts(name)
          `
          )
          .eq('resort_id', resortId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (postsError) {
          throw new Error(`投稿取得エラー: ${postsError.message}`);
        }

        // 3.5. ユーザープロフィールとロールを取得
        const userIds = postsData?.map((p: any) => p.user_id) || [];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            user_id,
            display_name,
            avatar_url,
            users!profiles_user_id_fkey(role)
          `)
          .in('user_id', userIds);

        if (profilesError) {
          console.warn('プロフィール取得エラー:', profilesError);
        }

        // プロフィールをMapに変換
        const profilesMap = new Map();
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap.set(profile.user_id, {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              role: profile.users?.role || 'user',
            });
          });
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
  }, [resortId, refreshKey]);

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

