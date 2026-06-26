import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Sentry DSNを環境変数から取得（app.config.ts経由）
// リリースビルドではprocess.envが利用できないため、Constants.expoConfigを優先
const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN;

// デバッグ情報を出力
console.log('🔍 [Sentry] DSN check:');
console.log('  - Constants.expoConfig?.extra?.sentryDsn:', Constants.expoConfig?.extra?.sentryDsn ? 'configured' : 'undefined');
console.log('  - process.env.EXPO_PUBLIC_SENTRY_DSN:', process.env.EXPO_PUBLIC_SENTRY_DSN ? 'configured' : 'undefined');
console.log('  - Final SENTRY_DSN:', SENTRY_DSN ? 'configured' : 'NOT CONFIGURED');

/**
 * Sentryを初期化
 * 本番環境でのみエラー追跡を有効化
 */
export function initSentry() {
  console.log('🚀 [Sentry] Initializing Sentry...');
  console.log('  - __DEV__:', __DEV__);
  console.log('  - SENTRY_DSN configured:', !!SENTRY_DSN);

  // Sentry DSNが設定されていない場合はスキップ
  if (!SENTRY_DSN) {
    console.warn('⚠️ [Sentry] DSN not configured, error tracking disabled');
    console.warn('⚠️ [Sentry] This means crashes will NOT be reported to Sentry!');
    return;
  }

  // 開発環境では無効化（オプション）
  if (__DEV__) {
    console.log('ℹ️ [Sentry] Disabled in development mode');
    return;
  }

  console.log('🔧 [Sentry] Configuring Sentry with DSN...');

  Sentry.init({
    dsn: SENTRY_DSN,
    // アプリバージョン情報
    release: `com.slopelink.app@${Constants.expoConfig?.version || '1.0.0'}`,
    dist: String(Constants.expoConfig?.android?.versionCode || '1'),
    // 環境設定
    environment: 'production',
    // サンプリング率を100%に設定（全てのエラーをキャプチャ）
    tracesSampleRate: 1.0,
    // ネイティブクラッシュも追跡
    enableNative: true,
    // 本番環境でもデバッグモードを有効化（一時的）
    debug: true,
    // パンくずリスト（ユーザーの操作履歴）
    maxBreadcrumbs: 50,
    // 個人情報を含むイベントをフィルタリング
    beforeSend(event, hint) {
      console.log('📤 [Sentry] Sending event to Sentry:', event.event_id);

      // パスワードやトークンを含むイベントは送信しない
      if (event.message?.includes('password') || event.message?.includes('token')) {
        console.log('🚫 [Sentry] Blocked event containing sensitive data');
        return null;
      }
      return event;
    },
  });

  // Expo固有のタグを設定
  Sentry.setTag('expo-release-channel', Constants.expoConfig?.extra?.releaseChannel || 'default');
  Sentry.setTag('expo-app-version', Constants.expoConfig?.version || '1.0.0');
  Sentry.setTag('expo-platform', 'android');

  console.log('✅ [Sentry] Initialized successfully');
  console.log('  - Release:', `com.slopelink.app@${Constants.expoConfig?.version || '1.0.0'}`);
  console.log('  - Environment: production');
  console.log('  - Debug mode: enabled');
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
