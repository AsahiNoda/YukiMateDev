import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfficialBadge } from '@/components/OfficialBadge';
import { Colors } from '@/constants/theme';
import { getBadgeColor } from '@/utils/avatar-utils';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useHomeData } from '@hooks/useHomeData';
import { testSupabaseSetup } from '@lib/testSupabaseSetup';

// SVGコンポーネント
import HomeBgMountain from '../../../assets/images/home-bg-mountain.svg';
import DocumentIcon from '../../../assets/images/icons/document.svg';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const state = useHomeData();
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;
  const { width: screenWidth } = Dimensions.get('window');

  // Supabase connection test: runs once when HomeScreen mounts
  useEffect(() => {
    const testConnection = async () => {
      console.log('🔍 Testing Supabase connection...');
      const result = await testSupabaseSetup();
      if (result.success) {
        console.log('✅ Supabase connection successful');
      } else {
        console.error('❌ Supabase connection failed:', result.error);
      }
      console.log(result);
    };

    testConnection();
  }, []);

  if (state.status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <ActivityIndicator />
        <Text style={[styles.loadingText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>Loading today&apos;s conditions...</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={[styles.centered, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <Text style={[styles.errorText, { color: Colors[colorScheme ?? 'light'].error }]}>Failed to load home data.</Text>
        <Text style={[styles.errorSubText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{state.error}</Text>
      </View>
    );
  }

  const { weather, recommendedEvents, suggestedEvents, trendingPosts } = state.data;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: Math.max(insets.top, 16) }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>YukiMate</Text>
        </View>
        <TouchableOpacity
          style={[styles.profileButton, {
            backgroundColor: Colors[colorScheme ?? 'light'].backgroundSecondary,
            borderColor: Colors[colorScheme ?? 'light'].border
          }]}
          activeOpacity={0.8}
          onPress={() => {
            router.push('/settings');
          }}
        >
          <IconSymbol name="gearshape" size={20} color={Colors[colorScheme ?? 'light'].icon} />
        </TouchableOpacity>
      </View>

      {/* Weather Section (Container for Image + Card) */}
      {weather && (
        <View style={styles.weatherSectionWrapper}>

          {/* 1. 背景画像レイヤー (カードからはみ出すように配置) */}
          <View style={styles.mountainBackgroundContainer}>
            <HomeBgMountain
              width={screenWidth} // 画面幅いっぱいに
              height={300}        // 高さを指定
              preserveAspectRatio="xMidYMid meet"
              style={{ opacity: 0.6 }} // 画像自体の透明度調整があればここで
            />
          </View>

          {/* 2. Weather Card レイヤー (半透明のガラス表現) */}
          <View style={styles.weatherCard}>

            {/* カード内の半透明背景色 */}
            <View style={[StyleSheet.absoluteFill, styles.weatherCardGlass]} />

            {/* コンテンツ */}
            <View style={styles.weatherCardContent}>
              <Text style={[styles.weatherResort, { color: Colors[colorScheme ?? 'light'].text }]}>{weather.resortName}</Text>

              <View style={styles.weatherTopRow}>
                <Text style={[styles.weatherTemp, { color: Colors[colorScheme ?? 'light'].text }]}>{weather.temperatureC}°C</Text>
                <View style={styles.weatherSnowRow}>
                  <Text style={styles.weatherSnowIcon}>❄️</Text>
                  <Text style={[styles.weatherBody, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{weather.snowDepthCm}cm</Text>
                </View>
                <Text style={[styles.weatherBody, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>New Snow: {weather.newSnowCm}cm</Text>
              </View>

              <View style={styles.weatherChipRow}>
                <WeatherChip label="Today" active />
                <WeatherChip label="7-Day Forecast" />
                <WeatherChip label="Historical Data" />
                <WeatherChip label="Depth Chart" />
              </View>

              <View style={styles.weatherBottomRow}>
                <View style={styles.metaColumn}>
                  <Text style={[styles.metaText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>Wind: {weather.windSpeedMs} m/s</Text>
                  <Text style={[styles.metaText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>Humidity: 85%</Text>
                </View>
                <View style={styles.metaColumn}>
                  <Text style={[styles.metaText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>Visibility: Good</Text>
                  <Text style={[styles.metaText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>Snow Quality: Powder</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Quick actions – Discover / Chat / Local Info / Post */}
      <View style={styles.quickActionsRow}>
        <QuickAction
          icon="safari"
          label="Discover"
          tint={tint}
          onPress={() => router.push('/(tabs)/discover')}
        />
        <QuickAction
          icon="message.fill"
          label="Chat"
          tint={tint}
          onPress={() => router.push('/(tabs)/chat')}
        />
        <QuickAction
          icon={<DocumentIcon width={24} height={24} color={tint} />}
          label="My Posts"
          tint={tint}
          onPress={() => router.push('/my-posts' as any)}
        />
        <QuickAction
          icon="plus.circle"
          label="Post"
          tint={tint}
          onPress={() => router.push('/(tabs)/create')}
        />
      </View>

      {/* Featured Events */}
      {recommendedEvents.length > 0 && (
        <View style={styles.featuredSection}>
          <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>注目の投稿</Text>
          <FlatList
            horizontal
            data={recommendedEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FeaturedEventCard
                event={item}
                colorScheme={colorScheme ?? 'light'}
                onPress={() => router.push(`/event-detail?eventId=${item.id}` as any)}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredListContent}
          />
        </View>
      )}

      {/* Local hub / trend section (Snowfeed) */}
      {trendingPosts.length > 0 && (
        <View style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>Local Hub Spotlight</Text>
          {trendingPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/snowfeed')}
            >
              <Text style={[styles.cardTitle, { color: Colors[colorScheme ?? 'light'].text }]}>
                {post.resortName} · {post.snowTag}
              </Text>
              <Text style={[styles.cardBody, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{post.comment}</Text>
              <Text style={[styles.cardMeta, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{post.likeCount} likes</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is set dynamically in the component
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
    zIndex: 10, // ヘッダーを画像より手前に
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    // color is set dynamically in the component
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor and borderColor are set dynamically in the component
    borderWidth: StyleSheet.hairlineWidth,
  },
  // 新しいラッパー: 画像とカードの配置基準
  weatherSectionWrapper: {
    marginBottom: 24,
    position: 'relative',
    // overflow: 'visible' がデフォルトなので、画像がこの領域からはみ出ても表示される
  },
  // 画像コンテナ: カードの背後に絶対配置し、左右にはみ出させる
  mountainBackgroundContainer: {
    paddingTop: 20,
    position: 'absolute',
    top: -40, // カードの上にはみ出す
    left: -16, // 親(padding:16)を打ち消して画面端まで
    right: -16, // 親(padding:16)を打ち消して画面端まで
    bottom: -40, // カードの下にはみ出す
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0, // カードより後ろ
  },
  weatherCard: {
    // position: 'relative'でzIndexコンテキストを作る
    zIndex: 1, // 画像より前
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.3)', // 薄い境界線
    overflow: 'hidden', // カード内の角丸用
    minHeight: 200,
  },
  weatherCardGlass: {
    backgroundColor: 'rgba(20, 30, 50, 0.4)', // カードの背景色（半透明）
  },
  weatherCardContent: {
    padding: 20,
  },
  weatherResort: {
    fontSize: 18,
    fontWeight: '700',
    // color is set dynamically in the component
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  weatherBody: {
    fontSize: 14,
    // color is set dynamically in the component
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: '600',
    // color is set dynamically in the component
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  weatherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  weatherSnowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherSnowIcon: {
    fontSize: 14,
  },
  weatherChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    rowGap: 8,
    columnGap: 8,
  },
  weatherBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaColumn: {
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    // color is set dynamically in the component
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    // backgroundColor is set dynamically in the component
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color is set dynamically in the component
    marginBottom: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    zIndex: 1, // 画像の上に表示されるように
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    // color is set dynamically in the component
  },
  card: {
    marginTop: 8,
    paddingVertical: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    // color is set dynamically in the component
  },
  cardBody: {
    fontSize: 14,
    // color is set dynamically in the component
  },
  cardMeta: {
    fontSize: 12,
    // color is set dynamically in the component
    marginTop: 2,
  },
  featuredSection: {
    marginBottom: 24,
  },
  featuredListContent: {
    paddingRight: 16,
  },
  featuredCard: {
    width: 160,
    height: 250,
    marginRight: 22,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  featuredImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(45, 55, 72, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredGradient: {
    padding: 12,
    paddingTop: 40,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  roleBadgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  roleBadgeBackground: {
    backgroundColor: 'rgba(26, 32, 44, 0.8)', // Dark background for contrast
    borderRadius: 12,
    padding: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor is set dynamically in the component
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    // color is set dynamically in the component
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    // color is set dynamically in the component
    marginBottom: 4,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    // color is set dynamically in the component
    textAlign: 'center',
  },
});

type QuickActionProps = {
  icon: Parameters<typeof IconSymbol>[0]['name'] | React.ReactElement;
  label: string;
  tint: string;
  onPress: () => void;
};

function QuickAction({ icon, label, tint, onPress }: QuickActionProps) {
  const colorScheme = useColorScheme();
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.quickActionCircle}>
        {typeof icon === 'string' ? (
          <IconSymbol name={icon} size={24} color={tint} />
        ) : (
          icon
        )}
      </View>
      <Text style={[styles.quickActionLabel, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

type WeatherChipProps = {
  label: string;
  active?: boolean;
};

function WeatherChip({ label, active }: WeatherChipProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: active ? `${colors.accent}40` : `${colors.backgroundSecondary}`,
      }}
    >
      <Text style={{ fontSize: 10, color: colors.text }}>{label}</Text>
    </View>
  );
}

type FeaturedEventCardProps = {
  event: {
    id: string;
    title: string;
    photoUrl: string | null;
    hostRole?: string;
  };
  colorScheme: 'light' | 'dark';
  onPress: () => void;
};

function FeaturedEventCard({ event, colorScheme, onPress }: FeaturedEventCardProps) {
  const colors = Colors[colorScheme];
  const hasBadge = event.hostRole === 'developer' || event.hostRole === 'official';

  return (
    <TouchableOpacity style={styles.featuredCard} activeOpacity={0.8} onPress={onPress}>
      {event.photoUrl ? (
        <ImageBackground
          source={{ uri: event.photoUrl }}
          style={styles.featuredImage}
          resizeMode="cover"
        >
          {/* グラデーションオーバーレイ（黒の半透明） */}
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: 'transparent',
            justifyContent: 'flex-end',
          }]}>
            <View>
              <View style={styles.featuredGradient}>
                <Text style={styles.featuredTitle} numberOfLines={2}>
                  {event.title}
                </Text>
              </View>
            </View>
          </View>
          {/* ロールバッジ */}
          {hasBadge && event.hostRole && (
            <View style={styles.roleBadgeContainer}>
              <View style={styles.roleBadgeBackground}>
                <OfficialBadge color={getBadgeColor(event.hostRole)} size={24} />
              </View>
            </View>
          )}
        </ImageBackground>
      ) : (
        <View style={styles.featuredPlaceholder}>
          <IconSymbol name="photo" size={40} color={colors.icon} />
          <View style={styles.featuredGradient}>
            <Text style={styles.featuredTitle} numberOfLines={2}>
              {event.title}
            </Text>
          </View>
          {hasBadge && event.hostRole && (
            <View style={styles.roleBadgeContainer}>
              <View style={styles.roleBadgeBackground}>
                <OfficialBadge color={getBadgeColor(event.hostRole)} size={24} />
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}