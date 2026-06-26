import { BlurView } from 'expo-blur';
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
import { useTranslation } from '@/hooks/useTranslation';
import { getBadgeColor } from '@/utils/avatar-utils';
import { getResortPrefecture } from '@/utils/resort-helpers';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useHomeData } from '@hooks/useHomeData';
<<<<<<< HEAD
import { supabase } from '@/lib/supabase';
=======
import { testSupabaseSetup } from '@lib/testSupabaseSetup';

// SVGコンポーネント
import HomeBgMountain from '../../../assets/images/home-bg-mountain.svg';
import BookmarkIcon from '../../../assets/images/icons/bookmark.svg';
import DocumentIcon from '../../../assets/images/icons/document.svg';


const DISCOVERY_CATEGORIES = [
  { id: 'all', labelKey: 'home.categoryAll', icon: 'square.grid.2x2' },
  { id: 'powder', labelKey: 'home.categoryPowder', icon: 'snowflake' },
  { id: 'carpool', labelKey: 'home.categoryCarpool', icon: 'car.fill' },
  { id: 'beginner', labelKey: 'home.categoryBeginner', icon: 'figure.skiing.downhill' },
  { id: 'park', labelKey: 'home.categoryPark', icon: 'flag.fill' },
  { id: 'onsen', labelKey: 'home.categoryHotspring', icon: 'cup.and.saucer.fill' },
] as const;
>>>>>>> d19a5baf107f0f665a6402b3800f1d91f54121d5

