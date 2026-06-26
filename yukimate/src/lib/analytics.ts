import * as amplitude from '@amplitude/analytics-react-native';

// Amplitude APIキーを環境変数から取得
const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY;

/**
 * Amplitudeアナリティクスを初期化
 */
export function initAnalytics() {
  // APIキーが設定されていない場合はスキップ
  if (!AMPLITUDE_API_KEY) {
    console.log('ℹ️ Amplitude API key not configured, analytics disabled');
    return;
  }

  // 開発環境では無効化（オプション）
  if (__DEV__) {
    console.log('ℹ️ Amplitude disabled in development mode');
    return;
  }

  amplitude.init(AMPLITUDE_API_KEY, undefined, {
    // デフォルト設定
    defaultTracking: {
      sessions: true,
      appLifecycles: true,
      screenViews: false, // 手動で追跡
    },
    // トラッキング設定
    trackingOptions: {
      ipAddress: false, // プライバシー保護
      platform: true,
      osName: true,
      osVersion: true,
      deviceModel: true,
      language: true,
    },
  });

  console.log('✅ Amplitude initialized successfully');
}

/**
 * カスタムイベントを追跡
 */
export function trackEvent(
  eventName: string,
  eventProperties?: Record<string, any>
) {
  if (!AMPLITUDE_API_KEY || __DEV__) {
    console.log(`[Analytics] Event: ${eventName}`, eventProperties);
    return;
  }

  amplitude.track(eventName, eventProperties);
}

/**
 * 画面表示を追跡
 */
export function trackScreen(screenName: string, properties?: Record<string, any>) {
  trackEvent('Screen View', {
    screen_name: screenName,
    ...properties,
  });
}

/**
 * ユーザープロパティを設定
 */
export function setUserProperties(properties: Record<string, any>) {
  if (!AMPLITUDE_API_KEY || __DEV__) {
    console.log('[Analytics] User Properties:', properties);
    return;
  }

  const identifyEvent = new amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => {
    identifyEvent.set(key, value);
  });
  amplitude.identify(identifyEvent);
}

/**
 * ユーザーIDを設定
 */
export function setUserId(userId: string | null) {
  if (!AMPLITUDE_API_KEY || __DEV__) {
    console.log('[Analytics] User ID:', userId);
    return;
  }

  amplitude.setUserId(userId || undefined);
}

/**
 * ユーザーIDをリセット（ログアウト時）
 */
export function resetUserId() {
  setUserId(null);
}

// よく使うイベント名を定数として定義
export const AnalyticsEvents = {
  // 認証関連
  SIGN_UP: 'Sign Up',
  SIGN_IN: 'Sign In',
  SIGN_OUT: 'Sign Out',

  // イベント関連
  EVENT_VIEW: 'Event View',
  EVENT_CREATE: 'Event Create',
  EVENT_APPLY: 'Event Apply',
  EVENT_APPROVE: 'Event Approve',
  EVENT_REJECT: 'Event Reject',
  EVENT_CHAT_OPEN: 'Event Chat Open',

  // プロフィール関連
  PROFILE_VIEW: 'Profile View',
  PROFILE_EDIT: 'Profile Edit',
  PROFILE_PHOTO_UPLOAD: 'Profile Photo Upload',

  // ソーシャル関連
  USER_STAR: 'User Star',
  USER_BLOCK: 'User Block',

  // Snowfeed関連
  SNOWFEED_POST_CREATE: 'Snowfeed Post Create',
  SNOWFEED_POST_LIKE: 'Snowfeed Post Like',
  SNOWFEED_POST_COMMENT: 'Snowfeed Post Comment',

  // 検索・発見
  SEARCH: 'Search',
  DISCOVER_EVENT: 'Discover Event',

  // 通知
  NOTIFICATION_OPEN: 'Notification Open',
  NOTIFICATION_SETTINGS: 'Notification Settings',
} as const;

// デフォルトエクスポート
export default {
  initAnalytics,
  trackEvent,
  trackScreen,
  setUserProperties,
  setUserId,
  resetUserId,
  AnalyticsEvents,
};
