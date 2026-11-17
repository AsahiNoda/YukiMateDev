import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

/** スワイプで見送った／保存した／申請したイベント */
export type SwipeAction = 'skip' | 'save' | 'apply';

type SwipedRecord = Record<string, { action: SwipeAction; at: number }>;

/** 古いものから捨てる上限（開催日を過ぎたイベントはどのみち一覧に出ない） */
const MAX_RECORDS = 500;

const storageKey = (userId: string) => `@discover_swiped:${userId}`;

/**
 * スワイプの束から外したイベントを覚えておく（端末ごと・ユーザーごと）。
 * 表示を切り替えたりアプリを開き直したりしても、同じカードがまた出てこないようにする。
 * リスト表示はこの記録に関係なく全件を出す（docs/ui-redesign/README.md「4. さがす」）。
 */
export function useSwipedEvents() {
  const { user } = useAuth();
  const userId = user?.id;
  const [records, setRecords] = useState<SwipedRecord>({});
  const [loaded, setLoaded] = useState(false);
  const recordsRef = useRef<SwipedRecord>({});

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    if (!userId) {
      recordsRef.current = {};
      setRecords({});
      setLoaded(true);
      return;
    }
    AsyncStorage.getItem(storageKey(userId))
      .then((raw) => {
        if (cancelled) return;
        const parsed: SwipedRecord = raw ? JSON.parse(raw) : {};
        recordsRef.current = parsed;
        setRecords(parsed);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(
    (next: SwipedRecord) => {
      recordsRef.current = next;
      setRecords(next);
      if (userId) AsyncStorage.setItem(storageKey(userId), JSON.stringify(next)).catch(() => {});
    },
    [userId]
  );

  const markSwiped = useCallback(
    (eventId: string, action: SwipeAction) => {
      const next = { ...recordsRef.current, [eventId]: { action, at: Date.now() } };
      const ids = Object.keys(next);
      if (ids.length > MAX_RECORDS) {
        ids
          .sort((a, b) => next[a].at - next[b].at)
          .slice(0, ids.length - MAX_RECORDS)
          .forEach((id) => delete next[id]);
      }
      persist(next);
    },
    [persist]
  );

  /** スキップしたものだけ束に戻す（保存・申請したものは戻さない） */
  const restoreSkipped = useCallback(() => {
    const next: SwipedRecord = {};
    for (const [id, rec] of Object.entries(recordsRef.current)) {
      if (rec.action !== 'skip') next[id] = rec;
    }
    persist(next);
  }, [persist]);

  const actionOf = useCallback((eventId: string): SwipeAction | null => records[eventId]?.action ?? null, [records]);

  return { loaded, actionOf, markSwiped, restoreSkipped };
}
