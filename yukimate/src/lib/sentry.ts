import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Sentry DSNを環境変数から取得
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Sentryを初期化
 * 本番環境でのみエラー追跡を有効化
 */
export function initSentry() {
  // Sentry DSNが設定されていない場合はスキップ
  if (!SENTRY_DSN) {
    console.log('ℹ️ Sentry DSN not configured, error tracking disabled');
    return;
  }

  // 開発環境では無効化（オプション）
  if (__DEV__) {
    console.log('ℹ️ Sentry disabled in development mode');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    // アプリバージョン情報
    release: Constants.expoConfig?.version || '1.0.0',
    dist: '1',
    // 環境設定
    environment: __DEV__ ? 'development' : 'production',
    // サンプリング率（本番環境では調整）
    tracesSampleRate: 1.0,
    // エラーログの詳細度
    enableInExpoDevelopment: false,
    // ネイティブクラッシュも追跡
    enableNative: true,
    // デバッグモード（開発時のみ）
    debug: __DEV__,
    // パンくずリスト（ユーザーの操作履歴）
    maxBreadcrumbs: 50,
    // 統合設定
    integrations: [
      new Sentry.ReactNativeTracing({
        // パフォーマンス監視の設定
        tracingOrigins: ['localhost', /^\//],
        // ルーティング追跡
        routingInstrumentation: new Sentry.ReactNativeTracing.RoutingInstrumentation(),
      }),
    ],
    // 個人情報を含むイベントをフィルタリング
    beforeSend(event, hint) {
      // パスワードやトークンを含むイベントは送信しない
      if (event.message?.includes('password') || event.message?.includes('token')) {
        return null;
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized successfully');
}

/**
 * カスタムエラーをSentryに報告
 */
export function reportError(error: Error, context?: Record<string, any>) {
  if (!SENTRY_DSN || __DEV__) {
    console.error('Error (not sent to Sentry):', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * カスタムメッセージをSentryに報告
 */
export function reportMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  if (!SENTRY_DSN || __DEV__) {
    console.log(`Message (not sent to Sentry) [${level}]:`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * ユーザーコンテキストを設定
 */
export function setUserContext(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * ユーザーコンテキストをクリア（ログアウト時）
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * カスタムタグを設定
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * パンくずリストを追加（ユーザーの操作履歴）
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

// デフォルトエクスポート
export default {
  initSentry,
  reportError,
  reportMessage,
  setUserContext,
  clearUserContext,
  setTag,
  addBreadcrumb,
};
