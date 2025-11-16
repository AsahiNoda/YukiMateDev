🗄️ Phase 3: Supabase接続・データ取得（Week 5-6: 2週間）
Week 5: Supabase初期設定
Day 1: Supabaseクライアントの設定
Supabaseパッケージのインストール:
bashnpm install @supabase/supabase-js
npx expo install react-native-url-polyfill
環境変数の設定:
bashnpm install react-native-dotenv
npm install --save-dev @types/react-native-dotenv
.env ファイルを作成（プロジェクトルート）:
envSUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ `.gitignore` に追加:**
```
.env
.env.*
babel.config.js を更新:
javascriptmodule.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
        },
      ],
    ],
  };
};
型定義ファイル src/types/env.d.ts を作成:
typescriptdeclare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
}
src/lib/supabase.ts を作成:
typescriptimport 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// AsyncStorageのインストール
// npm install @react-native-async-storage/async-storage

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database型定義（後で追加）
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          country_code: string;
          age_range: string | null;
          skill_level: string;
          riding_style: string[] | null;
          gear_info: any | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          country_code: string;
          age_range?: string | null;
          skill_level: string;
          riding_style?: string[] | null;
          gear_info?: any | null;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          country_code?: string;
          age_range?: string | null;
          skill_level?: string;
          riding_style?: string[] | null;
          gear_info?: any | null;
          updated_at?: string;
        };
      };
      resorts: {
        Row: {
          id: number;
          name: string;
          name_en: string | null;
          location: string;
          latitude: number | null;
          longitude: number | null;
          description: string | null;
          ratings: any | null;
          created_at: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string;
          resort_id: number | null;
          host_id: string;
          date: string;
          max_participants: number | null;
          skill_level: string | null;
          status: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          title: string;
          description?: string | null;
          category: string;
          resort_id?: number | null;
          host_id: string;
          date: string;
          max_participants?: number | null;
          skill_level?: string | null;
          status?: string;
          image_url?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          category?: string;
          resort_id?: number | null;
          date?: string;
          max_participants?: number | null;
          skill_level?: string | null;
          status?: string;
          image_url?: string | null;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          resort_id: number;
          image_url: string;
          comment: string | null;
          snow_quality: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          resort_id: number;
          image_url: string;
          comment?: string | null;
          snow_quality: string;
        };
      };
    };
  };
};
AsyncStorageのインストール:
bashnpx expo install @react-native-async-storage/async-storage
チェックリスト:

 Supabaseパッケージインストール済み
 .envファイル作成済み
 Supabaseクライアント設定完了
 型定義作成完了


Day 2-3: データ取得用カスタムフックの作成
src/hooks/useEvents.ts を作成:
typescriptimport { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          host:profiles!events_host_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            country_code,
            skill_level
          ),
          resort:resorts(
            id,
            name,
            name_en,
            location
          )
        `)
        .eq('status', 'open')
        .order('date', { ascending: true });

      if (error) throw error;

      // データを型に合わせて変換
      const formattedEvents: Event[] = (data || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category,
        resortId: event.resort_id,
        resortName: event.resort?.name,
        resort: event.resort,
        hostId: event.host_id,
        host: event.host ? {
          id: event.host.id,
          username: event.host.username,
          displayName: event.host.display_name || event.host.username,
          avatar: event.host.avatar_url,
          countryCode: event.host.country_code,
          skillLevel: event.host.skill_level,
          ridingStyle: [],
          createdAt: '',
        } : undefined,
        date: event.date,
        maxParticipants: event.max_participants,
        currentParticipants: 0, // TODO: 参加者数を計算
        skillLevel: event.skill_level,
        status: event.status,
        imageUrl: event.image_url,
        createdAt: event.created_at,
      }));

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function refetch() {
    await fetchEvents();
  }

  return { events, loading, error, refetch };
}
src/hooks/useResorts.ts を作成:
typescriptimport { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Resort } from '@/types';

