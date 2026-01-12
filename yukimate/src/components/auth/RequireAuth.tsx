import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * 認証が必要な画面を保護するHOCコンポーネント
 *
 * 使用例:
 * ```tsx
 * export default function Settings() {
 *   return (
 *     <RequireAuth>
 *       <SettingsScreen />
 *     </RequireAuth>
 *   );
 * }
 * ```
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  // 認証状態を確認中はローディング表示
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5A7D9A" />
      </View>
    );
  }

  // セッションがない場合はログイン画面にリダイレクト
  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // 認証済みの場合は子コンポーネントを表示
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A202C',
  },
});
