import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@lib/supabase';
import type { ProfileData, SkillLevel, SocialLinks, TopResort } from '@types';
import { queryClient } from '@/providers/QueryProvider';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

type ProfileState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ProfileData };

export const profileQueryKey = (userId: string | undefined) => ['profile', userId] as const;

/**
 * プロフィール画面のデータを取得
 * 以前は約8回の通信を順番に待っていたが、互いに依存しないクエリを1回の並列通信にまとめ、
 * リゾート名も埋め込み取得（resorts(name)）にして追加クエリを無くした。
 */
async function fetchProfileData(targetUserId: string): Promise<ProfileData> {
  const [
    profileRes,
    favRes,
    gearRes,
    postsResult,
    starsResult,
    hostedRes,
    participatedRes,
    recentPostsRes,
  ] = await Promise.all([
    // 1. プロフィール情報とユーザーロール
    supabase
      .from('profiles')
      .select(
        `
        user_id,
        display_name,
        avatar_url,
        country_code,
        languages,
        level,
        styles,
        bio,
        social_links,
        header_url,
        home_resort:resorts!profiles_home_resort_id_fkey(name, name_en),
        users!inner(role)
      `
      )
      .eq('user_id', targetUserId)
      .single(),
    // 1.5 お気に入りスキー場（多対多）
    supabase.from('favorite_resorts').select('resort_id, resorts(id, name)').eq('user_id', targetUserId),
    // 2. ギア情報
    supabase
      .from('gear')
      .select('board_name, binding_name, boots_name, others')
      .eq('user_id', targetUserId)
      .maybeSingle(),
    // 3. 統計情報（参加数は下の参加イベントから数える）
    supabase.from('feed_posts').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId),
    supabase.from('stars').select('id', { count: 'exact', head: true }).eq('target_user_id', targetUserId),
    // 3.5 主催イベント（よく行くゲレンデ集計用）
    // 中止（cancelled）したものは数えない
    supabase
      .from('posts_events')
      .select('id, resort_id, resorts(name)')
      .eq('host_user_id', targetUserId)
      .neq('status', 'cancelled'),
    // 3.5 + 4. 参加イベント（よく行くゲレンデ集計 + 最近のイベント を1クエリで兼用）
    supabase
      .from('event_participants')
      // left_at では絞らない：イベント後の「評価タイム」で全員 left_at が入るため、
      // left_at が null のものだけ数えると、終わったイベントが参加数から消えていた（下で絞る）
      .select('joined_at, left_at, posts_events!inner(id, title, start_at, resort_id, status, resorts(name))')
      .eq('user_id', targetUserId)
      .order('joined_at', { ascending: false }),
    // 5. 最近の投稿
    supabase
      .from('feed_posts')
      .select('id, text, created_at, resort_id, resorts(name)')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const { data: profile, error: profileError } = profileRes;
  if (profileError) {
    // PGRST116 = プロフィールが見つからない場合のエラーコード
    if (profileError.code === 'PGRST116') {
      throw new Error('プロフィールが見つかりません。プロフィールを作成してください。');
    }
    throw new Error(`プロフィール取得エラー: ${profileError.message}`);
  }
  if (!profile) {
    throw new Error('プロフィールが見つかりません。プロフィールを作成してください。');
  }

  const favoriteResorts = (favRes.data || [])
    .map((row: any) => (row.resorts ? { id: row.resorts.id, name: row.resorts.name } : null))
    .filter(Boolean) as { id: string; name: string }[];

  if (gearRes.error) {
    console.warn('ギア取得エラー:', gearRes.error);
  }
  const gear = gearRes.data as any;

  // リゾート名のマップ（埋め込み取得した resorts(name) から作る）
  const resortMap: Record<string, string> = {};
  const rememberResort = (resortId: string | null | undefined, resorts: any) => {
    if (resortId && resorts?.name) resortMap[resortId] = resorts.name;
  };

  // event_id ごとに resort_id を集約（主催/参加の重複を排除）
  const eventResortById = new Map<string, string | null>();
  ((hostedRes.data || []) as any[]).forEach((e: any) => {
    if (e?.id) eventResortById.set(e.id, e.resort_id ?? null);
    rememberResort(e?.resort_id, e?.resorts);
  });
  // 参加した（する）イベント：
  //  - 今も参加中（left_at なし）、または開始後に抜けた（＝最後まで参加して評価タイムで抜けた）もの
  //  - 開始前に退会した・主催者に外された（left_at が開始より前）ものと、中止になったものは除く
  const participatedRows = ((participatedRes.data || []) as any[]).filter((row: any) => {
    const e = Array.isArray(row.posts_events) ? row.posts_events[0] : row.posts_events;
    if (!e || e.status === 'cancelled') return false;
    if (!row.left_at) return true;
    return new Date(row.left_at).getTime() >= new Date(e.start_at).getTime();
  });
  participatedRows.forEach((row: any) => {
    const e = row.posts_events;
    if (e?.id) eventResortById.set(e.id, e.resort_id ?? null);
    rememberResort(e?.resort_id, e?.resorts);
  });
  ((recentPostsRes.data || []) as any[]).forEach((post: any) => rememberResort(post.resort_id, post.resorts));

  const resortCount = new Map<string, number>();
  eventResortById.forEach((resortId) => {
    if (!resortId) return;
    resortCount.set(resortId, (resortCount.get(resortId) || 0) + 1);
  });

  const topResorts: TopResort[] = [...resortCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ id, name: resortMap[id] || 'Unknown', count }));

  // 4. 最近のイベント（参加日の新しい順で5件）
  const recentEvents = participatedRows.slice(0, 5).map((ep: any) => {
    const event = ep.posts_events;
    return {
      id: event.id,
      title: event.title || 'Untitled Event',
      resortName: event.resort_id ? resortMap[event.resort_id] || null : null,
      startAt: event.start_at,
    };
  });

  const recentPosts = ((recentPostsRes.data || []) as any[]).map((post: any) => ({
    id: post.id,
    text: post.text,
    resortName: post.resort_id ? resortMap[post.resort_id] || null : null,
    createdAt: post.created_at,
  }));

  return {
    userId: profile.user_id,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    countryCode: profile.country_code,
    languages: profile.languages || [],
    level: profile.level,
    styles: profile.styles || [],
    bio: profile.bio,
    favoriteResorts,
    topResorts,
    homeResort: (() => {
      const r = (profile as any).home_resort;
      const one = Array.isArray(r) ? r[0] : r;
      return one ? { name: one.name, name_en: one.name_en ?? null } : null;
    })(),
    socialLinks: ((profile as any).social_links as SocialLinks) || {},
    gear: gear
      ? {
          board: gear.board_name,
          binding: gear.binding_name,
          boots: gear.boots_name,
          others: gear.others,
        }
      : null,
    stats: {
      eventsJoined: participatedRows.length,
      eventsHosted: (hostedRes.data || []).length,
      postsCount: postsResult.count || 0,
      starsReceived: starsResult.count || 0,
    },
    recentEvents,
    recentPosts,
    headerUrl: profile.header_url,
    role: (profile as any).users?.role || 'user',
  } as ProfileData;
}

