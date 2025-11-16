import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import type { ProfileData, SkillLevel } from '@types';

type ProfileState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: ProfileData };

export function useProfile(userId?: string): ProfileState {
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

        // 1. プロフィール情報を取得
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
            resorts(name)
          `
          )
          .eq('user_id', targetUserId)
          .single();

        if (profileError) {
          throw new Error(`プロフィール取得エラー: ${profileError.message}`);
        }

        const resort = Array.isArray(profile.resorts) ? profile.resorts[0] : profile.resorts;

        // 2. ギア情報を取得
        const { data: gear, error: gearError } = await supabase
          .from('gear')
          .select('board, binding, boots, others')
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
              resort_id,
              resorts(name)
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
            resort_id,
            resorts(name)
          `
          )
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(5);

        // 6. データを変換
        const recentEvents =
          recentEventsData?.map((ep: any) => {
            const event = ep.posts_events;
            const eventResort = Array.isArray(event.resorts) ? event.resorts[0] : event.resorts;
            return {
              id: event.id,
              title: event.title || 'Untitled Event',
              resortName: eventResort?.name || null,
              startAt: event.start_at,
            };
          }) || [];

        const recentPosts =
          recentPostsData?.map((post: any) => {
            const postResort = Array.isArray(post.resorts) ? post.resorts[0] : post.resorts;
            return {
              id: post.id,
              text: post.text,
              resortName: postResort?.name || null,
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
            homeResortName: resort?.name || null,
            gear: gear
              ? {
                  board: gear.board,
                  binding: gear.binding,
                  boots: gear.boots,
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
  }, [userId]);

  return state;
}

export async function updateProfile(
  updates: Partial<{
    displayName: string;
    avatarUrl: string;
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

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: updates.displayName,
        avatar_url: updates.avatarUrl,
        country_code: updates.countryCode,
        languages: updates.languages,
        level: updates.level,
        styles: updates.styles,
        bio: updates.bio,
        home_resort_id: updates.homeResortId,
        updated_at: new Date().toISOString(),
      })
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
        .update(updates)
        .eq('user_id', session.user.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // 新規作成
      const { error } = await supabase.from('gear').insert({
        user_id: session.user.id,
        ...updates,
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

