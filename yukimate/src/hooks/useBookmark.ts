import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

// グローバルなブックマーク状態変更リスナー
type BookmarkListener = (eventId: string, isBookmarked: boolean) => void;
const bookmarkListeners = new Set<BookmarkListener>();

export function addBookmarkListener(listener: BookmarkListener) {
  bookmarkListeners.add(listener);
  return () => bookmarkListeners.delete(listener);
}

function notifyBookmarkChange(eventId: string, isBookmarked: boolean) {
  bookmarkListeners.forEach(listener => listener(eventId, isBookmarked));
}

export function useBookmark(eventId: string) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // ブックマーク状態を確認
  const checkBookmark = async () => {
    try {
      // eventIdが空の場合は実行しない
      if (!eventId) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('saved_events')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        // PGRST116: レコードが見つからない場合（正常）
        if (error.code !== 'PGRST116') {
          console.error('Error checking bookmark:', error.message || error);
        }
        return;
      }

      setIsBookmarked(!!data);
    } catch (error) {
      console.error('Error checking bookmark:', error instanceof Error ? error.message : error);
    }
  };

  // ブックマークをトグル
  const toggleBookmark = async () => {
    try {
      // eventIdが空の場合は実行しない
      if (!eventId) {
        console.error('Event ID is required for bookmarking');
        return false;
      }

      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error('User not logged in');
        return false;
      }

      if (isBookmarked) {
        // ブックマークを削除
        const { error } = await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', session.user.id)
          .eq('event_id', eventId);

        if (error) {
          console.error('Error removing bookmark:', error.message || error);
          return false;
        }

        setIsBookmarked(false);
        // グローバル通知
        notifyBookmarkChange(eventId, false);
        return true;
      } else {
        // ブックマークを追加
        const { error } = await supabase
          .from('saved_events')
          .insert({
            user_id: session.user.id,
            event_id: eventId,
          });

        if (error) {
          console.error('Error adding bookmark:', error.message || error);
          return false;
        }

        setIsBookmarked(true);
        // グローバル通知
        notifyBookmarkChange(eventId, true);
        return true;
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error instanceof Error ? error.message : error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;

    checkBookmark();

    // 他のコンポーネントからのブックマーク変更を監視
    const unsubscribe = addBookmarkListener((changedEventId, newIsBookmarked) => {
      if (changedEventId === eventId) {
        setIsBookmarked(newIsBookmarked);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [eventId]);

  return {
    isBookmarked,
    loading,
    toggleBookmark,
  };
}
