import { Slot, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 初期セッション確認
    supabase.auth.getSession().then((result: { data: { session: any; }; }) => {
      if (!result.data?.session) router.replace('/(auth)/sign-in');
      setReady(true);
    });
    // 以後の変化を監視
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      if (!session) router.replace('/(auth)/sign-in');
      else router.replace('/(tabs)/home');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  return <Slot />;
}
