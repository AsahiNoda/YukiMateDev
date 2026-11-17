import { useAuth } from '@/contexts/AuthContext';
import type { FavoriteResortInfo } from '@/hooks/useHomeData';
import { supabase } from '@/lib/supabase';
import { fetchDailySnowfall, fetchHourlyWeather } from '@/services/weatherApi';
import { getDateRange } from '@/utils/dateRanges';
import { getResortName } from '@/utils/resort-helpers';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from './useTranslation';

/**
 * リデザイン後のホーム（docs/ui-redesign/README.md「3. ホーム」）で使うデータ。
 * キーは ['home', ...] にしてあるので、useHomeData と同じく画面に戻ったときに古いものだけ取り直される。
 */

export interface HomeEventSummary {
  id: string;
  title: string;
  startAt: string;
  resortName: string;
  meetingPlace: string | null;
  photoUrl: string | null;
  participants: number;
  capacityTotal: number;
  hostRole: string;
  levelRequired: string | null;
  tags: string[];
  soloOk: boolean;
}

export interface NextPlan {
  id: string;
  title: string;
  startAt: string;
  meetingPlace: string | null;
  resortName: string;
  /** 自分以外の参加者（ホストを含む）の数 */
  otherMembers: number;
}

export interface ResortPostThumb {
  id: string;
  text: string | null;
  photoUrl: string;
  createdAt: string;
}

export interface Recommended {
  events: HomeEventSummary[];
  level: string | null;
  styles: string[];
}

const toPublicUrl = (bucket: string, path: string) =>
  path.startsWith('http') ? path : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

const EVENT_FIELDS = `
  id,
  title,
  start_at,
  meeting_place,
  photos,
  capacity_total,
  level_required,
  tags,
  solo_ok,
  host_user_id,
  resorts(name, name_en),
  profiles!posts_events_host_user_id_fkey(users!profiles_user_id_fkey(role)),
  event_participants(user_id, left_at)
`;

function toSummary(e: any, locale: string): HomeEventSummary {
  const resort = Array.isArray(e.resorts) ? e.resorts[0] : e.resorts;
  const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
  const users = Array.isArray(profile?.users) ? profile.users[0] : profile?.users;
  return {
    id: e.id,
    title: e.title,
    startAt: e.start_at,
    resortName: resort ? getResortName(resort, locale) : '',
    meetingPlace: e.meeting_place ?? null,
    photoUrl: e.photos?.[0] ? toPublicUrl('event_images', e.photos[0]) : null,
    participants: (e.event_participants || []).filter((p: any) => p.left_at === null).length,
    capacityTotal: e.capacity_total || 0,
    hostRole: users?.role || 'user',
    levelRequired: e.level_required ?? null,
    tags: e.tags || [],
    soloOk: !!e.solo_ok,
  };
}

