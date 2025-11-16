import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { IconSymbol } from '@components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { spacing, fontSize, borderRadius, fontWeight } from '@/constants/spacing';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useSnowfeed } from '@hooks/useSnowfeed';

const resortTabs = [
  { id: 'all', name: 'All Resorts' },
  { id: 'hakuba-happo', name: 'Hakuba Happo-One' },
  { id: 'hakuba-47', name: 'Hakuba 47' },
  { id: 'niseko', name: 'Niseko' },
];

export default function SnowfeedScreen() {
  const [selectedResort, setSelectedResort] = useState('all');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const snowfeedState = useSnowfeed(selectedResort === 'all' ? null : selectedResort);

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
      {/* Resort Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsContainer, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.tabsContent}>
        {resortTabs.map((resort) => (
          <TouchableOpacity
            key={resort.id}
            style={[
              styles.tab,
              selectedResort === resort.id && styles.tabActive,
              {
                backgroundColor:
                  selectedResort === resort.id ? colors.accent : colors.backgroundSecondary,
              },
            ]}
            onPress={() => setSelectedResort(resort.id)}>
            <Text
              style={[
                styles.tabText,
                selectedResort === resort.id && styles.tabTextActive,
                { color: selectedResort === resort.id ? '#fff' : colors.text },
              ]}>
              {resort.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {/* Weather Summary */}
        {weather && (
          <View style={[styles.weatherCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Current Conditions</Text>
            <View style={styles.weatherGrid}>
              <View style={styles.weatherItem}>
                <IconSymbol name="thermometer" size={24} color={colors.icon} />
                <Text style={[styles.weatherValue, { color: colors.text }]}>
                  {weather.tempC || '--'}°C
                </Text>
                <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Temp</Text>
              </View>
              <View style={styles.weatherItem}>
                <IconSymbol name="snow" size={24} color={colors.icon} />
                <Text style={[styles.weatherValue, { color: colors.text }]}>
                  {weather.newSnowCm || '--'}cm
                </Text>
                <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>
                  New Snow
                </Text>
              </View>
              <View style={styles.weatherItem}>
                <IconSymbol name="wind" size={24} color={colors.icon} />
                <Text style={[styles.weatherValue, { color: colors.text }]}>
                  {weather.windMs || '--'}m/s
                </Text>
                <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>Wind</Text>
              </View>
              <View style={styles.weatherItem}>
                <Text style={[styles.weatherValue, { color: colors.text }]}>
                  {weather.visibility || 'N/A'}
                </Text>
                <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>
                  Visibility
                </Text>
              </View>
            </View>
          </View>
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
  tabsContainer: {
    maxHeight: 60,
  },
  tabsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  tabActive: {
    //backgroundColor will be set dynamically
  },
  tabText: {
    fontSize: fontSize.sm,
  },
  tabTextActive: {
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  weatherCard: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  weatherGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weatherItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  weatherValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  weatherLabel: {
    fontSize: fontSize.xs,
  },
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