useEffect(() => {
  console.log('🔍 Testing Supabase connection...');
  
  supabase
    .from('resorts')
    .select('id, name')
    .limit(3)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Supabase Error:', error);
      } else {
        console.log('✅ Supabase Connected! Resorts:', data);
      }
    });
}, []);
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const state = useHomeData();
  const colorScheme = useColorScheme();
  const { width: screenWidth } = Dimensions.get('window');
  const { t } = useTranslation();

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
        <Text style={[styles.loadingText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{t('home.loadingConditions')}</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={[styles.centered, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <Text style={[styles.errorText, { color: Colors[colorScheme ?? 'light'].error }]}>{t('home.loadFailed')}</Text>
        <Text style={[styles.errorSubText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{state.error}</Text>
      </View>
    );
  }

  const { weather, recommendedEvents, suggestedEvents, trendingPosts } = state.data;

  // WMO Weather Code to SF Symbol mapping
  const getWeatherIcon = (weatherCode: number): string => {
    if (weatherCode === 0) return 'sun.max.fill'; // Clear sky
    if (weatherCode <= 3) return 'cloud.fill'; // Cloudy
    if (weatherCode >= 51 && weatherCode <= 67) return 'cloud.rain.fill'; // Rain
    if (weatherCode >= 71 && weatherCode <= 77) return 'cloud.snow.fill'; // Snow
    if (weatherCode >= 80) return 'cloud.heavyrain.fill'; // Showers
    return 'cloud.fill'; // Default
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: Math.max(insets.top, 16) }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>Slope Link</Text>
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
      {!weather ? (
        <View style={styles.weatherSectionWrapper}>
          {/* 1. 背景画像レイヤー (カードからはみ出すように配置) */}
          <View style={styles.mountainBackgroundContainer}>
            <HomeBgMountain
              width={screenWidth}
              height={300}
              preserveAspectRatio="xMidYMid meet"
              style={{ opacity: 0.6 }}
            />
          </View>

          {/* 2. No Home Resort Card (半透明のガラス表現) */}
          <View style={[
            styles.weatherCard,
            {
              borderColor: colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.4)',
              shadowColor: colorScheme === 'dark' ? '#000' : '#fff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
              shadowRadius: 12,
              elevation: 8,
            }
          ]}>
            {/* Blur背景 */}
            <BlurView
              intensity={colorScheme === 'dark' ? 40 : 60}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />

            {/* 半透明オーバーレイ */}
            <View style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colorScheme === 'dark'
                  ? 'rgba(20, 30, 50, 0.3)'
                  : 'rgba(255, 255, 255, 0.5)',
              }
            ]} />

            {/* メッセージコンテンツ */}
            <View style={styles.weatherCardContent}>
              <View style={styles.noHomeResortMessageContainer}>
                <IconSymbol
                  name="mountain.2"
                  size={32}
                  color={Colors[colorScheme ?? 'light'].textSecondary}
                  style={{ opacity: 0.7 }}
                />
                <Text style={[styles.noHomeResortMessage, { color: Colors[colorScheme ?? 'light'].text }]}>
                  {t('home.noHomeResort')}
                </Text>
                <Text style={[styles.noHomeResortSubMessage, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
                  {t('home.setHomeResortFromSnowfeed')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
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
          <View style={[
            styles.weatherCard,
            {
              borderColor: colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.4)',
              shadowColor: colorScheme === 'dark' ? '#000' : '#fff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.1,
              shadowRadius: 12,
              elevation: 8,
            }
          ]}>
            {/* Blur背景 */}
            <BlurView
              intensity={colorScheme === 'dark' ? 40 : 60}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />

            {/* 半透明オーバーレイ */}
            <View style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colorScheme === 'dark'
                  ? 'rgba(20, 30, 50, 0.3)'
                  : 'rgba(255, 255, 255, 0.5)',
              }
            ]} />

            {/* コンテンツ */}
            <View style={styles.weatherCardContent}>
              <View style={styles.weatherHeaderRow}>
                <Text
                  style={[styles.weatherResort, { color: Colors[colorScheme ?? 'light'].text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {weather.resortName}
                </Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>

              <View style={styles.weatherTopRow}>
                <Text style={[styles.weatherTemp, { color: Colors[colorScheme ?? 'light'].text }]}>{weather.temperatureC}°C</Text>
                {weather.weatherCode !== undefined && (
                  <View style={styles.weatherIconContainer}>
                    <IconSymbol
                      name={getWeatherIcon(weather.weatherCode)}
                      size={48}
                      color={Colors[colorScheme ?? 'light'].text}
                    />
                  </View>
                )}
                <Text style={[styles.weatherBody, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{t('home.freshSnow')} {weather.newSnowCm}cm</Text>
              </View>


              <View style={styles.weatherBottomRow}>
                <View style={styles.metaColumn}>
                  <Text style={[styles.metaText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{t('home.windSpeed')} {weather.windSpeedMs} m/s</Text>

                </View>
                <View style={styles.metaColumn}>
                  {weather.visibility && (
                    <Text style={[styles.metaText, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>
                      {t('home.visibility')} {weather.visibility.charAt(0).toUpperCase() + weather.visibility.slice(1)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Discovery Chips
      <View style={styles.discoverySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.discoveryList}
        >
          {DISCOVERY_CATEGORIES.map((cat, index) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.discoveryChip,
                {
                  backgroundColor: index === 0 ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].card,
                  borderColor: Colors[colorScheme ?? 'light'].border,
                  borderWidth: index === 0 ? 0 : 1,
                }
              ]}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/search')}
            >
              <IconSymbol
                name={cat.icon as any}
                size={16}
                color={index === 0 ? '#FFF' : Colors[colorScheme ?? 'light'].text}
              />
              <Text style={[
                styles.discoveryText,
                { color: index === 0 ? '#FFF' : Colors[colorScheme ?? 'light'].text }
              ]}>
                {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View> */}

      {/* Quick actions – Saved / My Posts / Create */}
      <View style={styles.quickActionsRow}>
        <QuickAction
          icon={<BookmarkIcon width={24} height={24} color={Colors[colorScheme ?? 'light'].icon} />}
          label={t('home.saved')}
          iconColor={Colors[colorScheme ?? 'light'].icon}
          onPress={() => router.push('/saved-posts' as any)}
        />
        <QuickAction
          icon={<DocumentIcon width={24} height={24} color={Colors[colorScheme ?? 'light'].icon} />}
          label={t('home.myPosts')}
          iconColor={Colors[colorScheme ?? 'light'].icon}
          onPress={() => router.push('/my-posts' as any)}
        />
        <QuickAction
          icon="plus.circle"
          label={t('home.create')}
          iconColor={Colors[colorScheme ?? 'light'].icon}
          onPress={() => router.push('/(tabs)/create')}
        />
      </View>

      {/* Featured Events */}
      <View style={styles.featuredSection}>
        <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>{t('home.featuredPosts')}</Text>
        {recommendedEvents.length > 0 && (
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
        )}
      </View>

      {/* Local hub / trend section (Snowfeed)
      {trendingPosts.length > 0 && (
        <View style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].card }]}>
          <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>{t('home.trendingPosts')}</Text>
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
              <Text style={[styles.cardMeta, { color: Colors[colorScheme ?? 'light'].textSecondary }]}>{post.likeCount} {t('home.likes')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )} */}
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
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden', // カード内の角丸用
    minHeight: 200,
  },
  weatherCardContent: {
    padding: 20,
  },
  weatherResort: {
    fontSize: 24,
    fontWeight: '700',
    // color is set dynamically in the component
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1, // 利用可能なスペースを使用
    flexShrink: 1, // 必要に応じて縮小
  },
  weatherBody: {
    fontSize: 16,
    // color is set dynamically in the component
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  weatherTemp: {
    fontSize: 36,
    fontWeight: '700',
    // color is set dynamically in the component
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  weatherTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 16,
  },
  weatherIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 20,
  },
  metaColumn: {
    flex: 1,
  },
  metaText: {
    fontSize: 14,
    // color is set dynamically in the component
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // No Home Resort Message (overlaid on background image)
  noHomeResortMessageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  noHomeResortMessage: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  noHomeResortSubMessage: {
    fontSize: 13,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
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
    width: 57,
    height: 57,
    borderRadius: 28,
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
    width: 260,
    height: 340,
    marginRight: 16,
    borderRadius: 24,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 12,
  },
  participantBadgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  participantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  participantBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  discoverySection: {
    marginBottom: 24,
  },
  discoveryList: {
    paddingRight: 16,
    gap: 12,
  },
  discoveryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    gap: 6,
  },
  discoveryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weatherHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 12, // スキー場名とLIVEバッジの間に余白を追加
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    flexShrink: 0, // LIVEバッジは常に完全に表示されるように
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  snowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  roleBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
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
  iconColor: string;
  onPress: () => void;
};

function QuickAction({ icon, label, iconColor, onPress }: QuickActionProps) {
  const colorScheme = useColorScheme();
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.quickActionCircle}>
        {typeof icon === 'string' ? (
          <IconSymbol name={icon} size={24} color={iconColor} />
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
    spotsTaken: number;
    resortName: string;
    resortArea?: string;
    resortRegion?: string | null;
  };
  colorScheme: 'light' | 'dark';
  onPress: () => void;
};

function FeaturedEventCard({ event, colorScheme, onPress }: FeaturedEventCardProps) {
  const colors = Colors[colorScheme];
  const { t, locale } = useTranslation();
  const hasBadge = event.hostRole === 'developer' || event.hostRole === 'official';

  // Get dynamic location text
  const prefecture = getResortPrefecture({
    area: event.resortArea || '',
    region: event.resortRegion
  }, locale);

  const locationText = prefecture
    ? `📍 ${event.resortName} (${prefecture})`
    : `📍 ${event.resortName}`;

  return (
    <TouchableOpacity style={styles.featuredCard} activeOpacity={0.8} onPress={onPress}>
      {event.photoUrl ? (
        <ImageBackground
          source={{ uri: event.photoUrl }}
          style={styles.featuredImage}
          resizeMode="cover"
        >
          {/* 参加者数バッジ (左上) */}
          <View style={styles.participantBadgeContainer}>
            <View style={styles.participantBadge}>
              <IconSymbol name="person.fill" size={12} color="#FFF" />
              <Text style={styles.participantBadgeText}>{event.spotsTaken}{t('home.usersParticipating')}</Text>
            </View>
          </View>

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
                <Text style={styles.featuredSubtitle}>
                  {locationText}
                </Text>
              </View>
            </View>
          </View>
          {/* ロールバッジとテキスト */}
          {hasBadge && event.hostRole && (
            <View style={styles.roleBadgeContainer}>
              <View style={styles.roleBadgeBackground}>
                <View style={styles.roleBadgeContent}>
                  <Text style={styles.roleBadgeText}>
                    {event.hostRole === 'official' ? t('home.official') : t('home.developer')}
                  </Text>
                  <OfficialBadge color={getBadgeColor(event.hostRole)} size={24} />
                </View>
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
            <Text style={styles.featuredSubtitle}>
              {locationText}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <IconSymbol name="person.fill" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                {event.spotsTaken}{t('home.usersParticipating')}
              </Text>
            </View>
          </View>
          {hasBadge && event.hostRole && (
            <View style={styles.roleBadgeContainer}>
              <View style={styles.roleBadgeBackground}>
                <View style={styles.roleBadgeContent}>
                  <Text style={styles.roleBadgeText}>
                    {event.hostRole === 'official' ? t('home.official') : t('home.developer')}
                  </Text>
                  <OfficialBadge color={getBadgeColor(event.hostRole)} size={24} />
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
