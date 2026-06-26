import { supabase } from '@lib/supabase';
import type { ProfileData, SkillLevel } from '@types';
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
            home_resort_id,
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

        // ホームリゾート名を取得（プロフィールにhome_resort_idがある場合）
        let homeResortName: string | null = null;
        if (profile.home_resort_id) {
          const { data: resortData, error: resortError } = await supabase
            .from('resorts')
            .select('name')
            .eq('id', profile.home_resort_id)
            .single();

          if (!resortError && resortData) {
            homeResortName = resortData.name;
          }
        }

        // Fallback to first searchable resort if no home resort (same logic as useHomeData)
        if (!homeResortName) {
          const { data: defaultResort } = await supabase
            .from('resorts')
            .select('name')
            .eq('searchable', true)
            .order('name')
            .limit(1)
            .single();

          if (defaultResort) {
            homeResortName = defaultResort.name;
          }
        }

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

        const allResortIds = [...new Set([...eventResortIds, ...postResortIds])];

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
            homeResortId: profile.home_resort_id,
            homeResortName: homeResortName,
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
    homeResortId: string;
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
    if (updates.homeResortId !== undefined) updateData.home_resort_id = updates.homeResortId;

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

