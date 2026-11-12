import { supabase } from '@lib/supabase';
import type { ReactionKind, UserRatingSummary } from '@lib/database.types';
import { useCallback, useEffect, useState } from 'react';

export type UserRatingState = {
  loading: boolean;
  error: string | null;
  /** 評価された総数 */
  total: number;
  /** 高評価（super_happy / happy）の数 */
  high: number;
  /** 高評価率（%、0-100） */
  highPct: number;
  /** 平均スコア（1-5） */
  avgScore: number;
  /** ログインユーザー自身が付けたリアクション（未評価なら null） */
  myReaction: ReactionKind | null;
};

const EMPTY: Omit<UserRatingState, 'loading' | 'error'> = {
  total: 0,
  high: 0,
  highPct: 0,
  avgScore: 0,
  myReaction: null,
};

/**
 * 対象ユーザーの評価サマリ（高評価率%・平均）と自分のリアクションを取得。
 * setReaction で 5 段階リアクションを付与/更新できる。
 */
export function useUserRating(targetUserId?: string) {
  const [state, setState] = useState<UserRatingState>({
    loading: true,
    error: null,
    ...EMPTY,
  });

  const load = useCallback(async () => {
    if (!targetUserId) {
      setState({ loading: false, error: null, ...EMPTY });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [summaryRes, myRes] = await Promise.all([
        supabase.rpc('get_user_rating', { target: targetUserId }),
        user
          ? supabase
              .from('user_reactions')
              .select('reaction')
              .eq('reactor_user_id', user.id)
              .eq('target_user_id', targetUserId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
      ]);

      if (summaryRes.error) throw summaryRes.error;

      const summary = (summaryRes.data?.[0] as UserRatingSummary | undefined) ?? null;

      setState({
        loading: false,
        error: null,
        total: summary?.total ?? 0,
        high: summary?.high ?? 0,
        highPct: summary?.high_pct ?? 0,
        avgScore: summary?.avg_score ?? 0,
        myReaction: (myRes?.data?.reaction as ReactionKind | undefined) ?? null,
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...EMPTY,
      });
    }
  }, [targetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  /** 自分のリアクションを付与/更新（同じものを再度押すと取り消し） */
  const setReaction = useCallback(
    async (reaction: ReactionKind): Promise<{ success: boolean; error?: string }> => {
      if (!targetUserId) return { success: false, error: 'no target' };

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'not signed in' };
      if (user.id === targetUserId) return { success: false, error: 'cannot rate yourself' };

      try {
        if (state.myReaction === reaction) {
          // 同じリアクションを再度押したら取り消し
          const { error } = await supabase
            .from('user_reactions')
            .delete()
            .eq('reactor_user_id', user.id)
            .eq('target_user_id', targetUserId);
          if (error) return { success: false, error: error.message };
        } else {
          // upsert（1人1票・UNIQUE 制約で上書き）
          const { error } = await supabase.from('user_reactions').upsert(
            {
              reactor_user_id: user.id,
              target_user_id: targetUserId,
              reaction,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'reactor_user_id,target_user_id' }
          );
          if (error) return { success: false, error: error.message };
        }

        await load();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [targetUserId, state.myReaction, load]
  );

  return { ...state, refetch: load, setReaction };
}
