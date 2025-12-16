import { ImageViewer } from '@/components/ImageViewer';
import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getFlagSource } from '@/constants/countries';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBookmark } from '@/hooks/useBookmark';
import { applyToEvent } from '@/hooks/useDiscoverEvents';
import { useTranslation } from '@/hooks/useTranslation';
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

interface Participant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  styles: string[];
  role: string;
}

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
  hostRole: string;
  isHost: boolean;
  hasApplied: boolean;
  applicationStatus: string | null;
  isHostStarred?: boolean;
  starredParticipantIds?: string[];
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
    participantsSection: {
      marginTop: 24,
    },
    participantsSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    participantCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    participantAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.tint,
    },
    participantAvatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    participantAvatarText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    participantInfo: {
      flex: 1,
      marginLeft: 12,
    },
    participantNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    participantName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginRight: 6,
    },
    participantStar: {
      marginRight: 4,
    },
    participantFlag: {
      fontSize: 16,
    },
    participantFlagImage: {
      width: 24,
      height: 16,
      marginLeft: 4,
    },
    participantStylesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    participantStyleTagText: {
      fontSize: 12,
      color: colors.textSecondary,
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
      marginHorizontal: 12,
      flex: 1,
    },
    footerHostLabel: {
      fontSize: 11,
      color: colors.icon,
      marginBottom: 2,
    },
    footerHostNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    footerHostName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    footerHostStar: {
      marginLeft: 2,
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
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
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
        throw new Error(t('create.loginRequired'));
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
            level,
            users!profiles_user_id_fkey(role)
          )
        `)
        .eq('id', params.eventId)
        .single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error(t('eventDetail.eventNotFound'));

      // 参加者数を取得
      const { count } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', params.eventId)
        .is('left_at', null);

      // ★登録したユーザーIDリストを取得
      const { data: starredUsers } = await supabase
        .from('stars')
        .select('target_user_id')
        .eq('user_id', session.user.id);

      const starredUserIds = starredUsers?.map(s => s.target_user_id) || [];

      // 参加者の詳細情報を取得
      const { data: participantsData } = await supabase
        .from('event_participants')
        .select(`
          user_id,
          users!event_participants_user_id_fkey(
            id,
            role,
            profiles(
              user_id,
              display_name,
              avatar_url,
              country_code,
              styles
            )
          )
        `)
        .eq('event_id', params.eventId)
        .is('left_at', null);

      // 参加者データを整形
      const formattedParticipants: Participant[] = [];
      if (participantsData) {
        participantsData.forEach((p: any) => {
          const profile = p.users?.profiles;
          if (profile) {
            formattedParticipants.push({
              userId: profile.user_id,
              displayName: profile.display_name || t('common.unknown'),
              avatarUrl: profile.avatar_url,
              countryCode: profile.country_code,
              styles: profile.styles || [],
              role: p.users?.role || 'user',
            });
          }
        });
      }

      setParticipants(formattedParticipants);

      // 申請状況を確認
      const { data: application } = await supabase
        .from('event_applications')
        .select('id, status')
        .eq('event_id', params.eventId)
        .eq('applicant_user_id', session.user.id)
        .single();

      // 参加中かどうかを確認（left_atがnull）
      const { data: participation } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', params.eventId)
        .eq('user_id', session.user.id)
        .is('left_at', null)
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

      // ★登録された参加者のIDリストを作成
      const starredParticipantIds = formattedParticipants
        .filter(p => starredUserIds.includes(p.userId))
        .map(p => p.userId);

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
        resortName: eventData.resorts?.name || t('common.unknown'),
        hostName: eventData.profiles?.display_name || t('common.unknown'),
        hostAvatar: eventData.profiles?.avatar_url || null,
        hostUserId: eventData.host_user_id,
        hostLevel: eventData.profiles?.level || null,
        hostRole: eventData.profiles?.users?.role || 'user',
        isHost: eventData.host_user_id === session.user.id,
        hasApplied: !!participation, // 参加中（left_atがnull）の場合にtrue
        applicationStatus: application?.status || null,
        isHostStarred: starredUserIds.includes(eventData.host_user_id),
        starredParticipantIds,
      };

      setEvent(detail);
    } catch (err) {
      console.error('Error loading event detail:', err);
      setError(err instanceof Error ? err.message : t('eventDetail.errorOccurred'));
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
      Alert.alert(t('eventDetail.applicationComplete'), t('eventDetail.applicationSent'));
      loadEventDetail();
    } else {
      Alert.alert(t('common.error'), result.error || t('eventDetail.applicationFailed'));
    }
  };

  const handleWithdraw = async () => {
    if (!event) return;

    Alert.alert(
      t('eventDetail.withdrawFromEvent'),
      t('eventDetail.withdrawConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('eventDetail.withdraw'),
          style: 'destructive',
          onPress: async () => {
            try {
              setApplying(true);
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.user) {
                throw new Error(t('create.loginRequired'));
              }

              // イベント参加者テーブルから削除（left_atを設定）
              const { error: participantError } = await supabase
                .from('event_participants')
                .update({ left_at: new Date().toISOString() })
                .eq('event_id', event.id)
                .eq('user_id', session.user.id)
                .is('left_at', null);

              if (participantError) throw participantError;

              // イベント申請テーブルからも削除
              const { error: applicationError } = await supabase
                .from('event_applications')
                .delete()
                .eq('event_id', event.id)
                .eq('applicant_user_id', session.user.id);

              if (applicationError) throw applicationError;

              // 状態を即座に更新
              setEvent(prev => prev ? {
                ...prev,
                hasApplied: false,
                applicationStatus: null,
                spotsTaken: Math.max(0, prev.spotsTaken - 1)
              } : null);

              Alert.alert(t('eventDetail.withdrawComplete'), t('eventDetail.withdrawSuccess'));
              // 詳細を再読み込みして最新の状態を取得
              loadEventDetail();
            } catch (err) {
              console.error('Error withdrawing from event:', err);
              Alert.alert(t('common.error'), t('eventDetail.withdrawFailed'));
            } finally {
              setApplying(false);
            }
          },
        },
      ]
    );
  };

  const toggleBookmark = async () => {
    const success = await handleToggleBookmark();
    if (!success) {
      Alert.alert(t('common.error'), t('eventDetail.bookmarkFailed'));
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
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getLevelLabel = (level: string): string => {
    switch (level) {
      case 'beginner':
        return t('profileSetup.beginner');
      case 'intermediate':
        return t('profileSetup.intermediate');
      case 'advanced':
        return t('profileSetup.advanced');
      default:
        return level;
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error || t('eventDetail.eventNotFound')}</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>{t('common.back')}</Text>
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
        {!event.isHost && (
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
              <Text style={[styles.descriptionTitle, { color: colors.text }]}>{t('eventDetail.details')}</Text>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{event.description}</Text>
            </View>
          )}

          {/* 詳細グリッド（3列グリッド） */}
          <View style={styles.detailsGrid}>
            {/* 日時 */}
            <View style={styles.gridItemWide}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="calendar" size={20} color={colors.icon} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]}>{formatDate(event.startAt)}</Text>
              </View>
            </View>

            {/* スキー場 */}
            <View style={styles.gridItemWide}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="mountain.2.fill" size={20} color={colors.icon} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]}>{event.resortName}</Text>
              </View>
            </View>

            {/* 参加人数 */}
            <View style={styles.gridItem}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="person.2.fill" size={20} color={colors.icon} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]}>{event.spotsTaken}/{event.capacityTotal}{t('discover.peopleUnit')}</Text>
              </View>
            </View>

            {/* 集合場所 */}
            <View style={styles.gridItemWide}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="mappin.circle.fill" size={20} color={colors.icon} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]} numberOfLines={1}>
                  {event.meetingPlace || t('common.notSpecified')}
                </Text>
              </View>
            </View>

            {/* 価格 */}
            <View style={styles.gridItem}>
              <View style={styles.gridIconContainer}>
                <IconSymbol name="yensign.circle.fill" size={20} color={colors.icon} />
              </View>
              <View style={styles.gridTextContainer}>
                <Text style={[styles.gridValue, { color: colors.text }]}>
                  {event.pricePerPersonJpy !== null && event.pricePerPersonJpy > 0
                    ? `¥${event.pricePerPersonJpy.toLocaleString()}`
                    : t('common.free')}
                </Text>
              </View>
            </View>

            {/* レベル */}
            {event.levelRequired && (
              <View style={styles.gridItemWide}>
                <View style={styles.gridIconContainer}>
                  <IconSymbol name="cube.fill" size={20} color={colors.icon} />
                </View>
                <View style={styles.gridTextContainer}>
                  <Text style={[styles.gridValue, { color: colors.text }]}>
                    {getLevelLabel(event.levelRequired)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* タグセクション */}
          {event.tags && event.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={[styles.tagsSectionTitle, { color: colors.text }]}>{t('eventDetail.tags')}</Text>
              <View style={styles.tagsContainer}>
                {event.tags.map((tag, index) => (
                  <Text style={[styles.tagText, { color: colors.tint }]} key={index}>#{tag}</Text>
                ))}
              </View>
            </View>
          )}

          {/* 参加者セクション */}
          {participants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={[styles.participantsSectionTitle, { color: colors.text }]}>
                {t('eventDetail.participants')} ({participants.length}{t('discover.peopleUnit')})
              </Text>
              {participants.map((participant) => (
                <TouchableOpacity
                  key={participant.userId}
                  style={[styles.participantCard, { borderBottomColor: colors.border }]}
                  onPress={() => router.push(`/user/${participant.userId}` as any)}
                >
                  {/* アバター */}
                  <RoleBasedAvatar
                    avatarUrl={participant.avatarUrl}
                    role={participant.role}
                    size={48}
                    showBadge={true}
                  />

                  {/* 参加者情報 */}
                  <View style={styles.participantInfo}>
                    {/* 名前と国旗と★マーク */}
                    <View style={styles.participantNameRow}>
                      <Text style={[styles.participantName, { color: colors.text }]}>
                        {participant.displayName}
                      </Text>
                      {participant.countryCode && (
                        <Image
                          source={getFlagSource(participant.countryCode)}
                          style={styles.participantFlagImage}
                          resizeMode="contain"
                        />
                      )}
                      {event.starredParticipantIds?.includes(participant.userId) && (
                        <IconSymbol name="star.fill" size={14} color={colors.accent} style={styles.participantStar} />
                      )}
                    </View>

                    {/* スタイルタグ */}
                    {participant.styles.length > 0 && (
                      <View style={styles.participantStylesRow}>
                        {participant.styles.map((style, idx) => (
                          <Text key={idx} style={[styles.participantStyleTagText, { color: colors.textSecondary }]}>
                            #{style}{idx < participant.styles.length - 1 ? ' ' : ''}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* フッター用のスペース */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 固定フッター */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {/* ホスト情報 */}
        <TouchableOpacity
          style={styles.footerHostSection}
          onPress={() => router.push(`/user/${event.hostUserId}` as any)}
        >
          <RoleBasedAvatar
            avatarUrl={event.hostAvatar}
            role={event.hostRole}
            size={40}
            showBadge={true}
          />
          <View style={styles.footerHostInfo}>
            <Text style={[styles.footerHostLabel, { color: colors.icon }]}>{t('eventDetail.host')}</Text>
            <View style={styles.footerHostNameContainer}>
              <Text style={[styles.footerHostName, { color: colors.text }]}>{event.hostName}</Text>
              {event.isHostStarred && (
                <IconSymbol name="star.fill" size={14} color={colors.accent} style={styles.footerHostStar} />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* アクションボタン */}
        {event.isHost ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              router.push(`/create?eventId=${event.id}`);
            }}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>{t('eventDetail.editPost')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              event.hasApplied
                ? { backgroundColor: colors.error }
                : event.applicationStatus === 'pending'
                  ? { backgroundColor: colors.backgroundTertiary }
                  : { backgroundColor: colors.tint },
              (applying || event.applicationStatus === 'pending') && [styles.actionButtonDisabled, { backgroundColor: colors.backgroundTertiary }],
            ]}
            onPress={event.hasApplied ? handleWithdraw : handleApply}
            disabled={applying || event.applicationStatus === 'pending'}
          >
            {applying ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                {event.hasApplied ? t('eventDetail.withdraw') : event.applicationStatus === 'pending' ? t('eventDetail.applying') : t('eventDetail.applyToJoin')}
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
