import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { supabase } from '@lib/supabase';
import { Slot, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    // すでに初期化済みの場合はスキップ
    if (initRef.current) {
      console.log('⚠️  Already initialized, skipping...');
      return;
    }

    initRef.current = true;
    let mounted = true;
    let authSubscription: any = null;

    console.log('🚀 RootLayout: Initializing...');

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

        // セッションがある場合、プロフィールの存在を確認
        if (session?.user) {
          console.log('🔍 Checking profile existence...');
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .single();

          if (error && error.code === 'PGRST116') {
            // プロフィールが存在しない場合、プロフィール作成画面へ
            console.log('⚠️  Profile not found, redirecting to setup...');
            if (mounted) {
              setIsReady(true);
              router.replace('/profile-setup');
            }
            return;
          } else if (profile) {
            console.log('✅ Profile exists');
          }
        }

        if (mounted) {
          // 初期化完了 - ローディング解除
          setIsReady(true);
        }

        // 認証状態の変化を監視
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          console.log(`🔔 Auth event: ${event}, Has session: ${!!session}`);

          if (!mounted) {
            console.log('⚠️  Auth event ignored: component unmounted');
            return;
          }

          // INITIAL_SESSIONは無視（既にセッションチェック済み）
          if (event === 'INITIAL_SESSION') {
            console.log('ℹ️  Initial session event - ignoring');
            return;
          }

          // TOKEN_REFRESHEDも無視
          if (event === 'TOKEN_REFRESHED') {
            console.log('ℹ️  Token refreshed - ignoring');
            return;
          }

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
      console.log('🧹 RootLayout: Cleanup');
      mounted = false;
      if (authSubscription) {
        console.log('🔕 Unsubscribing from auth listener');
        authSubscription.unsubscribe();
      }
    };
  }, []);

  if (!isReady) {
    console.log('⏳ RootLayout: Loading...');
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </GestureHandlerRootView>
    );
  }

  console.log('✅ RootLayout: Ready, rendering Slot');
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
