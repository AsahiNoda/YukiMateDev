import { supabase } from '@lib/supabase';
import type { ProfileData, SkillLevel, SocialLinks, TopResort } from '@types';
import { useEffect, useState } from 'react';

type ProfileState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ProfileData };

export function useProfile(userId?: string, refreshKey?: number): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          throw new Error('ユーザーがログインしていません。');
        }

        const targetUserId = userId || session.user.id;

        // 1. プロフィール情報とユーザーロールを取得
        const { data: profile, error: profileError } = await supabase
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
            users!inner(role)
          `
          )
          .eq('user_id', targetUserId)
          .single();

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

        // 1.5 お気に入りスキー場を取得（多対多）
        const { data: favRows } = await supabase
          .from('favorite_resorts')
          .select('resort_id, resorts(id, name)')
          .eq('user_id', targetUserId);

        const favoriteResorts = (favRows || [])
          .map((row: any) => (row.resorts ? { id: row.resorts.id, name: row.resorts.name } : null))
          .filter(Boolean) as { id: string; name: string }[];

        // 2. ギア情報を取得
        const { data: gear, error: gearError } = await supabase
          .from('gear')
          .select('board_name, binding_name, boots_name, others')
          .eq('user_id', targetUserId)
          .single();

        if (gearError && gearError.code !== 'PGRST116') {
          console.warn('ギア取得エラー:', gearError);
        }

        // 3. 統計情報を取得
        const [eventsResult, postsResult, starsResult] = await Promise.all([
          supabase
            .from('event_participants')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', targetUserId)
            .is('left_at', null),
          supabase
            .from('feed_posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', targetUserId),
          supabase
            .from('stars')
            .select('id', { count: 'exact', head: true })
            .eq('target_user_id', targetUserId),
        ]);

        // 3.5 滑走頻度（よく行くゲレンデ Top3）= 主催 + 参加イベントを resort 単位で集計
        const [hostedRes, participatedRes] = await Promise.all([
          supabase
            .from('posts_events')
            .select('id, resort_id')
            .eq('host_user_id', targetUserId),
          supabase
            .from('event_participants')
            .select('posts_events!inner(id, resort_id)')
            .eq('user_id', targetUserId)
            .is('left_at', null),
        ]);

        // event_id ごとに resort_id を集約（主催/参加の重複を排除）
        const eventResortById = new Map<string, string | null>();
        (hostedRes.data || []).forEach((e: any) => {
          if (e?.id) eventResortById.set(e.id, e.resort_id ?? null);
        });
        (participatedRes.data || []).forEach((row: any) => {
          const e = row.posts_events;
          if (e?.id) eventResortById.set(e.id, e.resort_id ?? null);
        });

        const resortCount = new Map<string, number>();
        eventResortById.forEach((resortId) => {
          if (!resortId) return;
          resortCount.set(resortId, (resortCount.get(resortId) || 0) + 1);
        });

        const topResortEntries = [...resortCount.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        // 4. 最近のイベントを取得
        const { data: recentEventsData } = await supabase
          .from('event_participants')
          .select(
            `
            posts_events!inner(
              id,
              title,
              start_at,
              resort_id
            )
          `
          )
          .eq('user_id', targetUserId)
          .is('left_at', null)
          .order('joined_at', { ascending: false })
          .limit(5);

        // 5. 最近の投稿を取得
        const { data: recentPostsData } = await supabase
          .from('feed_posts')
          .select(
            `
            id,
            text,
            created_at,
            resort_id
          `
          )
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(5);

        // 6. イベントと投稿のリゾート名を取得
        const eventResortIds = recentEventsData
          ?.map((ep: any) => ep.posts_events?.resort_id)
          .filter(Boolean) || [];

        const postResortIds = recentPostsData
          ?.map((post: any) => post.resort_id)
          .filter(Boolean) || [];

        const allResortIds = [...new Set([
          ...eventResortIds,
          ...postResortIds,
          ...topResortEntries.map(([id]) => id),
        ])];

        let resortMap: Record<string, string> = {};
        if (allResortIds.length > 0) {
          const { data: resortsData } = await supabase
            .from('resorts')
            .select('id, name')
            .in('id', allResortIds);

          if (resortsData) {
            resortMap = resortsData.reduce((acc, r) => {
              acc[r.id] = r.name;
              return acc;
            }, {} as Record<string, string>);
          }
        }

        const topResorts: TopResort[] = topResortEntries.map(([id, count]) => ({
          id,
          name: resortMap[id] || 'Unknown',
          count,
        }));

        // 7. データを変換
        const recentEvents =
          recentEventsData?.map((ep: any) => {
            const event = ep.posts_events;
            return {
              id: event.id,
              title: event.title || 'Untitled Event',
              resortName: event.resort_id ? resortMap[event.resort_id] || null : null,
              startAt: event.start_at,
            };
          }) || [];

        const recentPosts =
          recentPostsData?.map((post: any) => {
            return {
              id: post.id,
              text: post.text,
              resortName: post.resort_id ? resortMap[post.resort_id] || null : null,
              createdAt: post.created_at,
            };
          }) || [];

        if (!isMounted) return;

        setState({
          status: 'success',
          data: {
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
              eventsJoined: eventsResult.count || 0,
              postsCount: postsResult.count || 0,
              starsReceived: starsResult.count || 0,
            },
            recentEvents,
            recentPosts,
            headerUrl: profile.header_url,
            role: (profile as any).users?.role || 'user',
          },
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
  }, [userId, refreshKey]);

  return state;
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

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

