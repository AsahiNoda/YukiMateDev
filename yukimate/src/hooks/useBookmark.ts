import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export function useBookmark(eventId: string) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // ブックマーク状態を確認
  const checkBookmark = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('saved_events')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('event_id', eventId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking bookmark:', error);
        return;
      }

      setIsBookmarked(!!data);
    } catch (error) {
      console.error('Error checking bookmark:', error);
    }
  };

  // ブックマークをトグル
  const toggleBookmark = async () => {
    try {
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
          console.error('Error removing bookmark:', error);
          return false;
        }

        setIsBookmarked(false);
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
          console.error('Error adding bookmark:', error);
          return false;
        }

        setIsBookmarked(true);
        return true;
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBookmark();
  }, [eventId]);

  return {
    isBookmarked,
    loading,
    toggleBookmark,
  };
}
