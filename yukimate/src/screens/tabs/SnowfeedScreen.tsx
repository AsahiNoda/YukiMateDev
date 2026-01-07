import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { DailyForecast, fetch7DayForecast } from '@/services/weatherApi';
import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import { PostCreateModal } from '@components/snowfeed/PostCreateModal';
import { ResortSearch } from '@components/snowfeed/ResortSearch';
import { WeatherCard } from '@components/snowfeed/WeatherCard';
import { WeatherForecast } from '@components/snowfeed/WeatherForecast';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useSnowfeed } from '@hooks/useSnowfeed';
import { useTranslation } from '@hooks/useTranslation';
import { supabase } from '@lib/supabase';
import { getResortName } from '@/utils/resort-helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RefreshDoubleIcon from '../../../assets/images/icons/refresh-double.svg';
import PostIcon from '../../../assets/images/icons/post.svg';

const HOME_RESORT_KEY = '@snowfeed_home_resort';
const CURRENT_RESORT_KEY = '@snowfeed_current_resort';

// 投稿日時をフォーマット
const formatPostDate = (dateString: string, t: (key: string) => string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('snowfeed.justNow');
  if (diffMins < 60) return t('snowfeed.minutesAgo').replace('${minutes}', diffMins.toString());
  if (diffHours < 24) return t('snowfeed.hoursAgo').replace('${hours}', diffHours.toString());
  if (diffDays < 7) return t('snowfeed.daysAgo').replace('${days}', diffDays.toString());

  // 1週間以上前は日付を表示
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

export default function SnowfeedScreen() {
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const [homeResortId, setHomeResortId] = useState<string | null>(null);
  const [homeResortName, setHomeResortName] = useState<string>('');
  const [selectedResortId, setSelectedResortId] = useState<string | null>(null);
  const [selectedResortName, setSelectedResortName] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isChangingHome, setIsChangingHome] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [showPostCreate, setShowPostCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const snowfeedState = useSnowfeed(selectedResortId, refreshKey);

  // Load home resort and current resort on mount
  useEffect(() => {
    const loadResortData = async () => {
      try {
        // First, try to get home resort from database profile (primary source)
        const { data: { user } } = await supabase.auth.getUser();
        let dbHomeResortId: string | null = null;
        let dbHomeResortName: string | null = null;

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('home_resort_id')
            .eq('user_id', user.id)
            .single();

          if (profile?.home_resort_id) {
            const { data: resort } = await supabase
              .from('resorts')
              .select('id, name, name_en')
              .eq('id', profile.home_resort_id)
              .single();

            if (resort) {
              dbHomeResortId = resort.id;
              dbHomeResortName = getResortName(resort, locale);
            }
          }
        }

        // If we found a home resort in database, use it and sync to AsyncStorage
        if (dbHomeResortId && dbHomeResortName) {
          setHomeResortId(dbHomeResortId);
          setHomeResortName(dbHomeResortName);

          // Sync to AsyncStorage for consistency
          await AsyncStorage.setItem(
            HOME_RESORT_KEY,
            JSON.stringify({ id: dbHomeResortId, name: dbHomeResortName })
          );

          // Check if there's a currently viewed resort
          const currentResort = await AsyncStorage.getItem(CURRENT_RESORT_KEY);
          if (currentResort) {
            const { id: currentId, name: currentName } = JSON.parse(currentResort);
            setSelectedResortId(currentId);
            setSelectedResortName(currentName);
          } else {
            // Default to home resort
            setSelectedResortId(dbHomeResortId);
            setSelectedResortName(dbHomeResortName);
          }
        } else {
          // No home resort in database - clear AsyncStorage and show first-time setup
          await AsyncStorage.removeItem(HOME_RESORT_KEY);
          await AsyncStorage.removeItem(CURRENT_RESORT_KEY);

          setIsFirstTime(true);
          setShowSearch(true);
        }
      } catch (error) {
        console.error('Error loading resort data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadResortData();
  }, []);

  // Load 7-day forecast when resort changes
  useEffect(() => {
    if (selectedResortId && selectedResortName) {
      const loadForecast = async () => {
        setForecastLoading(true);
        try {
          // Fetch resort coordinates from database for accurate forecast
          const { data: resortData, error: resortError } = await supabase
            .from('resorts')
            .select('latitude, longitude, area')
            .eq('id', selectedResortId)
            .single();

          if (resortError) {
            console.warn('Error fetching resort data for forecast:', resortError);
          }

          const resortCoords = resortData?.latitude && resortData?.longitude
            ? { latitude: resortData.latitude, longitude: resortData.longitude }
            : undefined;
          const resortPrefecture = resortData?.area;

          // Fetch 7-day forecast with resort-specific coordinates
          const forecastData = await fetch7DayForecast(
            selectedResortName,
            resortCoords,
            resortPrefecture
          );
          setForecast(forecastData);
          console.log(`Loaded forecast for: ${selectedResortName}`, {
            coords: resortCoords || 'using fallback',
            prefecture: resortPrefecture,
            data: forecastData
          });
        } catch (error) {
          console.error('Error loading forecast:', error);
        } finally {
          setForecastLoading(false);
        }
      };
      loadForecast();
    }
  }, [selectedResortId, selectedResortName, refreshKey]);

  // Handle resort selection from search
  const handleSelectResort = async (resortId: string, resortName: string, setAsHome: boolean = false) => {
    setSelectedResortId(resortId);
    setSelectedResortName(resortName);
    setShowSearch(false); // Close modal after selection

    try {
      // Save as current resort
      await AsyncStorage.setItem(
        CURRENT_RESORT_KEY,
        JSON.stringify({ id: resortId, name: resortName })
      );

      // If first-time user or explicitly setting as home
      if (isFirstTime || setAsHome) {
        await AsyncStorage.setItem(
          HOME_RESORT_KEY,
          JSON.stringify({ id: resortId, name: resortName })
        );
        setHomeResortId(resortId);
        setHomeResortName(resortName);
        setIsFirstTime(false);

        // Update database profile with new home resort
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ home_resort_id: resortId })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('Error updating home resort in database:', updateError);
          } else {
            console.log('✅ Home resort updated in database:', resortName);
          }
        }
      }
    } catch (error) {
      console.error('Error saving resort preference:', error);
    }
  };

  // Return to home resort
  const handleReturnToHome = async () => {
    if (homeResortId && homeResortName) {
      setSelectedResortId(homeResortId);
      setSelectedResortName(homeResortName);
      try {
        await AsyncStorage.setItem(
          CURRENT_RESORT_KEY,
          JSON.stringify({ id: homeResortId, name: homeResortName })
        );
      } catch (error) {
        console.error('Error saving current resort:', error);
      }
    }
  };

  // Show empty state if no resort selected - require home resort to be set
  if (!selectedResortId && !isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyStateContainer, styles.centered]}>
          <IconSymbol name="mountain.2" size={80} color={colors.icon} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            {isFirstTime ? t('snowfeed.setHomeResort') : t('snowfeed.selectResort')}
          </Text>
          <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
            {isFirstTime ? t('snowfeed.setHomeResortSubtitle') : t('snowfeed.selectResortSubtitle')}
          </Text>
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              setIsChangingHome(isFirstTime);
              setShowSearch(true);
            }}>
            <IconSymbol name="magnifyingglass" size={20} color="#FFFFFF" />
            <Text style={styles.searchButtonText}>
              {isFirstTime ? t('snowfeed.setHomeResortButton') : t('snowfeed.searchResort')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Modal - Cannot be closed without selecting when first time */}
        <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet">
          <ResortSearch
            onSelectResort={handleSelectResort}
            onClose={() => {
              // Only allow closing if not first time (has home resort already)
              if (!isFirstTime) {
                setShowSearch(false);
                setIsChangingHome(false);
              }
            }}
            isFirstTime={isFirstTime}
            hasHomeResort={!!homeResortId}
            isChangingHome={isChangingHome}
          />
        </Modal>
      </View>
    );
  }

  if (snowfeedState.status === 'loading') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {t('snowfeed.loading')}
        </Text>
      </View>
    );
  }

  if (snowfeedState.status === 'error') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t('snowfeed.loadError')}
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          {snowfeedState.error}
        </Text>
      </View>
    );
  }

  const { rating, weather, posts } = snowfeedState.data;

  // Debug: データの状態を確認
  console.log('Selected Resort ID:', selectedResortId);
  console.log('Selected Resort Name:', selectedResortName);
  console.log('Weather data:', weather);
  console.log('Rating data:', rating);
  console.log('Posts count:', posts.length);

  const renderRatingBar = (label: string, value: number | null, max: number = 5) => {
    if (!value) return null;
    const percentage = (value / max) * 100;
    return (
      <View style={styles.ratingRow} key={label}>
        <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.ratingBarContainer}>
          <View
            style={[
              styles.ratingBar,
              { width: `${percentage}%`, backgroundColor: colors.tint },
            ]}
          />
        </View>
        <Text style={[styles.ratingValue, { color: colors.text }]}>{value.toFixed(1)}</Text>
      </View>
    );
  };

  const isViewingHome = homeResortId && selectedResortId === homeResortId;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Home Button and Search */}
      <View style={[styles.header, {
        backgroundColor: isViewingHome ? colors.tint + '15' : colors.background,
        paddingTop: Math.max(insets.top, 16) + spacing.md
      }]}>
        {/* Home Button - Always visible */}
        <TouchableOpacity
          style={[styles.homeButton]}
          onPress={handleReturnToHome}
          disabled={!homeResortId}>
          <IconSymbol
            name="house.fill"
            size={24}
            color={isViewingHome ? colors.tint : colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Search Box */}
        <TouchableOpacity
          style={[styles.searchBox, {
            backgroundColor: isViewingHome ? colors.background : colors.backgroundSecondary,
            borderWidth: isViewingHome ? 1 : 0,
            borderColor: isViewingHome ? colors.tint + '40' : 'transparent'
          }]}
          onPress={() => {
            setIsChangingHome(false);
            setShowSearch(true);
          }}
          activeOpacity={0.7}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
          <Text style={[styles.searchBoxText, { color: isViewingHome ? colors.text : colors.textSecondary }]}>
            {selectedResortName || t('snowfeed.searchPlaceholder')}
          </Text>
        </TouchableOpacity>

        {/* Change Home Button - Only show when on home resort */}
        {isViewingHome && (
          <TouchableOpacity
            style={[styles.changeHomeButton, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.tint + '40' }]}
            onPress={() => {
              setIsChangingHome(true);
              setShowSearch(true);
            }}>
            <RefreshDoubleIcon width={20} height={20} color={colors.textSecondary} />

          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingTop: spacing.md,
          paddingBottom: 120
        }}
      >
        {/* Weather Card */}
        {weather && (
          <WeatherCard
            resortName={selectedResortName}
            weather={weather}
            isHomeResort={!!isViewingHome}
          />
        )}

        {/* 7-Day Weather Forecast */}
        {!forecastLoading && forecast.length > 0 && (
          <WeatherForecast forecast={forecast} />
        )}

        {/* Resort Rating */}
        {rating && (
          <View style={[styles.ratingCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Resort Ratings</Text>
            <Text style={[styles.voteCount, { color: colors.textSecondary }]}>
              Based on {rating.votesCount} votes
            </Text>
            {renderRatingBar('Powder', rating.powder)}
            {renderRatingBar('Carving', rating.carving)}
            {renderRatingBar('Family', rating.family)}
            {renderRatingBar('Park', rating.park)}
            {renderRatingBar('Night', rating.night)}
            <View style={styles.overallRating}>
              <Text style={[styles.overallLabel, { color: colors.text }]}>Overall</Text>
              <Text style={[styles.overallValue, { color: colors.tint }]}>
                {rating.overall?.toFixed(1) || 'N/A'} / 5.0
              </Text>
            </View>
          </View>
        )}

        {/* Posts Feed */}
        <View style={styles.postsSection}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t('snowfeed.communityPosts')}
          </Text>
          {posts.map((post) => (
            <View key={post.id} style={[styles.postCard, { backgroundColor: colors.card }]}>
              {/* Post Header with Avatar */}
              <View style={styles.postHeader}>
                <RoleBasedAvatar
                  avatarUrl={post.userAvatar}
                  role={post.userRole}
                  size={40}
                  showBadge={true}
                />
                <View style={styles.postAuthorInfo}>
                  <Text style={[styles.authorName, { color: colors.text }]}>
                    {post.userName}
                  </Text>
                  <Text style={[styles.postMeta, { color: colors.textSecondary }]}>
                    {formatPostDate(post.createdAt, t)}
                  </Text>
                </View>
              </View>

              {/* Post Images */}
              {post.photos && post.photos.length > 0 && (
                <View style={styles.postImagesContainer}>
                  {post.photos.map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}

              {/* Post Text */}
              {post.text && (
                <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>
              )}

              {/* Post Tags */}
              {post.tags && post.tags.length > 0 && (
                <View style={styles.tagContainer}>
                  {post.tags.map((tag, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {posts.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="snow" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('snowfeed.noPosts')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={showSearch} animationType="slide" presentationStyle="pageSheet">
        <ResortSearch
          onSelectResort={handleSelectResort}
          onClose={() => {
            setShowSearch(false);
            setIsChangingHome(false);
          }}
          isFirstTime={isFirstTime}
          hasHomeResort={!!homeResortId}
          isChangingHome={isChangingHome}
        />
      </Modal>

      {/* Post Create Modal */}
      {selectedResortId && selectedResortName && (
        <PostCreateModal
          visible={showPostCreate}
          resortId={selectedResortId}
          resortName={selectedResortName}
          onClose={() => setShowPostCreate(false)}
          onPostCreated={() => {
            // Refresh feed data after post creation
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {/* Floating Action Button */}
      {selectedResortId && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: colors.tint,
              bottom: insets.bottom + 80,
            },
          ]}
          onPress={() => setShowPostCreate(true)}
          activeOpacity={0.8}>
          <PostIcon width={28} height={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    padding: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: fontSize.md,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  homeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  searchBoxText: {
    fontSize: fontSize.md,
    flex: 1,
    fontWeight: fontWeight.medium,
  },
  changeHomeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeHomeIcon: {
    width: 20,
    height: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  changeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  loadingText: {
    fontSize: fontSize.md,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: fontSize.sm,
  },
  // Old tab styles (commented out - using header with search now)
  // tabsContainer: {
  //   maxHeight: 60,
  // },
  // tabsContent: {
  //   paddingHorizontal: spacing.md,
  //   paddingVertical: spacing.sm,
  //   gap: spacing.sm,
  // },
  // tab: {
  //   paddingHorizontal: spacing.md,
  //   paddingVertical: spacing.sm,
  //   borderRadius: borderRadius.lg,
  // },
  // tabActive: {
  //   //backgroundColor will be set dynamically
  // },
  // tabText: {
  //   fontSize: fontSize.sm,
  // },
  // tabTextActive: {
  //   fontWeight: fontWeight.semibold,
  // },
  content: {
    flex: 1,
  },
  // Old weather card styles (commented out - using WeatherCard component now)
  // weatherCard: {
  //   margin: spacing.md,
  //   padding: spacing.md,
  //   borderRadius: borderRadius.lg,
  // },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  // weatherGrid: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-around',
  // },
  // weatherItem: {
  //   alignItems: 'center',
  //   gap: spacing.xs,
  // },
  // weatherValue: {
  //   fontSize: fontSize.lg,
  //   fontWeight: fontWeight.bold,
  // },
  // weatherLabel: {
  //   fontSize: fontSize.xs,
  // },
  ratingCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  voteCount: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  ratingLabel: {
    fontSize: fontSize.sm,
    width: 60,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
  },
  ratingValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    width: 30,
    textAlign: 'right',
  },
  overallRating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  overallLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  overallValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  postsSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  postCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  postAuthorInfo: {
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  authorName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  postMeta: {
    fontSize: fontSize.xs,
  },
  postImagesContainer: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  postText: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
  },
  postActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

