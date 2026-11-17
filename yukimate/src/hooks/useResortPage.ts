import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetch7DayForecast, fetchHourlyWeather } from '@/services/weatherApi';
import { getDateRange } from '@/utils/dateRanges';
import { getResortName } from '@/utils/resort-helpers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from './useTranslation';

/**
 * ゲレンデページ（旧 Snowfeed）で使うデータ。投稿・評価・現在の天気は useSnowfeed、
 * それ以外（お気に入り・時間ごと／週間の予報・イベント件数・参考になった）をここで取る。
 */

export interface ResortRef {
  id: string;
  name: string;
}

export const resortPageKeys = {
  all: ['resortPage'] as const,
  favorites: (userId?: string) => ['resortPage', 'favorites', userId] as const,
};

async function fetchFavoriteResorts(userId: string, locale: string): Promise<ResortRef[]> {
  const { data, error } = await supabase
    .from('favorite_resorts')
    .select('resort_id, resorts(id, name, name_en)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || [])
    .map((row: any) => (Array.isArray(row.resorts) ? row.resorts[0] : row.resorts))
    .filter(Boolean)
    .map((r: any) => ({ id: r.id, name: getResortName(r, locale) }));
}

async function fetchResortMeta(resortId: string) {
  const { data } = await supabase.from('resorts').select('latitude, longitude, area').eq('id', resortId).single();
  return {
    coords: data?.latitude && data?.longitude ? { latitude: data.latitude, longitude: data.longitude } : null,
    area: (data?.area as string | null) ?? null,
  };
}

async function fetchEventCounts(resortId: string) {
  const range = getDateRange('thisWeekend');
  const base = () =>
    supabase
      .from('posts_events')
      .select('id', { count: 'exact', head: true })
      .eq('resort_id', resortId)
      .eq('status', 'open')
      .gte('start_at', range.start)
      .lte('start_at', range.end);
  const [weekend, solo] = await Promise.all([base(), base().eq('solo_ok', true)]);
  return { weekend: weekend.count ?? 0, solo: solo.error ? 0 : solo.count ?? 0 };
}

async function fetchMyHelpful(userId: string, postIds: string[]): Promise<string[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from('feed_reactions')
    .select('post_id')
    .eq('user_id', userId)
    .eq('type', 'like')
    .in('post_id', postIds);
  if (error) throw error;
  return (data || []).map((r) => r.post_id as string);
}

export function useResortPage(resortId: string | null, resortName: string | null, postIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const { locale } = useTranslation();
  const queryClient = useQueryClient();

  const favorites = useQuery({
    queryKey: [...resortPageKeys.favorites(userId), locale],
    queryFn: () => fetchFavoriteResorts(userId!, locale),
    enabled: !!userId,
  });

  const meta = useQuery({
    queryKey: ['resortPage', 'meta', resortId],
    queryFn: () => fetchResortMeta(resortId!),
    enabled: !!resortId,
    staleTime: Infinity,
  });

  const hourly = useQuery({
    queryKey: ['resortPage', 'hourly', resortId],
    queryFn: () => fetchHourlyWeather(meta.data?.coords, meta.data?.area ?? undefined),
    enabled: !!resortId && meta.isSuccess,
    staleTime: 1000 * 60 * 15,
  });

  const forecast = useQuery({
    queryKey: ['resortPage', 'forecast', resortId],
    queryFn: () => fetch7DayForecast(resortName ?? '', meta.data?.coords ?? undefined, meta.data?.area ?? undefined),
    enabled: !!resortId && meta.isSuccess,
    staleTime: 1000 * 60 * 30,
  });

  const eventCounts = useQuery({
    queryKey: ['resortPage', 'eventCounts', resortId],
    queryFn: () => fetchEventCounts(resortId!),
    enabled: !!resortId,
    staleTime: 1000 * 60 * 2,
  });

  const postIdsKey = postIds.join(',');
  const myHelpful = useQuery({
    queryKey: ['resortPage', 'helpful', userId, postIdsKey],
    queryFn: () => fetchMyHelpful(userId!, postIds),
    enabled: !!userId && postIds.length > 0,
  });

  const isFavorite = !!resortId && (favorites.data ?? []).some((f) => f.id === resortId);

  /** ♡ の切り替え。お気に入りはこの ♡ だけで登録・解除する（専用の画面は作らない） */
  const toggleFavorite = useCallback(async (): Promise<boolean> => {
    if (!userId || !resortId) return false;
    const { error } = isFavorite
      ? await supabase.from('favorite_resorts').delete().eq('user_id', userId).eq('resort_id', resortId)
      : await supabase.from('favorite_resorts').insert({ user_id: userId, resort_id: resortId });
    await queryClient.invalidateQueries({ queryKey: resortPageKeys.favorites(userId) });
    return !error;
  }, [userId, resortId, isFavorite, queryClient]);

  /** 「参考になった」の切り替え（feed_reactions の like） */
  const toggleHelpful = useCallback(
    async (postId: string, currentlyOn: boolean): Promise<boolean> => {
      if (!userId) return false;
      const { error } = currentlyOn
        ? await supabase.from('feed_reactions').delete().eq('user_id', userId).eq('post_id', postId).eq('type', 'like')
        : await supabase.from('feed_reactions').insert({ user_id: userId, post_id: postId, type: 'like' });
      if (error) {
        // 原因を調べられるように内容を残す（RLS で許可されていないと insert が失敗する）
        console.warn('[toggleHelpful] failed', error.code, error.message);
      }
      await queryClient.invalidateQueries({ queryKey: ['resortPage', 'helpful', userId] });
      return !error;
    },
    [userId, queryClient]
  );

  return {
    userId,
    favorites: favorites.data ?? [],
    isFavorite,
    toggleFavorite,
    hourly: hourly.data ?? null,
    forecast: forecast.data ?? [],
    forecastLoading: forecast.isPending && !!resortId,
    eventCounts: eventCounts.data ?? { weekend: 0, solo: 0 },
    myHelpful: new Set(myHelpful.data ?? []),
    toggleHelpful,
  };
}

/** 投稿を通報する（reports テーブル。Apple 審査 Guideline 1.2） */
export async function reportPost(postId: string, reporterUserId: string, reason: string) {
  const { error } = await supabase.from('reports').insert({
    target_type: 'post',
    target_id: postId,
    reporter_user_id: reporterUserId,
    reason,
  });
  return { success: !error, error: error?.message };
}

/** 自分の投稿を削除する。RLS で消せなかったとき（0件）も失敗として返す */
export async function deleteOwnPost(postId: string, userId: string) {
  const { data, error } = await supabase
    .from('feed_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId)
    .select('id');
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: false, error: 'not deleted' };
  return { success: true };
}
