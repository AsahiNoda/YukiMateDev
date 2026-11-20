import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { useNotifications } from '@/hooks/useNotifications';
import { QueryProvider } from '@/providers/QueryProvider';
import { checkPendingEventActions } from '@/utils/event-checker';
import { initAnalytics } from '@lib/analytics';
// import { initSentry } from '@lib/sentry'; // 一時的に無効化
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, InteractionManager, Linking, LogBox, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 開発中だけ：Expo の開発ツール（withDevTools）が画面を点けたままにするために expo-keep-awake を呼ぶが、
// Android でアプリが前面に無い瞬間（リンクから起動・バックグラウンドから復帰など）は失敗し、
// その Promise を Expo 側が catch していないため赤いエラーになる。アプリの不具合ではなく、本番ビルドには含まれない。
if (__DEV__) {
  LogBox.ignoreLogs(['Unable to activate keep awake']);
}
// import * as Sentry from '@sentry/react-native'; // 一時的に無効化

// ErrorUtilsの型定義
declare const ErrorUtils: {
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
};

// グローバルエラーハンドラーを最初に設定（Sentry初期化前）
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('🔴 GLOBAL ERROR HANDLER:', {
      isFatal,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // Sentryにエラーを送信（一時的に無効化）
    // try {
    //   Sentry.captureException(error, {
    //     level: 'fatal',
    //     extra: {
    //       isFatal,
    //     },
    //   });
    //   console.log('📤 [Global Handler] Error sent to Sentry');
    // } catch (sentryError) {
    //   console.error('❌ [Global Handler] Failed to send to Sentry:', sentryError);
    // }

    // 元のハンドラーを呼び出し
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
  console.log('✅ Global error handler registered');
}

// Supabaseを遅延ロード（エラーハンドリング付き）
let supabase: any = null;
try {
  console.log('📦 Loading Supabase module...');
  const supabaseModule = require('@lib/supabase');
  supabase = supabaseModule.supabase;
  console.log('✅ Supabase module loaded successfully');
} catch (error: any) {
  console.error('❌ CRITICAL: Failed to load Supabase module:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  // Supabaseの読み込みに失敗した場合、アプリを続行させない
  throw new Error(`Supabase initialization failed: ${error.message}`);
}

// Sentryを初期化（アプリ起動時に1回だけ実行）
// 一時的に無効化: New Architectureとの互換性問題のため
// try {
//   console.log('📦 Initializing Sentry...');
//   initSentry();
//   console.log('✅ Sentry initialized successfully');
// } catch (error: any) {
//   console.error('⚠️ Failed to initialize Sentry:', error);
//   // Sentryの初期化失敗は致命的ではないので続行
// }
console.log('ℹ️ Sentry is temporarily disabled due to New Architecture compatibility');

// Amplitudeアナリティクスを初期化
try {
  console.log('📦 Initializing Analytics...');
  initAnalytics();
  console.log('✅ Analytics initialized successfully');
} catch (error: any) {
  console.error('⚠️ Failed to initialize Analytics:', error);
  // Analyticsの初期化失敗は致命的ではないので続行
}

// グローバル変数で初期化状態を管理（再マウント時もリセットされない）
let globalInitialized = false;
// ナビゲーション中フラグ（重複ナビゲーション防止）
let isNavigating = false;
// パスワードリカバリーセッション中フラグ
let isRecoverySession = false;
// パスワード設定セッション中フラグ
let isSetPasswordSession = false;

// プロフィール存在確認済みフラグ（AsyncStorage）
// 一度確認できたユーザーは次回起動時にネットワーク確認を待たずに画面を表示する
const PROFILE_EXISTS_KEY_PREFIX = '@slopelink_profile_exists_';
const markProfileExists = (userId: string) =>
  AsyncStorage.setItem(PROFILE_EXISTS_KEY_PREFIX + userId, '1').catch(() => {});
const hasCachedProfile = async (userId: string) => {
  try {
    return (await AsyncStorage.getItem(PROFILE_EXISTS_KEY_PREFIX + userId)) === '1';
  } catch {
    return false;
  }
};

export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);

  // 通知機能を初期化
  useNotifications();

  useEffect(() => {
    initRef.current = true;
    let mounted = true;
    let authSubscription: any = null;
    let linkingSubscription: any = null;

    console.log('🚀 RootLayout: Initializing... (globalInitialized:', globalInitialized, ')');

    const initialize = async () => {
      try {
        // セッションチェックをスキップする場合は、リスナーのみ登録
        if (globalInitialized) {
          console.log('⏭️  Already initialized, skipping session check but registering listeners...');
          if (mounted) {
            setIsReady(true);
          }
          // リスナー登録部分にジャンプ（下の方で実行される）
        } else {
          // 起動時の確認（リンク・セッション・プロフィール）。途中の return はこの中だけを抜ける。
          // 以前は initialize 全体から return していたため、リンクの期限切れ・未ログインなどで起動したとき
          // 下の「ログインしたら画面を進める」リスナーが登録されず、ログインしても先へ進めなかった。
          await (async () => {
          console.log('🔄 Checking session...');
          globalInitialized = true;

          // ディープリンクからセッションを復元
          const url = await Linking.getInitialURL();
          if (url) {
            console.log('🔗 Deep link detected:', url);
            try {
              const urlObj = new URL(url);

              // まずエラーをチェック
              let error = urlObj.searchParams.get('error');
              let errorDescription = urlObj.searchParams.get('error_description');

              if (!error && urlObj.hash) {
                const hashParams = new URLSearchParams(urlObj.hash.substring(1));
                error = hashParams.get('error');
                errorDescription = hashParams.get('error_description');
              }

              if (error) {
                console.warn('⚠️  Deep link contains error:', error, errorDescription);
                // エラーがある場合はサインイン画面へ。期限切れなどの理由を画面に出す（linkError）
                if (mounted) {
                  setIsReady(true);
                  router.replace({ pathname: '/(auth)/sign-in', params: { linkError: error } } as any);
                }
                return; // 起動時の確認だけを抜ける（下のリスナーは登録される）
              }

              // URLからaccess_tokenとrefresh_tokenを抽出
              let accessToken: string | null = null;
              let refreshToken: string | null = null;
              let type: string | null = null;

              // まずクエリパラメータをチェック
              accessToken = urlObj.searchParams.get('access_token');
              refreshToken = urlObj.searchParams.get('refresh_token');
              type = urlObj.searchParams.get('type');

              // クエリパラメータになければフラグメントをチェック
              if (!accessToken && urlObj.hash) {
                const hashParams = new URLSearchParams(urlObj.hash.substring(1));
                accessToken = hashParams.get('access_token');
                refreshToken = hashParams.get('refresh_token');
                type = type || hashParams.get('type');
              }

              if (accessToken && refreshToken) {
                // type=recovery の場合、セッション設定前にリカバリーフラグを設定
                if (type === 'recovery') {
                  console.log('🔐 Setting recovery session flag BEFORE setting session (initial)');
                  isRecoverySession = true;
                } else if (urlObj.hostname === 'set-password' || urlObj.pathname?.includes('set-password')) {
                  console.log('🔐 Setting set-password session flag BEFORE setting session (initial)');
                  isSetPasswordSession = true;
                }

                console.log('✅ Tokens found in URL, setting session...');
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                if (data.session) {
                  console.log('✅ Session restored from deep link');
                  console.log('📧 Restored session user email:', data.session.user.email);
                  console.log('🆔 Restored session user ID:', data.session.user.id);

                  // recovery typeの場合、パスワードリセット画面へ遷移
                  if (type === 'recovery') {
                    console.log('➡️  Recovery type detected (initial), navigating to reset password screen...');
                    if (mounted) {
                      setIsReady(true);
                      router.replace('/(auth)/reset-password');
                    }
                    return; // 早期リターン
                  }

                  // set-passwordの場合、パスワード設定画面へ遷移
                  if (urlObj.hostname === 'set-password' || urlObj.pathname?.includes('set-password')) {
                    console.log('➡️  Set password link detected (initial), navigating to set password screen...');
                    if (mounted) {
                      setIsReady(true);
                      router.replace('/(auth)/set-password');
                    }
                    return;
                  }
                } else if (error) {
                  console.error('❌ Error restoring session from URL:', error);
                }
              } else {
                console.log('⚠️  No tokens found in URL');
              }
            } catch (urlError) {
              console.error('❌ Error parsing deep link URL:', urlError);
            }
          }

          // getSession()のタイムアウト（モバイル回線でもトークンリフレッシュが完了するよう余裕を持たせる）
          let session;
          try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Session check timeout')), 10000)
            );

            const result = await Promise.race([
              sessionPromise,
              timeoutPromise,
            ]);
            session = result.data.session;
            console.log('✅ Session check done (fast):', session ? 'Logged in' : 'Guest');
          } catch (error: any) {
            // リフレッシュトークンエラーの場合、セッションをクリアしてログアウト
            if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
              console.warn('⚠️  Invalid refresh token detected, clearing session...');
              await AsyncStorage.removeItem('sb-rmdpetmotoafaddkvyrk-auth-token');
              await supabase.auth.signOut();
              if (mounted) {
                setIsReady(true);
                router.replace('/(auth)/sign-in');
              }
              return;
            }

            // タイムアウトまたはその他のエラーの場合、ローカルストレージから直接読み込む
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
            console.log('🔍 Checking email confirmation...');
            console.log('📧 Email confirmed at:', session.user.email_confirmed_at);

            // メール未確認の場合はサインアウトして認証画面に戻す
            if (!session.user.email_confirmed_at) {
              console.log('⚠️ Email not confirmed during initialization, signing out...');
              await supabase.auth.signOut();
              if (mounted) {
                setIsReady(true);
                router.replace('/(auth)/sign-in');
              }
              return;
            }

            const userId = session.user.id;

            // ペンディング中のイベントアクションをバックグラウンドでチェック
            // 初回描画・ホーム画面のデータ取得が終わってから実行（起動直後の通信競合を避ける）
            const schedulePendingEventCheck = () => {
              InteractionManager.runAfterInteractions(() => {
                checkPendingEventActions(userId).then((pendingEvent) => {
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
              });
            };

            const checkProfileOnServer = async () => {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('user_id', userId)
                .maybeSingle();
              if (error) {
                console.error('❌ Error checking profile:', error);
                return 'unknown' as const;
              }
              if (profile) {
                markProfileExists(userId);
                return 'exists' as const;
              }
              AsyncStorage.removeItem(PROFILE_EXISTS_KEY_PREFIX + userId).catch(() => {});
              return 'missing' as const;
            };

            if (await hasCachedProfile(userId)) {
              // 確認済みユーザー: 即座に表示し、サーバー確認は裏で行う
              console.log('✅ Profile exists (cached), showing app immediately');
              if (mounted) {
                setIsReady(true);
              }
              schedulePendingEventCheck();
              checkProfileOnServer().then((result) => {
                if (result === 'missing' && mounted) {
                  console.log('⚠️  Profile not found on server, redirecting to setup...');
                  router.replace('/profile-setup');
                }
              });
            } else {
              console.log('🔍 Checking profile existence...');
              const result = await checkProfileOnServer();

              if (result === 'missing') {
                // プロフィールが存在しない場合、プロフィール作成画面へ
                console.log('⚠️  Profile not found, redirecting to setup...');
                if (mounted) {
                  setIsReady(true);
                  router.replace('/profile-setup');
                }
                // returnしない - リスナー登録を必ず実行するため
              } else {
                if (result === 'exists') {
                  console.log('✅ Profile exists');
                }
                if (mounted) {
                  setIsReady(true);
                }
                if (result === 'exists') {
                  schedulePendingEventCheck();
                }
              }
            }
          }

          if (mounted) {
            // 初期化完了 - ローディング解除
            setIsReady(true);
          }
          })();
        } // else ブロックを閉じる

        if (!mounted) return;

        // 認証状態の変化を監視（セッションチェックをスキップした場合も必ず実行）
        console.log('📡 Registering auth state change listener...');
        const { data: listener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
          console.log(`🔔 RootLayout: Auth event: ${event}, Has session: ${!!session}`);

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

          // PASSWORD_RECOVERYイベント時にパスワードリセット画面へ遷移
          if (event === 'PASSWORD_RECOVERY' && session) {
            console.log('➡️  Password recovery, redirecting to reset password screen...');
            router.replace('/(auth)/reset-password');
            return;
          }

          // SIGNED_INイベント時にプロフィールの存在を確認
          if (event === 'SIGNED_IN' && session) {
            console.log('🔐 [RootLayout] SIGNED_IN event received');
            console.log('🔍 [RootLayout] Recovery session flag:', isRecoverySession);
            console.log('🔍 [RootLayout] Is navigating:', isNavigating);
            console.log('📧 [RootLayout] Email confirmed:', session.user.email_confirmed_at);

            // メール未確認の場合はサインアウトして認証画面に戻す
            if (!session.user.email_confirmed_at) {
              console.log('⚠️ [RootLayout] Email not confirmed, signing out and redirecting to auth screen');
              (async () => {
                await supabase.auth.signOut();
                router.replace('/(auth)/sign-in');
              })();
              return;
            }

            // パスワードリカバリーセッション中の場合は自動ナビゲーションをスキップ
            if (isRecoverySession) {
              console.log('🔐 [RootLayout] Recovery session detected, staying on reset password screen');
              return;
            }

            // パスワード設定セッション中の場合は自動ナビゲーションをスキップ
            if (isSetPasswordSession) {
              console.log('🔐 [RootLayout] Set password session detected, staying on set password screen');
              return;
            }

            console.log('➡️  [RootLayout] Normal sign in, checking profile...');

            // ナビゲーション中フラグをチェック（重複防止）
            if (isNavigating) {
              console.log('⚠️  [RootLayout] Already navigating, skipping duplicate navigation');
              return;
            }
            console.log('✅ [RootLayout] Setting isNavigating = true');
            isNavigating = true;

            // プロフィールの存在確認(async/awaitで適切にエラーハンドリング)
            (async () => {
              try {
                const { data: profile, error } = await supabase
                  .from('profiles')
                  .select('user_id')
                  .eq('user_id', session.user.id)
                  .single();

                if (error && error.code === 'PGRST116') {
                  // プロフィールが存在しない場合
                  console.log('⚠️  Profile not found, redirecting to setup...');
                  router.replace('/profile-setup');
                } else if (profile) {
                  // プロフィールが存在する場合
                  markProfileExists(session.user.id);
                  console.log('✅ Profile exists, redirecting to home...');
                  router.replace('/(tabs)/home');
                } else {
                  // その他のエラー
                  console.error('❌ Error checking profile:', error);
                  router.replace('/(tabs)/home');
                }
              } catch (err) {
                console.error('❌ Unexpected error during profile check:', err);
                router.replace('/(tabs)/home');
              } finally {
                // 必ずフラグをリセット(エラーの有無に関わらず)
                console.log('🔄 Resetting isNavigating flag in 1 second...');
                setTimeout(() => {
                  isNavigating = false;
                  console.log('✅ isNavigating reset to false');
                }, 1000);
              }
            })();
          }
          // SIGNED_OUTイベントのみサインイン画面へリダイレクト
          else if (event === 'SIGNED_OUT') {
            console.log('➡️  Redirecting to sign-in...');
            // リカバリーセッションフラグをリセット
            if (isRecoverySession) {
              console.log('🔄 Resetting recovery session flag on sign out');
              isRecoverySession = false;
            }
            if (isSetPasswordSession) {
              console.log('🔄 Resetting set password session flag on sign out');
              isSetPasswordSession = false;
            }
            router.replace('/(auth)/sign-in');
          }
          // その他のイベントはログのみ
          else {
            console.log('ℹ️  Unhandled auth event:', event);
          }
        });

        authSubscription = listener.subscription;

        // アプリ実行中のディープリンクを監視
        const handleDeepLink = async (event: { url: string }) => {
          console.log('🔗 Deep link opened while app running:', event.url);
          try {
            const urlObj = new URL(event.url);

            // まずエラーをチェック
            let error = urlObj.searchParams.get('error');
            let errorDescription = urlObj.searchParams.get('error_description');

            if (!error && urlObj.hash) {
              const hashParams = new URLSearchParams(urlObj.hash.substring(1));
              error = hashParams.get('error');
              errorDescription = hashParams.get('error_description');
            }

            if (error) {
              console.warn('⚠️  Deep link contains error:', error, errorDescription);
              // サインイン画面で理由（期限切れ・無効）と次にすることを出す（アラートはやめた）
              router.replace({ pathname: '/(auth)/sign-in', params: { linkError: error } } as any);
              return;
            }

            let accessToken: string | null = null;
            let refreshToken: string | null = null;
            let type: string | null = null;

            console.log('🔎 Extracting tokens from URL...');
            console.log('🔎 URL search params:', urlObj.search);
            console.log('🔎 URL hash:', urlObj.hash);

            accessToken = urlObj.searchParams.get('access_token');
            refreshToken = urlObj.searchParams.get('refresh_token');
            type = urlObj.searchParams.get('type');

            if (!accessToken && urlObj.hash) {
              console.log('🔎 Checking hash params...');
              const hashParams = new URLSearchParams(urlObj.hash.substring(1));
              accessToken = hashParams.get('access_token');
              refreshToken = hashParams.get('refresh_token');
              type = type || hashParams.get('type');
            }

            console.log('🔎 Access token found:', !!accessToken);
            console.log('🔎 Refresh token found:', !!refreshToken);
            console.log('🔎 Type:', type);

            if (accessToken && refreshToken) {
              // type=recovery の場合、セッション設定前にリカバリーフラグを設定
              // これにより、SIGNED_INイベント発火時に既にフラグがtrueになっている
              if (type === 'recovery') {
                console.log('🔐 Setting recovery session flag BEFORE setting session');
                isRecoverySession = true;
              } else if (urlObj.hostname === 'set-password' || urlObj.pathname?.includes('set-password')) {
                console.log('🔐 Setting set-password session flag BEFORE setting session');
                isSetPasswordSession = true;
              }

              console.log('✅ Tokens found in deep link, setting session...');
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (data.session) {
                console.log('✅ Session set from runtime deep link');
                console.log('📧 Session user email:', data.session.user.email);
                console.log('🆔 Session user ID:', data.session.user.id);

                // recovery typeの場合、パスワードリセット画面へ遷移
                if (type === 'recovery') {
                  console.log('➡️ Recovery type detected, navigating to reset password screen...');
                  router.replace('/(auth)/reset-password');
                }

                // set-passwordの場合
                if (urlObj.hostname === 'set-password' || urlObj.pathname?.includes('set-password')) {
                  console.log('➡️ Set password link detected, navigating to set password screen...');
                  router.replace('/(auth)/set-password');
                }
              } else if (error) {
                console.error('❌ Error setting session from deep link:', error);
              }
            } else {
              console.warn('⚠️  Tokens not found in deep link');
              console.warn('⚠️  Access token:', accessToken ? 'present' : 'missing');
              console.warn('⚠️  Refresh token:', refreshToken ? 'present' : 'missing');
            }
          } catch (error) {
            console.error('❌ Error handling deep link:', error);
          }
        };

        linkingSubscription = Linking.addEventListener('url', handleDeepLink);

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
      if (linkingSubscription) {
        console.log('🔕 Removing deep link listener');
        linkingSubscription.remove();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryProvider>
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
                  <Stack.Screen name="(auth)/reset-password" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)/set-password" options={{ headerShown: false }} />
                  {/* 同じイベントの画面を重ねて開かない（連続タップなどで同じ詳細が2枚積まれ、戻るときに2回通るのを防ぐ） */}
                  <Stack.Screen
                    name="event-detail"
                    options={{ presentation: 'card' }}
                    dangerouslySingular={(_name, params) => (params?.eventId ? String(params.eventId) : undefined)}
                  />
                  <Stack.Screen
                    name="event-chat/[eventId]"
                    options={{ presentation: 'card' }}
                    dangerouslySingular={(_name, params) => (params?.eventId ? String(params.eventId) : undefined)}
                  />
                  <Stack.Screen name="post-event-action/[eventId]" options={{ presentation: 'card' }} />
                  <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
                </Stack>
              )}
            </AuthProvider>
          </LocaleProvider>
        </QueryProvider>
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