async function fetchNextPlan(userId: string, locale: string): Promise<NextPlan | null> {
  const nowIso = new Date().toISOString();
  const [participantRes, hostRes] = await Promise.all([
    supabase.from('event_participants').select('event_id').eq('user_id', userId).is('left_at', null),
    supabase.from('posts_events').select('id').eq('host_user_id', userId).gte('start_at', nowIso),
  ]);
  if (participantRes.error) throw participantRes.error;
  if (hostRes.error) throw hostRes.error;

  const ids = [
    ...new Set([
      ...(participantRes.data || []).map((p) => p.event_id as string),
      ...(hostRes.data || []).map((e) => e.id as string),
    ]),
  ];
  if (ids.length === 0) return null;

  const { data, error } = await supabase
    .from('posts_events')
    .select('id, title, start_at, meeting_place, host_user_id, status, resorts(name, name_en), event_participants(user_id, left_at)')
    .in('id', ids)
    .gte('start_at', nowIso)
    .neq('status', 'cancelled')
    .order('start_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  const e: any = data?.[0];
  if (!e) return null;

  const resort = Array.isArray(e.resorts) ? e.resorts[0] : e.resorts;
  const activeIds = new Set<string>(
    (e.event_participants || []).filter((p: any) => p.left_at === null).map((p: any) => p.user_id)
  );
  activeIds.add(e.host_user_id);
  activeIds.delete(userId);

  return {
    id: e.id,
    title: e.title,
    startAt: e.start_at,
    meetingPlace: e.meeting_place ?? null,
    resortName: resort ? getResortName(resort, locale) : '',
    otherMembers: activeIds.size,
  };
}

async function fetchMyPendingApplications(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('event_applications')
    .select('id', { count: 'exact', head: true })
    .eq('applicant_user_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return count ?? 0;
}

/** ホームゲレンデでこれから開催されるイベント（近い順に最大10件）。見出しは「◯◯の投稿」 */
async function fetchFeatured(resortId: string, locale: string): Promise<HomeEventSummary[]> {
  const { data, error } = await supabase
    .from('posts_events')
    .select(EVENT_FIELDS)
    .eq('resort_id', resortId)
    .eq('status', 'open')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(10);
  if (error) throw error;
  return (data || []).map((e) => toSummary(e, locale));
}

/**
 * 注目の投稿：ゲレンデに関係なく、これから開催されるイベントを新しく投稿された順に10件
 * （リデザイン前のホームの「注目の投稿」と同じ条件）
 */
async function fetchFeaturedPosts(locale: string): Promise<HomeEventSummary[]> {
  const { data, error } = await supabase
    .from('posts_events')
    .select(EVENT_FIELDS)
    .eq('status', 'open')
    .gte('start_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data || []).map((e) => toSummary(e, locale));
}

/** プロフィールのレベル／スタイルと一致するイベント（useDiscoverEvents の一致の考え方を流用） */
async function fetchRecommended(userId: string, locale: string): Promise<Recommended> {
  const [{ data: profile }, { data: participating }] = await Promise.all([
    supabase.from('profiles').select('level, styles').eq('user_id', userId).single(),
    supabase.from('event_participants').select('event_id').eq('user_id', userId).is('left_at', null),
  ]);
  const level: string | null = profile?.level ?? null;
  const styles: string[] = profile?.styles ?? [];
  if (!level && styles.length === 0) return { events: [], level, styles };

  const joined = new Set((participating || []).map((p) => p.event_id as string));
  const { data, error } = await supabase
    .from('posts_events')
    .select(EVENT_FIELDS)
    .eq('status', 'open')
    .neq('host_user_id', userId)
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(50);
  if (error) throw error;

  const lowerStyles = styles.map((s) => s.toLowerCase());
  const scored = (data || [])
    .filter((e: any) => !joined.has(e.id))
    .map((e: any) => {
      let score = 0;
      if (level && e.level_required === level) score += 10;
      const tags: string[] = (e.tags || []).map((t: string) => t.toLowerCase());
      score += lowerStyles.filter((s) => tags.includes(s)).length * 5;
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.start_at.localeCompare(b.e.start_at))
    .slice(0, 3);

  return { events: scored.map((x) => toSummary(x.e, locale)), level, styles };
}

async function fetchResortPosts(resortId: string): Promise<ResortPostThumb[]> {
  const { data, error } = await supabase
    .from('feed_posts')
    .select('id, text, photos, created_at')
    .eq('resort_id', resortId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data || [])
    .filter((p: any) => p.photos && p.photos.length > 0)
    .slice(0, 2)
    .map((p: any) => ({
      id: p.id,
      text: p.text,
      photoUrl: toPublicUrl('feed-post-images', p.photos[0]),
      createdAt: p.created_at,
    }));
}

/** 今週末・一人参加OK・このゲレンデのイベント数（予定がないときの入口カード） */
async function fetchSoloWeekendCount(resortId: string): Promise<number> {
  const range = getDateRange('thisWeekend');
  const { count, error } = await supabase
    .from('posts_events')
    .select('id', { count: 'exact', head: true })
    .eq('resort_id', resortId)
    .eq('status', 'open')
    .eq('solo_ok', true)
    .gte('start_at', range.start)
    .lte('start_at', range.end);
  if (error) {
    // solo_ok のマイグレーション（20261117000000）が未適用だとエラーになる。0件として扱う
    console.warn('[useHomeFeed] solo count failed', error.message);
    return 0;
  }
  return count ?? 0;
}

export function useHomeFeed(resort: FavoriteResortInfo | null) {
  const { user } = useAuth();
  const userId = user?.id;
  const { locale } = useTranslation();
  const resortId = resort?.id;
  const coords =
    resort?.latitude && resort?.longitude ? { latitude: resort.latitude, longitude: resort.longitude } : null;

  const hourly = useQuery({
    queryKey: ['home', 'hourly', resortId],
    queryFn: () => fetchHourlyWeather(coords, resort?.area ?? undefined),
    enabled: !!resortId,
    staleTime: 1000 * 60 * 15,
  });

  const dailySnow = useQuery({
    queryKey: ['home', 'dailySnow', resortId],
    queryFn: () => fetchDailySnowfall(coords, resort?.area ?? undefined),
    enabled: !!resortId,
    staleTime: 1000 * 60 * 30,
  });

  const nextPlan = useQuery({
    queryKey: ['home', 'nextPlan', userId, locale],
    queryFn: () => fetchNextPlan(userId!, locale),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });

  const myPendingApplications = useQuery({
    queryKey: ['home', 'myPendingApplications', userId],
    queryFn: () => fetchMyPendingApplications(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });

  const featured = useQuery({
    queryKey: ['home', 'featured', resortId, locale],
    queryFn: () => fetchFeatured(resortId!, locale),
    enabled: !!resortId,
    staleTime: 1000 * 60 * 2,
  });

  const featuredPosts = useQuery({
    queryKey: ['home', 'featuredPosts', locale],
    queryFn: () => fetchFeaturedPosts(locale),
    staleTime: 1000 * 60 * 2,
  });

  const recommended = useQuery({
    queryKey: ['home', 'recommended', userId, locale],
    queryFn: () => fetchRecommended(userId!, locale),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const resortPosts = useQuery({
    queryKey: ['home', 'resortPosts', resortId],
    queryFn: () => fetchResortPosts(resortId!),
    enabled: !!resortId,
    staleTime: 1000 * 60 * 2,
  });

  const soloWeekendCount = useQuery({
    queryKey: ['home', 'soloWeekendCount', resortId],
    queryFn: () => fetchSoloWeekendCount(resortId!),
    enabled: !!resortId && nextPlan.isSuccess && !nextPlan.data,
    staleTime: 1000 * 60 * 2,
  });

  return {
    hourly: hourly.data ?? null,
    dailySnow: dailySnow.data ?? null,
    nextPlan: nextPlan.data ?? null,
    nextPlanLoaded: nextPlan.isSuccess || nextPlan.isError,
    myPendingApplications: myPendingApplications.data ?? 0,
    featured: featured.data ?? [],
    featuredLoaded: featured.isSuccess || featured.isError,
    featuredPosts: featuredPosts.data ?? [],
    recommended: recommended.data ?? { events: [], level: null, styles: [] },
    resortPosts: resortPosts.data ?? [],
    soloWeekendCount: soloWeekendCount.data ?? 0,
  };
}
