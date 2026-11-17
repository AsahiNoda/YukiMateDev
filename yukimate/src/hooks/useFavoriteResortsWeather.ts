import { useResortPreferences } from '@/hooks/useResortPreferences';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { fetchDailySnowfall, fetchWeatherData, type FetchedWeatherData } from '@/services/weatherApi';
import { getResortName } from '@/utils/resort-helpers';
import { useQuery } from '@tanstack/react-query';

export interface ResortWeatherRow {
  id: string;
  name: string;
  isHome: boolean;
  /** 取得できなかったら null（行は出して「取得できませんでした」） */
  weather: FetchedWeatherData | null;
  /** 明日の降雪量（cm）。取得できなかったら null */
  snowTomorrowCm: number | null;
  /** 今日から3日間の降雪量の合計（cm） */
  snow3DaysCm: number | null;
}

async function fetchRows(ids: string[], homeId: string | null, locale: string): Promise<ResortWeatherRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('resorts')
    .select('id, name, name_en, latitude, longitude, area')
    .in('id', ids);
  if (error) throw error;

  const rows = await Promise.all(
    (data || []).map(async (r: any) => {
      const coords = r.latitude && r.longitude ? { latitude: r.latitude, longitude: r.longitude } : undefined;
      const [weather, daily] = await Promise.all([
        fetchWeatherData(r.id, coords, r.area ?? undefined).catch(() => null),
        fetchDailySnowfall(coords ?? null, r.area ?? undefined).catch(() => null),
      ]);
      return {
        id: r.id as string,
        name: getResortName(r, locale),
        isHome: r.id === homeId,
        weather,
        snowTomorrowCm: daily?.[1]?.snowfallCm ?? null,
        snow3DaysCm: daily ? Math.round(daily.slice(0, 3).reduce((s, d) => s + d.snowfallCm, 0) * 10) / 10 : null,
      } satisfies ResortWeatherRow;
    })
  );
  // ホーム → お気に入り（登録順ではなく名前順）
  return rows.sort((a, b) => (a.isHome === b.isHome ? a.name.localeCompare(b.name, locale) : a.isHome ? -1 : 1));
}

/**
 * ホームゲレンデとお気に入り（♡）のゲレンデの天気をまとめて取る。
 * お気に入りはゲレンデの一覧の ♡ で登録する（useResortPreferences）。
 */
export function useFavoriteResortsWeather() {
  const { homeId, favoriteIds, loaded } = useResortPreferences();
  const { locale } = useTranslation();
  const ids = [...new Set([...(homeId ? [homeId] : []), ...favoriteIds])].sort();

  const query = useQuery({
    queryKey: ['favoriteWeather', ids.join(','), homeId, locale],
    queryFn: () => fetchRows(ids, homeId, locale),
    enabled: loaded,
    staleTime: 10 * 60 * 1000,
  });

  return {
    rows: query.data ?? [],
    loading: !loaded || query.isLoading,
    error: query.isError,
    refreshing: query.isRefetching,
    refetch: query.refetch,
    hasAny: ids.length > 0,
  };
}
