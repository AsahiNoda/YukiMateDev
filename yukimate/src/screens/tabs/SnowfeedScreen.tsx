import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@components/ui/icon-symbol';
import { WeatherCard } from '@components/snowfeed/WeatherCard';
import { WeatherForecast } from '@components/snowfeed/WeatherForecast';
import { ResortSearch } from '@components/snowfeed/ResortSearch';
import { Colors } from '@/constants/theme';
import { spacing, fontSize, borderRadius, fontWeight } from '@/constants/spacing';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useSnowfeed } from '@hooks/useSnowfeed';
import { router } from 'expo-router';
import { fetch7DayForecast, DailyForecast } from '@/services/weatherApi';

const HOME_RESORT_KEY = '@snowfeed_home_resort';
const CURRENT_RESORT_KEY = '@snowfeed_current_resort';

export default function SnowfeedScreen() {
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const snowfeedState = useSnowfeed(selectedResortId);

  // Load home resort and current resort on mount
  useEffect(() => {
    const loadResortData = async () => {
      try {
        // Check for home resort
        const homeResort = await AsyncStorage.getItem(HOME_RESORT_KEY);

        if (homeResort) {
          // User has set a home resort
          const { id, name } = JSON.parse(homeResort);
          setHomeResortId(id);
          setHomeResortName(name);

          // Check if there's a currently viewed resort
          const currentResort = await AsyncStorage.getItem(CURRENT_RESORT_KEY);
          if (currentResort) {
            const { id: currentId, name: currentName } = JSON.parse(currentResort);
            setSelectedResortId(currentId);
            setSelectedResortName(currentName);
          } else {
            // Default to home resort
            setSelectedResortId(id);
            setSelectedResortName(name);
          }
        } else {
          // First-time user - no home resort set
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
          // Use resort name instead of ID for coordinate matching
          const forecastData = await fetch7DayForecast(selectedResortName);
          setForecast(forecastData);
          console.log(`Loaded forecast for: ${selectedResortName}`, forecastData);
        } catch (error) {
          console.error('Error loading forecast:', error);
        } finally {
          setForecastLoading(false);
        }
      };
      loadForecast();
    }
  }, [selectedResortId, selectedResortName]);

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

  // Show empty state if no resort selected (shouldn't happen with new flow, but keep as fallback)
  if (!selectedResortId && !isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyStateContainer, styles.centered]}>
          <IconSymbol name="mountain.2" size={80} color={colors.icon} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            雪山を選択してください
          </Text>
          <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
            お気に入りの雪山の最新情報をチェックしよう
          </Text>
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.accent }]}
            onPress={() => setShowSearch(true)}>
            <IconSymbol name="magnifyingglass" size={20} color="#FFFFFF" />
            <Text style={styles.searchButtonText}>雪山を検索</Text>
          </TouchableOpacity>
        </View>

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
      </View>
    );
  }

  if (snowfeedState.status === 'loading') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading feed...</Text>
      </View>
    );
  }

  if (snowfeedState.status === 'error') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Failed to load feed</Text>
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
              { width: `${percentage}%`, backgroundColor: colors.accent },
            ]}
          />
        </View>
        <Text style={[styles.ratingValue, { color: colors.text }]}>{value.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Back Button and Search */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {/* Back/Home Button */}
        {homeResortId && selectedResortId !== homeResortId ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleReturnToHome}>
            <IconSymbol name="house.fill" size={24} color={colors.accent} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
        )}

        {/* Search Box */}
        <TouchableOpacity
          style={[styles.searchBox, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => {
            setIsChangingHome(false);
            setShowSearch(true);
          }}
          activeOpacity={0.7}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
          <Text style={[styles.searchBoxText, { color: colors.textSecondary }]}>
            {selectedResortName || '雪山を検索...'}
          </Text>
        </TouchableOpacity>

        {/* Change Home Button - Only show when on home resort */}
        {homeResortId === selectedResortId && (
          <TouchableOpacity
            style={[styles.changeHomeButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              setIsChangingHome(true);
              setShowSearch(true);
            }}>
            <IconSymbol name="house.fill" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Weather Card */}
        {weather && (
          <WeatherCard
            resortName={selectedResortName}
            weather={weather}
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
              <Text style={[styles.overallValue, { color: colors.accent }]}>
                {rating.overall?.toFixed(1) || 'N/A'} / 5.0
              </Text>
            </View>
          </View>
        )}

        {/* Posts Feed */}
        <View style={styles.postsSection}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Community Posts</Text>
          {posts.map((post) => (
            <View key={post.id} style={[styles.postCard, { backgroundColor: colors.card }]}>
              <View style={styles.postHeader}>
                <View style={styles.postAuthor}>
                  <View
                    style={[styles.avatar, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[styles.avatarText, { color: colors.text }]}>
                      {post.userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.authorName, { color: colors.text }]}>
                      {post.userName}
                    </Text>
                    <Text style={[styles.postMeta, { color: colors.textSecondary }]}>
                      {post.resortName || 'Unknown Resort'} • {post.type}
                    </Text>
                  </View>
                </View>
              </View>

              {post.text && (
                <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>
              )}

              {post.tags && post.tags.length > 0 && (
                <View style={styles.tagContainer}>
                  {post.tags.map((tag, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol name="heart" size={20} color={colors.icon} />
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                    {post.likeCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol name="message" size={20} color={colors.icon} />
                  <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                    {post.commentCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <IconSymbol name="square.and.arrow.up" size={20} color={colors.icon} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {posts.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="snow" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No posts yet for this resort
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
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchBoxText: {
    fontSize: fontSize.md,
    flex: 1,
  },
  changeHomeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: borderRadius.lg,
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
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  postText: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
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
});

