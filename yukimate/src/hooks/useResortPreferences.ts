import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * ホームゲレンデ（profiles.home_resort_id）とお気に入りスキー場（favorite_resorts）。
 * お気に入りは専用の画面を作らず、ゲレンデの一覧の名前の横の ♡ だけで登録・解除する。
 * ゲレンデの一覧（ResortSearch）・さがすのゲレンデ選択・ゲレンデページで共通に使う。
 */
export const resortPrefsKey = (userId?: string) => ['resortPrefs', userId] as const;

async function fetchPrefs(userId: string) {
  const [profileRes, favRes] = await Promise.all([
    supabase.from('profiles').select('home_resort_id').eq('user_id', userId).maybeSingle(),
    supabase.from('favorite_resorts').select('resort_id').eq('user_id', userId),
  ]);
  if (favRes.error) throw favRes.error;
  return {
    homeId: ((profileRes.data as any)?.home_resort_id as string | null) ?? null,
    favoriteIds: (favRes.data || []).map((r) => r.resort_id as string),
  };
}

export function useResortPreferences() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: resortPrefsKey(userId),
    queryFn: () => fetchPrefs(userId!),
    enabled: !!userId,
  });

  const homeId = query.data?.homeId ?? null;
  const favoriteIds = new Set(query.data?.favoriteIds ?? []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['resortPrefs'] }),
      queryClient.invalidateQueries({ queryKey: ['resortPage'] }),
    ]);
  }, [queryClient]);

  const toggleFavorite = useCallback(
    async (resortId: string): Promise<boolean> => {
      if (!userId) return false;
      const isFav = (query.data?.favoriteIds ?? []).includes(resortId);
      const { error } = isFav
        ? await supabase.from('favorite_resorts').delete().eq('user_id', userId).eq('resort_id', resortId)
        : await supabase.from('favorite_resorts').insert({ user_id: userId, resort_id: resortId });
      if (error) console.warn('[toggleFavorite] failed', error.code, error.message);
      await refreshAll();
      return !error;
    },
    [userId, query.data, refreshAll]
  );

  /** ホームゲレンデを変える。ホームの天気・特集なども取り直す */
  const setHome = useCallback(
    async (resortId: string): Promise<boolean> => {
      if (!userId) return false;
      const { error } = await supabase.from('profiles').update({ home_resort_id: resortId }).eq('user_id', userId);
      if (error) console.warn('[setHome] failed', error.code, error.message);
      await Promise.all([refreshAll(), queryClient.invalidateQueries({ queryKey: ['home'] })]);
      return !error;
    },
    [userId, refreshAll, queryClient]
  );

  return { homeId, favoriteIds, toggleFavorite, setHome, loaded: query.isSuccess };
}