export function useProfile(userId?: string, refreshKey?: number): ProfileState {
  const { user, loading: authLoading } = useAuth();
  const targetUserId = userId || user?.id;

  const query = useQuery({
    queryKey: profileQueryKey(targetUserId),
    queryFn: () => fetchProfileData(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 1000 * 30,
  });

  // refreshKey が変わったら（画面フォーカス時など）再取得。
  // キャッシュ済みのデータは表示したまま裏で更新するのでローディング表示は出ない。
  const { refetch } = query;
  const lastRefreshKey = useRef(refreshKey);
  useEffect(() => {
    if (lastRefreshKey.current === refreshKey) return;
    lastRefreshKey.current = refreshKey;
    // cancelRefetch: false → 初回取得中ならキャンセルせず合流（二重取得を防ぐ）
    if (targetUserId) refetch({ cancelRefetch: false });
  }, [refreshKey, targetUserId, refetch]);

  // 返り値の参照を安定させる（呼び出し側が useEffect の依存に使っているため、
  // データが実際に変わったときだけ新しいオブジェクトを返す）
  const { data, isError, error } = query;
  return useMemo<ProfileState>(() => {
    if (!targetUserId) {
      return authLoading
        ? { status: 'loading' }
        : { status: 'error', error: 'ユーザーがログインしていません。' };
    }
    if (data) {
      return { status: 'success', data };
    }
    if (isError) {
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
    return { status: 'loading' };
  }, [targetUserId, authLoading, data, isError, error]);
}

/** プロフィール関連のキャッシュを破棄（更新後に古いデータが表示されないように） */
function invalidateProfileCaches() {
  queryClient.invalidateQueries({ queryKey: ['profile'] });
  queryClient.invalidateQueries({ queryKey: ['home', 'favorites'] });
}

export async function updateProfile(
  updates: Partial<{
    displayName: string;
    avatarUrl: string;
    headerUrl: string;
    countryCode: string;
    languages: string[];
    level: SkillLevel;
    styles: string[];
    bio: string;
    socialLinks: SocialLinks;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { success: false, error: 'ユーザーがログインしていません。' };
    }

    // Build update object, excluding undefined values
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
    if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
    if (updates.headerUrl !== undefined) updateData.header_url = updates.headerUrl;
    if (updates.countryCode !== undefined) updateData.country_code = updates.countryCode;
    if (updates.languages !== undefined) updateData.languages = updates.languages;
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.styles !== undefined) updateData.styles = updates.styles;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.socialLinks !== undefined) updateData.social_links = updates.socialLinks;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', session.user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    invalidateProfileCaches();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * お気に入りスキー場を一括更新（差分を計算して追加/削除）
 */
export async function updateFavoriteResorts(
  resortIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { success: false, error: 'ユーザーがログインしていません。' };
    }

    const userId = session.user.id;

    // 既存のお気に入りを取得
    const { data: existing, error: fetchError } = await supabase
      .from('favorite_resorts')
      .select('resort_id')
      .eq('user_id', userId);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const existingIds = new Set((existing || []).map((r) => r.resort_id));
    const nextIds = new Set(resortIds);

    const toAdd = resortIds.filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !nextIds.has(id));

    if (toAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('favorite_resorts')
        .insert(toAdd.map((resort_id) => ({ user_id: userId, resort_id })));
      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('favorite_resorts')
        .delete()
        .eq('user_id', userId)
        .in('resort_id', toRemove);
      if (deleteError) {
        return { success: false, error: deleteError.message };
      }
    }

    invalidateProfileCaches();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateGear(
  updates: Partial<{
    board: string;
    binding: string;
    boots: string;
    others: Record<string, any>;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { success: false, error: 'ユーザーがログインしていません。' };
    }

    // Map frontend fields to DB columns
    const dbUpdates: any = {};
    if (updates.board !== undefined) dbUpdates.board_name = updates.board;
    if (updates.binding !== undefined) dbUpdates.binding_name = updates.binding;
    if (updates.boots !== undefined) dbUpdates.boots_name = updates.boots;
    if (updates.others !== undefined) dbUpdates.others = updates.others;

    // 既存のギアを確認
    const { data: existing } = await supabase
      .from('gear')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (existing) {
      // 更新
      const { error } = await supabase
        .from('gear')
        .update(dbUpdates)
        .eq('user_id', session.user.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // 新規作成
      const { error } = await supabase.from('gear').insert({
        user_id: session.user.id,
        ...dbUpdates,
      });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    invalidateProfileCaches();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

