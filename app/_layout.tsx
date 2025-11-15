import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuthAndProfile = async () => {
      try {
        // 初期セッション確認
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (mounted) {
            router.replace('/(auth)/sign-in');
            setReady(true);
            setInitializing(false);
          }
          return;
        }

        // プロフィール確認
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, home_resort_id')
          .eq('user_id', session.user.id)
          .single();

        if (mounted) {
          // プロフィールが存在しない、または必須項目が未設定の場合
          if (error || !profile || !profile.display_name || !profile.home_resort_id) {
            // 認証済みのルートにいる場合はプロフィール設定を促す
            if (segments[0] !== '(auth)') {
              // TODO: プロフィール設定画面にリダイレクト（現在はホームに）
              // router.replace('/(auth)/setup-profile');
            }
          }

          setReady(true);
          setInitializing(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          setReady(true);
          setInitializing(false);
        }
      }
    };

    checkAuthAndProfile();

    // 認証状態の変化を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (!session) {
        router.replace('/(auth)/sign-in');
      } else {
        // プロフィール確認
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, display_name, home_resort_id')
          .eq('user_id', session.user.id)
          .single();

        if (!profile || !profile.display_name || !profile.home_resort_id) {
          // TODO: プロフィール設定画面にリダイレクト
          // router.replace('/(auth)/setup-profile');
        } else {
          router.replace('/(tabs)/home');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, segments]);

  if (initializing || !ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1628',
  },
});
