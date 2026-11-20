import { ExpoConfig, ConfigContext } from 'expo/config';
import { existsSync } from 'fs';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Slope Link',
  slug: 'slopelink',
  version: '1.2.0',
  orientation: 'portrait',
  icon: './assets/images/app_icon.png',
  scheme: 'slopelink',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.slopelink.app',
    buildNumber: '1', // App Store Connect用のビルド番号（同じ version の中で毎回インクリメント。version を上げたら 1 に戻してよい）
    infoPlist: {
      NSCameraUsageDescription: 'Slope Linkはプロフィール写真やイベント写真の撮影にカメラを使用します。',
      NSPhotoLibraryUsageDescription: 'Slope Linkはプロフィール写真やイベント写真の選択にフォトライブラリを使用します。',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    versionCode: 21, // Play Console用の内部バージョン番号（整数、毎回インクリメント。1.1.0 のビルドは 20）
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/app_icon.png',
      backgroundImage: './assets/images/app_icon.png',
      monochromeImage: './assets/images/app_icon.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.slopelink.app',
    // EAS Build では GOOGLE_SERVICES_JSON (file secret) が渡される。
    // ローカルにファイルが無い場合は指定を外してビルドを通す（FCMプッシュ通知のみ無効）
    ...(process.env.GOOGLE_SERVICES_JSON || existsSync('./google-services.json')
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json' }
      : {}),
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/app_icon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/app_icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    'expo-notifications',
    // Sentryプラグインを一時的に無効化（New Architectureとの互換性問題のため）
    // [
    //   '@sentry/react-native/expo',
    //   {
    //     url: 'https://sentry.io/',
    //     project: 'react-native',
    //     organization: 'slope-link',
    //   },
    // ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: 'a82327ee-4b50-4300-bafb-4e3e51b3ee98',
    },
    // EAS Secretsから環境変数を安全に注入
    // EAS Build時はprocess.envに自動的に値が入る
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  },
});
