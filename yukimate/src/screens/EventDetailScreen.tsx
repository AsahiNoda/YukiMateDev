import { ImageViewer } from '@/components/ImageViewer';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBookmark } from '@/hooks/useBookmark';
import { applyToEvent } from '@/hooks/useDiscoverEvents';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  capacityTotal: number;
  spotsTaken: number;
  levelRequired: string | null;
  pricePerPersonJpy: number | null;
  meetingPlace: string | null;
  tags: string[];
  photos: string[];
  category: string;
  resortName: string;
  hostName: string;
  hostAvatar: string | null;
  hostUserId: string;
  hostLevel: string | null;
  isHost: boolean;
  hasApplied: boolean;
  applicationStatus: string | null;
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 8,
      backgroundColor: colors.background,
      zIndex: 10,
    },
    headerButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: 16,
    },
    loadingText: {
      marginTop: 16,
      color: colors.textSecondary,
      fontSize: 16,
    },
    errorText: {
      color: colors.error,
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 24,
    },
    backButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
    },
    backButtonText: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    headerImageContainer: {
      width: '100%',
      height: 400,
      position: 'relative',
    },
    imageScrollView: {
      width: '100%',
      height: '100%',
    },
    headerImage: {
      width: '100%',
      height: '100%',
    },
    imageIndicatorContainer: {
      position: 'absolute',
      bottom: 16,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    imageIndicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    backButtonIcon: {
      position: 'absolute',
      left: 16,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    bookmarkButton: {
      position: 'absolute',
      right: 16,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    contentCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      marginTop: -24,
      padding: 24,
      position: 'relative',
      zIndex: 1,
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    descriptionSection: {
      marginBottom: 24,
    },
    descriptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 24,
      marginHorizontal: -6,
    },
    gridItem: {
      width: '50%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
    },
    gridItemWide: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
    },
    hostAvatarPlaceholder: {
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    gridTextContainer: {
      flex: 1,
    },
    gridValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    tagsSection: {
      marginTop: 8,
    },
    tagsSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.tint,
    },
    tagText: {
      fontSize: 13,
      color: colors.tint,
      fontWeight: '500',
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: 20,
      paddingTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerHostSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    footerHostAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
    footerHostAvatarText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    footerHostInfo: {
      flex: 1,
    },
    footerHostLabel: {
      fontSize: 11,
      color: colors.icon,
      marginBottom: 2,
    },
    footerHostName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    actionButton: {
      paddingVertical: 14,
      paddingHorizontal: 32,
      backgroundColor: colors.tint,
      borderRadius: 24,
      minWidth: 140,
      alignItems: 'center',
    },
    actionButtonDisabled: {
      backgroundColor: colors.backgroundTertiary,
    },
    actionButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  // ブックマークフックを使用
  const { isBookmarked, loading: bookmarkLoading, toggleBookmark: handleToggleBookmark } = useBookmark(params.eventId || '');

  useEffect(() => {
    loadEventDetail();
  }, [params.eventId]);

  const loadEventDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('ログインが必要です');
      }

      // イベント詳細を取得
      const { data: eventData, error: eventError } = await supabase
        .from('posts_events')
        .select(`
          id,
          title,
          description,
          start_at,
          end_at,
          capacity_total,
          level_required,
          price_per_person_jpy,
          meeting_place,
          tags,
          photos,
          type,
          host_user_id,
          resorts(id, name),
          profiles(
            user_id,
            display_name,
            avatar_url,
            level
          )
        `)
        .eq('id', params.eventId)
        .single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error('イベントが見つかりません');

      // 参加者数を取得
      const { count } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', params.eventId)
        .is('left_at', null);

      // 申請状況を確認
      const { data: application } = await supabase
        .from('event_applications')
        .select('id, status')
        .eq('event_id', params.eventId)
        .eq('applicant_user_id', session.user.id)
        .single();

      // 画像URLを生成
      const photoUrls: string[] = [];
      if (eventData.photos && eventData.photos.length > 0) {
        eventData.photos.forEach((photoPath: string) => {
          if (photoPath.startsWith('http')) {
            photoUrls.push(photoPath);
          } else {
            const { data } = supabase.storage
              .from('event_images')
              .getPublicUrl(photoPath);
            photoUrls.push(data.publicUrl);
          }
        });
      }

      const detail: EventDetail = {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        startAt: eventData.start_at,
        endAt: eventData.end_at,
        capacityTotal: eventData.capacity_total || 0,
        spotsTaken: count || 0,
        levelRequired: eventData.level_required,
        pricePerPersonJpy: eventData.price_per_person_jpy,
        meetingPlace: eventData.meeting_place,
        tags: eventData.tags || [],
        photos: photoUrls,
        category: eventData.type,
        resortName: eventData.resorts?.name || 'Unknown Resort',
        hostName: eventData.profiles?.display_name || 'Unknown',
        hostAvatar: eventData.profiles?.avatar_url || null,
        hostUserId: eventData.host_user_id,
        hostLevel: eventData.profiles?.level || null,
        isHost: eventData.host_user_id === session.user.id,
        hasApplied: !!application,
        applicationStatus: application?.status || null,
      };

      setEvent(detail);
    } catch (err) {
      console.error('Error loading event detail:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!event) return;

    setApplying(true);
    const result = await applyToEvent(event.id);
    setApplying(false);

    if (result.success) {
      Alert.alert('申請完了', 'イベントへの参加申請を送信しました');
      loadEventDetail();
    } else {
      Alert.alert('エラー', result.error || '申請に失敗しました');
    }
  };

  const toggleBookmark = async () => {
    const success = await handleToggleBookmark();
    if (!success) {
      Alert.alert('エラー', 'ブックマークの更新に失敗しました');
    }
  };

  const openImageViewer = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImageUrl('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${weekday} ${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>読み込み中...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error || 'イベントが見つかりません'}</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { width: screenWidth } = Dimensions.get('window');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ヘッダーバー */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* ブックマークボタン（自分の投稿以外のみ表示） */}
        {!event.isHost ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleBookmark}
            activeOpacity={0.7}
            disabled={bookmarkLoading}
          >
            <IconSymbol
              name={isBookmarked ? "bookmark.fill" : "bookmark"}
              size={24}
              color={isBookmarked ? colors.warning : colors.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ヘッダー画像 */}
        {event.photos.length > 0 && (
          <View style={styles.headerImageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageScrollView}
            >
              {event.photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => openImageViewer(photo)}
                  activeOpacity={0.9}
                  style={{ width: screenWidth }}
                >
                  <Image
                    source={{ uri: photo }}
                    style={styles.headerImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 画像インジケーター */}
            {event.photos.length > 1 && (
              <View style={styles.imageIndicatorContainer}>
                {event.photos.map((_, index) => (
                  <View key={index} style={styles.imageIndicatorDot} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* コンテンツカード */}
        <View style={[styles.contentCard, { backgroundColor: colors.background }]}>
          {/* タイトル */}
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>

          {/* 詳細説明 */}
          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.descriptionTitle, { color: colors.text }]}>詳細:</Text>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{event.description}</Text>
            </View>
          )}

          {/* 詳細グリッド（3列グリッド） */}
          <View style={styles.detailsGrid}>
            {/* 日時 */}
            <View style={styles.gridItemWide}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="calendar" size={20} color={colors.tint} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]}>{formatDate(event.startAt)}</Text>
              </View>
            </View>

            {/* スキー場 */}
            <View style={styles.gridItemWide}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="mountain.2.fill" size={20} color={colors.success} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]}>{event.resortName}</Text>
              </View>
            </View>

            {/* 参加人数 */}
            <View style={styles.gridItem}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="person.2.fill" size={20} color={colors.tint} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]}>{event.spotsTaken}/{event.capacityTotal}人</Text>
              </View>
            </View>

            {/* 集合場所 */}
            <View style={styles.gridItemWide}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="mappin.circle.fill" size={20} color={colors.warning} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={1}>
                  {event.meetingPlace || '未設定'}
                </Text>
              </View>
            </View>

            {/* 価格 */}
            <View style={styles.gridItem}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="yensign.circle.fill" size={20} color={colors.accent} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]}>
                  {event.pricePerPersonJpy !== null && event.pricePerPersonJpy > 0
                    ? `¥${event.pricePerPersonJpy.toLocaleString()}`
                    : '無料'}
                </Text>
              </View>
            </View>
          </View>

          {/* タグセクション */}
          {event.tags && event.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={[styles.tagsSectionTitle, { color: colors.text }]}>タグ</Text>
              <View style={styles.tagsContainer}>
                {event.tags.map((tag, index) => (
                  <Text style={[styles.tagText, { color: colors.tint }]} key={index}>#{tag}</Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* フッター用のスペース */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 固定フッター */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {/* ホスト情報 */}
        <View style={styles.footerHostSection}>
          {event.hostAvatar ? (
            <Image
              source={{ uri: event.hostAvatar }}
              style={styles.footerHostAvatar}
            />
          ) : (
            <View style={[styles.footerHostAvatar, styles.hostAvatarPlaceholder]}>
              <Text style={styles.footerHostAvatarText}>
                {event.hostName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.footerHostInfo}>
            <Text style={[styles.footerHostLabel, { color: colors.icon }]}>ホスト</Text>
            <Text style={[styles.footerHostName, { color: colors.text }]}>{event.hostName}</Text>
          </View>
        </View>

        {/* アクションボタン */}
        {event.isHost ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              router.push(`/create?eventId=${event.id}`);
            }}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>投稿を編集</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.tint },
              (event.hasApplied || applying) && [styles.actionButtonDisabled, { backgroundColor: colors.backgroundTertiary }],
            ]}
            onPress={handleApply}
            disabled={event.hasApplied || applying}
          >
            {applying ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                {event.hasApplied ? '申請済み' : '参加申請'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* 画像ビューアー */}
      <ImageViewer
        visible={imageViewerVisible}
        imageUrl={selectedImageUrl}
        onClose={closeImageViewer}
      />
    </View>
  );
}
