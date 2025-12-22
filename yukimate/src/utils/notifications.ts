import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 通知の表示方法を設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * プッシュ通知トークンを取得
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;

  // TODO: Androidでプッシュ通知を有効にするにはFirebaseの設定が必要
  // Firebase設定後に以下のチェックを削除してください


  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('通知の権限が許可されませんでした');
      return undefined;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'default-project-id';
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = expoPushToken.data;
      console.log('✅ Push token取得成功:', token);
    } catch (error) {
      console.error('❌ Push token取得エラー:', error);
    }
  } else {
    console.warn('プッシュ通知は実機でのみ利用可能です');
  }

  return token;
}

/**
 * ローカル通知をすぐに送信
 */
export async function sendLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // すぐに表示
  });
}

/**
 * 指定時間後にローカル通知を送信
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number,
  data?: any
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: {
      seconds,
    },
  });

  return notificationId;
}

/**
 * 特定の時刻に通知を送信
 */
export async function scheduleNotificationAtTime(
  title: string,
  body: string,
  date: Date,
  data?: any
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: date,
  });

  return notificationId;
}

/**
 * スケジュールされた通知をキャンセル
 */
export async function cancelScheduledNotification(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * すべてのスケジュールされた通知をキャンセル
 */
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * 通知バッジをクリア
 */
export async function clearNotificationBadge() {
  await Notifications.setBadgeCountAsync(0);
}
