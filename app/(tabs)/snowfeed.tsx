import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSnowfeed, getResorts, type SnowfeedPost } from '@/hooks/useSnowfeed';

export default function SnowfeedScreen() {
  const colorScheme = useColorScheme();
  const [selectedResortId, setSelectedResortId] = useState<string | null>(null);
  const [resorts, setResorts] = useState<{ id: string; name: string }[]>([]);
  const snowfeedState = useSnowfeed(selectedResortId);

  // リゾート一覧を取得
  useEffect(() => {
    const loadResorts = async () => {
      const result = await getResorts();
      if (!('error' in result)) {
        setResorts(result);
        // 最初のリゾートを選択
        if (result.length > 0 && !selectedResortId) {
          setSelectedResortId(result[0].id);
        }
      }
    };
    loadResorts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  if (snowfeedState.status === 'loading' && selectedResortId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Snowfeed</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
          <Text style={styles.loadingText}>データを読み込み中...</Text>
        </View>
      </View>
    );
  }

  if (snowfeedState.status === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Snowfeed</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>エラーが発生しました</Text>
          <Text style={styles.errorSubText}>{snowfeedState.error}</Text>
        </View>
      </View>
    );
  }

  const ratingData = snowfeedState.status === 'success' ? snowfeedState.data.rating : null;
  const weatherData = snowfeedState.status === 'success' ? snowfeedState.data.weather : null;
  const posts = snowfeedState.status === 'success' ? snowfeedState.data.posts : [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Snowfeed</Text>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
          <IconSymbol name="slider.horizontal.3" size={20} color="#E5E7EB" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Resort Selector */}
        <View style={styles.resortSelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.resortSelectorContent}>
            {resorts.map((resort) => (
              <TouchableOpacity
                key={resort.id}
                style={[
                  styles.resortChip,
                  selectedResortId === resort.id && styles.resortChipActive,
                ]}
                onPress={() => setSelectedResortId(resort.id)}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.resortChipText,
                    selectedResortId === resort.id && styles.resortChipTextActive,
                  ]}>
                  {resort.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Resort Ratings */}
        {selectedResortId && ratingData && (
          <View style={styles.ratingsCard}>
            <View style={styles.ratingsHeader}>
              <Text style={styles.ratingsTitle}>Resort Ratings</Text>
              <Text style={styles.ratingsSubtitle}>{ratingData.votesCount} votes</Text>
            </View>

            <View style={styles.ratingsGrid}>
              {ratingData.powder !== null && (
                <RatingItem label="Powder" value={ratingData.powder} />
              )}
              {ratingData.carving !== null && (
                <RatingItem label="Carving" value={ratingData.carving} />
              )}
              {ratingData.family !== null && (
                <RatingItem label="Family" value={ratingData.family} />
              )}
              {ratingData.park !== null && <RatingItem label="Park" value={ratingData.park} />}
              {ratingData.night !== null && <RatingItem label="Night" value={ratingData.night} />}
            </View>

            {ratingData.overall !== null && (
              <View style={styles.overallRating}>
                <Text style={styles.overallRatingLabel}>Overall</Text>
                <View style={styles.overallRatingValue}>
                  <Text style={styles.overallRatingNumber}>
                    {ratingData.overall.toFixed(1)}
                  </Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <IconSymbol
                        key={star}
                        name={star <= Math.round(ratingData.overall!) ? 'star.fill' : 'star'}
                        size={16}
                        color="#FCD34D"
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Weather Summary */}
        {selectedResortId && weatherData && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherHeader}>
              <IconSymbol name="cloud.sun.fill" size={20} color="#E5E7EB" />
              <Text style={styles.weatherTitle}>Today's Conditions</Text>
            </View>
            <View style={styles.weatherRow}>
              {weatherData.tempC !== null && (
                <View style={styles.weatherItem}>
                  <Text style={styles.weatherLabel}>Temp</Text>
                  <Text style={styles.weatherValue}>{weatherData.tempC}°C</Text>
                </View>
              )}
              {weatherData.newSnowCm !== null && (
                <View style={styles.weatherItem}>
                  <Text style={styles.weatherLabel}>New Snow</Text>
                  <Text style={styles.weatherValue}>{weatherData.newSnowCm}cm</Text>
                </View>
              )}
              {weatherData.baseDepthCm !== null && (
                <View style={styles.weatherItem}>
                  <Text style={styles.weatherLabel}>Base Depth</Text>
                  <Text style={styles.weatherValue}>{weatherData.baseDepthCm}cm</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Feed Posts */}
        <View style={styles.postsSection}>
          <Text style={styles.postsSectionTitle}>Recent Posts</Text>
          {posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Text style={styles.emptyPostsText}>まだ投稿がありません</Text>
            </View>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} formatDate={formatDate} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type RatingItemProps = {
  label: string;
  value: number;
};

function RatingItem({ label, value }: RatingItemProps) {
  const filledStars = Math.round(value);
  const percentage = (value / 5) * 100;

  return (
    <View style={styles.ratingItem}>
      <View style={styles.ratingItemHeader}>
        <Text style={styles.ratingItemLabel}>{label}</Text>
        <Text style={styles.ratingItemValue}>{value.toFixed(1)}</Text>
      </View>
      <View style={styles.ratingBar}>
        <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
}

type PostCardProps = {
  post: SnowfeedPost;
  formatDate: (dateString: string) => string;
};

function PostCard({ post, formatDate }: PostCardProps) {
  return (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.postUserInfo}>
          <View style={styles.postAvatar}>
            <Text style={styles.postAvatarText}>
              {post.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.postUserDetails}>
            <Text style={styles.postUserName}>{post.userName}</Text>
            {post.resortName && (
              <Text style={styles.postResortName}>{post.resortName}</Text>
            )}
          </View>
        </View>
        <Text style={styles.postTime}>{formatDate(post.createdAt)}</Text>
      </View>

      {/* Post Content */}
      {post.photos && post.photos.length > 0 && (
        <View style={styles.postImageContainer}>
          <Image source={{ uri: post.photos[0] }} style={styles.postImage} />
        </View>
      )}

      {post.text && <Text style={styles.postText}>{post.text}</Text>}

      {/* Post Tags */}
      {post.tags.length > 0 && (
        <View style={styles.postTags}>
          {post.tags.map((tag, index) => (
            <View key={index} style={styles.postTag}>
              <Text style={styles.postTagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.postAction} activeOpacity={0.8}>
          <IconSymbol name="heart" size={18} color="#9CA3AF" />
          <Text style={styles.postActionText}>{post.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction} activeOpacity={0.8}>
          <IconSymbol name="message" size={18} color="#9CA3AF" />
          <Text style={styles.postActionText}>{post.commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction} activeOpacity={0.8}>
          <IconSymbol name="square.and.arrow.up" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  resortSelector: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  resortSelectorContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  resortChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  resortChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  resortChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  resortChipTextActive: {
    color: '#FFFFFF',
  },
  ratingsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#334155',
  },
  ratingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingsSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ratingsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  ratingItem: {
    gap: 4,
  },
  ratingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingItemLabel: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  ratingItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FCD34D',
    borderRadius: 3,
  },
  overallRating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
  },
  overallRatingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  overallRatingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overallRatingNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FCD34D',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  weatherCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#334155',
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weatherItem: {
    alignItems: 'center',
  },
  weatherLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  weatherValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postsSection: {
    paddingHorizontal: 16,
  },
  postsSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  postCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#334155',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  postUserDetails: {
    gap: 2,
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postResortName: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postImageContainer: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#334155',
  },
  postText: {
    fontSize: 15,
    color: '#E5E7EB',
    lineHeight: 22,
    marginBottom: 12,
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  postTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#334155',
  },
  postTagText: {
    fontSize: 12,
    color: '#60A5FA',
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    color: '#E5E7EB',
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F87171',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  emptyPosts: {
    padding: 32,
    alignItems: 'center',
  },
  emptyPostsText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});

