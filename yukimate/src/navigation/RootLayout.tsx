import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { supabase } from '@lib/supabase';
import { Slot, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    console.log('🚀 RootLayout: Mounted');

    const initialize = async () => {
      try {
        console.log('🔄 Checking session...');

        // 初期セッションチェック（タイムアウト付き）
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]) as any;

        console.log('✅ Session check done:', session ? 'Logged in' : 'Guest');

        if (mounted) {
          // 初期化完了 - ローディング解除
          setIsReady(true);
        }

        // 認証状態の変化を監視
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          console.log(`🔔 Auth event: ${event}`);

          if (!mounted) return;

          // SIGNED_INイベントのみホーム画面へリダイレクト
          if (event === 'SIGNED_IN' && session) {
            console.log('➡️  Redirecting to home...');
            router.replace('/(tabs)/home');
          }
          // SIGNED_OUTイベントのみサインイン画面へリダイレクト
          else if (event === 'SIGNED_OUT') {
            console.log('➡️  Redirecting to sign-in...');
            router.replace('/(auth)/sign-in');
          }
        });

        authSubscription = listener.subscription;

      } catch (error) {
        console.error('❌ Init error:', error);
        if (mounted) {
          setIsReady(true);
        }
      }
    };

    initialize();

    return () => {
      console.log('🧹 RootLayout: Unmounted');
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  if (!isReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1628',
  },
});