export function useResorts() {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResorts();
  }, []);

  async function fetchResorts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resorts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const formattedResorts: Resort[] = (data || []).map((resort: any) => ({
        id: resort.id,
        name: resort.name,
        nameEn: resort.name_en,
        location: resort.location,
        latitude: resort.latitude,
        longitude: resort.longitude,
        description: resort.description,
        ratings: resort.ratings || {
          powder: 0,
          carving: 0,
          family: 0,
          park: 0,
          nightSki: 0,
          overall: 0,
          totalReviews: 0,
        },
        imageUrl: resort.image_url,
        createdAt: resort.created_at,
      }));

      setResorts(formattedResorts);
    } catch (err) {
      console.error('Error fetching resorts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return { resorts, loading, error, refetch: fetchResorts };
}
src/hooks/usePosts.ts を作成:
typescriptimport { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';

export function usePosts(resortId?: number) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [resortId]);

  async function fetchPosts() {
    try {
      setLoading(true);
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:profiles!posts_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            country_code
          ),
          resort:resorts(
            id,
            name,
            name_en
          )
        `)
        .order('created_at', { ascending: false });

      if (resortId) {
        query = query.eq('resort_id', resortId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedPosts: Post[] = (data || []).map((post: any) => ({
        id: post.id,
        userId: post.user_id,
        user: post.user ? {
          id: post.user.id,
          username: post.user.username,
          displayName: post.user.display_name || post.user.username,
          avatar: post.user.avatar_url,
          countryCode: post.user.country_code,
          skillLevel: 'Beginner',
          ridingStyle: [],
          createdAt: '',
        } : undefined,
        resortId: post.resort_id,
        resort: post.resort,
        imageUrl: post.image_url,
        comment: post.comment,
        snowQuality: post.snow_quality,
        createdAt: post.created_at,
      }));

      setPosts(formattedPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return { posts, loading, error, refetch: fetchPosts };
}
チェックリスト:

 useEvents フック作成完了
 useResorts フック作成完了
 usePosts フック作成完了


Day 4-5: 画面をSupabaseデータに切り替え
src/screens/HomeScreen.tsx を更新:
typescriptimport React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '@/theme/styles';
import { colors, spacing, fontSize, borderRadius, fontWeight } from '@/theme/colors';
import { useEvents } from '@/hooks/useEvents';
import { useResorts } from '@/hooks/useResorts';
import Card from '@/components/Card';
import SkillBadge from '@/components/SkillBadge';
import UserAvatar from '@/components/UserAvatar';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function HomeScreen() {
  const { events, loading: eventsLoading, refetch: refetchEvents } = useEvents();
  const { resorts, loading: resortsLoading } = useResorts();
  const [refreshing, setRefreshing] = useState(false);

  const todayWeather = resorts[0]?.weather;
  const upcomingEvents = events.slice(0, 5);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchEvents();
    setRefreshing(false);
  };

  if (eventsLoading || resortsLoading) {
    return <LoadingSpinner />;
  }

  const getWeatherIcon = (condition: string) => {
    if (condition?.includes('Snow')) return '🌨️';
    if (condition?.includes('Cloudy')) return '☁️';
    if (condition?.includes('Powder')) return '❄️';
    return '⛅';
  };

  return (
    <ScrollView
      style={globalStyles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent.primary}
        />
      }
    >
      <View style={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>YukiMate</Text>
          <Text style={styles.headerSubtitle}>
            {resorts[0]?.name || '白馬八方尾根'}
          </Text>
        </View>

        {/* 今日のコンディション */}
        {todayWeather && (
          <Card style={styles.weatherCard}>
            <View style={styles.weatherHeader}>
              <Text style={styles.sectionTitle}>今日のコンディション</Text>
              <Text style={styles.weatherIcon}>
                {getWeatherIcon(todayWeather.condition)}
              </Text>
            </View>
            
            <View style={styles.weatherGrid}>
              <View style={styles.weatherItem}>
                <Ionicons name="thermometer-outline" size={24} color={colors.accent.primary} />
                <Text style={styles.weatherLabel}>気温</Text>
                <Text style={styles.weatherValue}>{todayWeather.temp}°C</Text>
              </View>

              <View style={styles.weatherItem}>
                <Ionicons name="snow-outline" size={24} color={colors.accent.primary} />
                <Text style={styles.weatherLabel}>積雪</Text>
                <Text style={styles.weatherValue}>{todayWeather.snowDepth}cm</Text>
              </View>

              <View style={styles.weatherItem}>
                <Ionicons name="sparkles-outline" size={24} color={colors.accent.primary} />
                <Text style={styles.weatherLabel}>新雪</Text>
                <Text style={styles.weatherValue}>{todayWeather.newSnow}cm</Text>
              </View>

              <View style={styles.weatherItem}>
                <Ionicons name="cloudy-outline" size={24} color={colors.accent.primary} />
                <Text style={styles.weatherLabel}>風速</Text>
                <Text style={styles.weatherValue}>{todayWeather.windSpeed}m/s</Text>
              </View>
            </View>

            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{todayWeather.condition}</Text>
            </View>
          </Card>
        )}

        {/* おすすめイベント */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>おすすめイベント</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>すべて見る →</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <TouchableOpacity key={event.id}>
                <Card style={styles.eventCard}>
                  {event.imageUrl && (
                    <Image
                      source={{ uri: event.imageUrl }}
                      style={styles.eventImage}
                    />
                  )}
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>
                      {event.skillLevel && (
                        <SkillBadge level={event.skillLevel} />
                      )}
                    </View>

                    <View style={styles.eventMeta}>
                      <View style={styles.eventMetaItem}>
                        <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
                        <Text style={styles.eventMetaText}>{event.resortName}</Text>
                      </View>
                      
                      <View style={styles.eventMetaItem}>
                        <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
                        <Text style={styles.eventMetaText}>{event.date}</Text>
                      </View>
                    </View>

                    <View style={styles.eventFooter}>
                      <View style={styles.hostInfo}>
                        <UserAvatar
                          avatar={event.host?.avatar}
                          size={24}
                          countryCode={event.host?.countryCode}
                        />
                        <Text style={styles.hostName}>{event.host?.displayName}</Text>
                      </View>

                      <View style={styles.participants}>
                        <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
                        <Text style={styles.participantsText}>
                          {event.currentParticipants}/{event.maxParticipants || '∞'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <Card>
              <Text style={styles.emptyText}>イベントがまだありません</Text>
            </Card>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// styles は前と同じ
const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  weatherCard: {
    marginBottom: spacing.lg,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weatherIcon: {
    fontSize: 40,
  },
  weatherGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weatherItem: {
    alignItems: 'center',
    flex: 1,
  },
  weatherLabel: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  weatherValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  conditionBadge: {
    backgroundColor: colors.background.tertiary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  conditionText: {
    color: colors.text.primary,
    fontWeight: fontWeight.semibold,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    color: colors.accent.primary,
  },
  eventCard: {
    padding: 0,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 150,
  },
  eventContent: {
    padding: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  eventTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  eventMeta: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventMetaText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hostName: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  participantsText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: fontSize.md,
  },
});
同様に、DiscoverScreen.tsx, SnowfeedScreen.tsx も更新します。
チェックリスト:

 Home画面をSupabaseデータに切り替え
 Discover画面をSupabaseデータに切り替え
 Snowfeed画面をSupabaseデータに切り替え
 ローディング・エラーハンドリング実装
 実機でデータ取得確認