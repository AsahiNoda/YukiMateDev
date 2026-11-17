import { supabase, getAuthUser } from '@/lib/supabase';
import { saveNotificationToken } from '@/services/notificationService';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * 通知機能を管理するカスタムフック
 */
export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Expo Go では通知機能を無効化 (SDK 53+ では動作しない)
    if (Constants.appOwnership === 'expo') {
      console.log('⚠️  Push notifications disabled in Expo Go. Use a development build instead.');
      return;
    }

    // プッシュ通知トークンの登録
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);

        // 現在のユーザーを取得してトークンを保存
        const { data: { user } } = await getAuthUser();
        if (user) {
          const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
          await saveNotificationToken(user.id, token, deviceType);
        }
      }
    });

    // 通知を受信したときのリスナー
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📩 通知受信:', notification);
      setNotification(notification);
    });

    // 通知をタップしたときのリスナー
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 通知タップ:', response);
      handleNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  /**
   * 通知タップ時の処理
   */
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    if (!data) return;

    // 通知タイプに応じて画面遷移
    switch (data.type) {
      case 'event_application_approved':
      case 'event_application_rejected':
      case 'event_starting':
      case 'event_cancelled':
      case 'new_participant':
        if (data.eventId) {
          router.push(`/event-detail?eventId=${data.eventId}` as any);
        }
        break;

      case 'post_event_action':
        if (data.eventId) {
          // PostEventActionScreen への遷移は EventChatScreen から行われるため、
          // ここではイベント詳細画面に遷移
          router.push(`/event-detail?eventId=${data.eventId}` as any);
        }
        break;

      case 'chat_message':
        if (data.eventId) {
          router.push(`/event-chat?eventId=${data.eventId}` as any);
        }
        break;

      default:
        console.log('未知の通知タイプ:', data.type);
    }
  };

  return {
    expoPushToken,
    notification,
  };
}
