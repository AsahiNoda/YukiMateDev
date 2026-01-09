export default {
  expo: {
    name: 'Slope Link',
    slug: 'slopelink',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/app_icon.png',
    scheme: 'slopelink',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.slopelink.app',
      infoPlist: {
        NSCameraUsageDescription: 'Slope Linkはプロフィール写真やイベント写真の撮影にカメラを使用します。',
        NSPhotoLibraryUsageDescription: 'Slope Linkはプロフィール写真やイベント写真の選択にフォトライブラリを使用します。',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/app_icon.png',
        backgroundImage: './assets/images/app_icon.png',
        monochromeImage: './assets/images/app_icon.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.slopelink.app',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
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
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: 'a82327ee-4b50-4300-bafb-4e3e51b3ee98',
      },
      // 環境変数から読み込む（EXPO_PUBLIC_プレフィックスは自動的に利用可能）
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
