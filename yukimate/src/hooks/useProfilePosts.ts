import { supabase } from '@lib/supabase';
import type { ProfilePost } from '@lib/database.types';
import { useCallback, useEffect, useState } from 'react';

export type ProfilePostItem = ProfilePost & {
  resortName: string | null;
};

type ProfilePostsState = {
  posts: ProfilePostItem[];
  loading: boolean;
  error: string | null;
};

/**
 * 対象ユーザーのプロフィール投稿（インスタ風グリッド用）を取得。
 */
export function useProfilePosts(targetUserId?: string) {
  const [state, setState] = useState<ProfilePostsState>({
    posts: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = targetUserId || session?.user?.id;
      if (!userId) {
        setState({ posts: [], loading: false, error: null });
        return;
      }

      const { data: rows, error } = await supabase
        .from('profile_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const posts = (rows || []) as ProfilePost[];

      // リゾート名を解決
      const resortIds = [...new Set(posts.map((p) => p.resort_id).filter(Boolean))] as string[];
      let resortMap: Record<string, string> = {};
      if (resortIds.length > 0) {
        const { data: resorts } = await supabase
          .from('resorts')
          .select('id, name')
          .in('id', resortIds);
        if (resorts) {
          resortMap = resorts.reduce((acc, r) => {
            acc[r.id] = r.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      setState({
        posts: posts.map((p) => ({
          ...p,
          resortName: p.resort_id ? resortMap[p.resort_id] || null : null,
        })),
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        posts: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [targetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}

/**
 * プロフィール投稿を作成（写真URL配列 + 任意キャプション/リゾート）。
 */
export async function createProfilePost(input: {
  photos: string[];
  caption?: string | null;
  resortId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'ユーザーがログインしていません。' };
    }
    if (input.photos.length === 0) {
      return { success: false, error: '写真を1枚以上選択してください。' };
    }

    const { error } = await supabase.from('profile_posts').insert({
      user_id: session.user.id,
      photos: input.photos,
      caption: input.caption ?? null,
      resort_id: input.resortId ?? null,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * プロフィール投稿を削除（本人のみ）。
 */
export async function deleteProfilePost(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('profile_posts').delete().eq('id', postId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
