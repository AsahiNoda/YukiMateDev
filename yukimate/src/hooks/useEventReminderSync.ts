import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { syncEventReminders } from '@/services/eventNotificationService';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** 前面に戻るたびに走らせすぎないための間隔 */
const MIN_INTERVAL_MS = 60 * 1000;

/** 予定が変わりうる通知（届いたらすぐ揃え直す） */
const RESYNC_TYPES = new Set(['event_application_approved', 'event_cancelled', 'new_participant']);

/**
 * イベント開始前のリマインダーを、ログイン中のユーザー本人の端末に揃える。
 * - ログインしたとき・アプリが前面に戻ったとき（1分に1回まで）
 * - 参加承認やキャンセルの通知を受け取ったとき（すぐ）
 * - 言語を切り替えたとき（文言を作り直す）
 */
export function useEventReminderSync() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const userId = user?.id;
  const lastRun = useRef(0);

  useEffect(() => {
    if (!userId) return;

    const run = (force = false) => {
      const now = Date.now();
      if (!force && now - lastRun.current < MIN_INTERVAL_MS) return;
      lastRun.current = now;
      syncEventReminders(userId, locale);
    };

    run(true);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    const notificationSub = Notifications.addNotificationReceivedListener((notification) => {
      const type = (notification.request.content.data as { type?: string } | undefined)?.type;
      if (type && RESYNC_TYPES.has(type)) run(true);
    });

    return () => {
      appStateSub.remove();
      notificationSub.remove();
    };
  }, [userId, locale]);
}
