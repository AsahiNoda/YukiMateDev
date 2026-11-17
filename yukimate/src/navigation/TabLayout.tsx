import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { ActivityIndicator, View } from 'react-native';

import { AppTabBar } from '@components/AppTabBar';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useEventReminderSync } from '@/hooks/useEventReminderSync';
import { usePendingRequestCount } from '@/hooks/usePendingRequestCount';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * 下部タブ：ホーム／さがす／作成／チャット／マイページ（docs/ui-redesign/README.md「2. ナビゲーションの変更」）
 * - Discover は「さがす」の中のスワイプ表示に統合（app/(tabs)/search）
 * - Snowfeed はタブから外し、ゲレンデページのスタック画面にした（app/resort）
 * - 「作成」はタブバーのボタンから選択シートを開く（AppTabBar）
 */
export default function TabLayout() {
  const { session, loading } = useAuth();
  const c = useAppColors();
  const { t } = useTranslation();

  // 認証状態を確認中はローディング表示
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.tintText} />
      </View>
    );
  }

  // セッションがない場合はログイン画面にリダイレクト
  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <AuthedTabs labels={{
    home: t('tabs.home'),
    search: t('tabs.explore'),
    create: t('tabs.create'),
    chat: t('tabs.chat'),
    profile: t('tabs.myPage'),
  }} />;
}

/** ログイン後だけ申請数を購読するため、タブ本体を分けている */
function AuthedTabs({ labels }: { labels: Record<'home' | 'search' | 'create' | 'chat' | 'profile', string> }) {
  const pendingRequests = usePendingRequestCount();
  // イベント開始前のリマインダーを本人の端末に揃える
  useEventReminderSync();

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} badges={{ chat: pendingRequests }} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: labels.home,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: labels.search,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: labels.create,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: labels.chat,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="message.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: labels.profile,
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
