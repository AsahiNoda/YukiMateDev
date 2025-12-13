import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { AuthProvider } from '@/contexts/AuthContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { checkPendingEventActions } from '@/utils/event-checker';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@lib/supabase';
import { initSentry } from '@lib/sentry';
import { initAnalytics } from '@lib/analytics';
import ErrorBoundary from '@/components/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Sentryを初期化（アプリ起動時に1回だけ実行）
initSentry();
// Amplitudeアナリティクスを初期化
initAnalytics();

// グローバル変数で初期化状態を管理（再マウント時もリセットされない）
let globalInitialized = false;
// ナビゲーション中フラグ（重複ナビゲーション防止）
let isNavigating = false;

export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);

  // 通知機能を初期化
  useNotifications();

  useEffect(() => {
    // すでに初期化済みの場合はスキップ（グローバル変数を使用）
    if (globalInitialized) {
      console.log('⚠️  Already initialized, skipping...');
      setIsReady(true);
      return;
    }

    globalInitialized = true;
    initRef.current = true;
    let mounted = true;
    let authSubscription: any = null;

    console.log('🚀 RootLayout: Initializing...');

    const initialize = async () => {
      try {
        console.log('🔄 Checking session...');

        // 高速化: getSession()は遅い場合があるので、短いタイムアウトを設定
        let session;
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Session check timeout')), 2000)
          );

          const result = await Promise.race([
            sessionPromise,
            timeoutPromise,
          ]);
          session = result.data.session;
          console.log('✅ Session check done (fast):', session ? 'Logged in' : 'Guest');
        } catch (error: any) {
          // タイムアウトまたはエラーの場合、ローカルストレージから直接読み込む
          console.warn('⚠️  Session check slow/failed, checking local storage...');
          try {
            // AsyncStorageから直接セッション情報を取得（高速）
            const sessionStr = await AsyncStorage.getItem('sb-rmdpetmotoafaddkvyrk-auth-token');
            if (sessionStr) {
              const sessionData = JSON.parse(sessionStr);
              if (sessionData?.currentSession?.access_token) {
                console.log('✅ Found session in local storage');
                session = sessionData.currentSession;
              } else {
                console.log('⚠️  Invalid session in local storage');
              }
            } else {
              console.log('⚠️  No session in local storage');
            }
          } catch (storageError) {
            console.error('❌ Error reading from local storage:', storageError);
          }

          // ローカルストレージにもセッションがない場合
          if (!session) {
            console.log('➡️  No valid session found, redirecting to sign-in');
            if (mounted) {
              setIsReady(true);
              router.replace('/(auth)/sign-in');
            }
            return;
          }
        }

        // セッションがない場合、サインイン画面へリダイレクト
        if (!session) {
          console.log('⚠️  No session found, redirecting to sign-in...');
          if (mounted) {
            setIsReady(true);
            router.replace('/(auth)/sign-in');
          }
          return;
        }

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

            // ペンディング中のイベントアクションをバックグラウンドでチェック
            // アプリ起動を遅らせないように、先にローディング解除してから非同期で実行
            if (mounted) {
              setIsReady(true);
            }

            // バックグラウンドでチェック（起動時間に影響しない）
            checkPendingEventActions(session.user.id).then((pendingEvent) => {
              if (pendingEvent && mounted) {
                console.log('🚀 Found pending event action, redirecting to post-event-action');
                // 少し遅延させてからナビゲーション（ホーム画面が表示された後）
                setTimeout(() => {
                  router.push({
                    pathname: '/post-event-action/[eventId]',
                    params: {
                      eventId: pendingEvent.eventId,
                      participants: JSON.stringify(pendingEvent.participants),
                    },
                  } as any);
                }, 1000);
              }
            }).catch((error) => {
              console.error('❌ Error checking pending event actions:', error);
            });

            return; // 早期リターンしてすぐにローディング解除
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

          // SIGNED_INイベント時にプロフィールの存在を確認
          if (event === 'SIGNED_IN' && session) {
            console.log('➡️  User signed in, checking profile...');

            // ナビゲーション中フラグをチェック（重複防止）
            if (isNavigating) {
              console.log('⚠️  Already navigating, skipping duplicate navigation');
              return;
            }
            isNavigating = true;

            // プロフィールの存在確認
            supabase
              .from('profiles')
              .select('user_id')
              .eq('user_id', session.user.id)
              .single()
              .then(({ data: profile, error }) => {
                if (error && error.code === 'PGRST116') {
                  // プロフィールが存在しない場合
                  console.log('⚠️  Profile not found, redirecting to setup...');
                  router.replace('/profile-setup');
                  setTimeout(() => { isNavigating = false; }, 1000);
                } else if (profile) {
                  // プロフィールが存在する場合
                  console.log('✅ Profile exists, redirecting to home...');
                  router.replace('/(tabs)/home');
                  setTimeout(() => { isNavigating = false; }, 1000);
                } else {
                  // その他のエラー
                  console.error('❌ Error checking profile:', error);
                  router.replace('/(tabs)/home');
                  setTimeout(() => { isNavigating = false; }, 1000);
                }
              });
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

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LocaleProvider>
          <AuthProvider>
            {!isReady ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5A7D9A" />
              </View>
            ) : (
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
                <Stack.Screen name="event-detail" options={{ presentation: 'card' }} />
                <Stack.Screen name="event-chat/[eventId]" options={{ presentation: 'card' }} />
                <Stack.Screen name="post-event-action/[eventId]" options={{ presentation: 'card' }} />
                <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
              </Stack>
            )}
          </AuthProvider>
        </LocaleProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A202C',
  },
});
