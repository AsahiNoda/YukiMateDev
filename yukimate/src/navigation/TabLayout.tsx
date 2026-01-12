import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { ActivityIndicator, View } from 'react-native';

import { IconSymbol } from '@components/ui/icon-symbol';
import { GlassmorphicTabBar } from '@components/glassmorphic-tab-bar';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();

  // 認証状態を確認中はローディング表示
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A202C' }}>
        <ActivityIndicator size="large" color="#5A7D9A" />
      </View>
    );
  }

  // セッションがない場合はログイン画面にリダイレクト
  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      tabBar={(props) => <GlassmorphicTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: { position: 'absolute' },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="safari" color={color} />,
        }}
      />
      <Tabs.Screen
        name="snowfeed"
        options={{
          title: 'Snowfeed',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="newspaper" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="message.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
