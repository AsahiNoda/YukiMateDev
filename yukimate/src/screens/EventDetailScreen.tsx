import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { applyToEvent } from '@/hooks/useDiscoverEvents';

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

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ eventId: string }>();
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

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
          profiles!posts_events_host_user_id_fkey(
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
      console.log('EventDetailScreen - eventData.photos:', eventData.photos);
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
      console.log('EventDetailScreen - Generated photoUrls:', photoUrls);

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
      loadEventDetail(); // 再読み込みして申請状態を更新
    } else {
      Alert.alert('エラー', result.error || '申請に失敗しました');
    }
  };

  const openMaps = () => {
    if (!event) return;
    const query = encodeURIComponent(
      `${event.resortName} ${event.meetingPlace || ''}`
    );
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'イベントが見つかりません'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasMultipleImages = event.photos.length > 1;

  console.log('EventDetailScreen - Render:', {
    photosCount: event.photos.length,
    hasMultipleImages,
    currentImageIndex,
    photos: event.photos,
  });

  const nextImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev + 1) % event.photos.length);
    }
  };

  const prevImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev - 1 + event.photos.length) % event.photos.length);
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        {/* 画像ギャラリー */}
        {event.photos.length > 0 && (
          <View style={styles.imageContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setFullscreenVisible(true)}
              style={styles.imageWrapper}
            >
              <Image
                source={{ uri: event.photos[currentImageIndex] }}
                style={styles.eventImage}
                resizeMode="cover"
              />
            </TouchableOpacity>

            {/* 画像切り替えタップエリア（複数画像の場合のみ） */}
            {hasMultipleImages && (
              <>
                <TouchableOpacity
                  style={styles.imageTapLeft}
                  onPress={prevImage}
                  activeOpacity={1}
                />
                <TouchableOpacity
                  style={styles.imageTapRight}
                  onPress={nextImage}
                  activeOpacity={1}
                />
              </>
            )}

            {/* 画像インジケーター（常に表示） */}
            <View style={styles.imageIndicators}>
              {event.photos.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.indicator,
                    idx === currentImageIndex && styles.indicatorActive,
                  ]}
                />
              ))}
            </View>

            {/* 閉じるボタン */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <IconSymbol name="xmark" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

      <View style={styles.content}>
        {/* タイトル & レベル */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{event.title}</Text>
          {event.levelRequired && (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>
                {event.levelRequired === 'beginner' ? '初級' :
                 event.levelRequired === 'intermediate' ? '中級' : '上級'}
              </Text>
            </View>
          )}
        </View>

        {/* カテゴリバッジ */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{event.category}</Text>
        </View>

        {/* イベント詳細カード */}
        <View style={styles.detailCard}>
          {/* 日時 */}
          <View style={[styles.detailRow, styles.detailRowWithBorder]}>
            <View style={styles.detailIconContainer}>
              <IconSymbol name="calendar" size={20} color="#3B82F6" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>日時</Text>
              <Text style={styles.detailValue}>{formatDate(event.startAt)}</Text>
            </View>
          </View>

          {/* スキー場 */}
          <View style={[styles.detailRow, styles.detailRowWithBorder]}>
            <View style={styles.detailIconContainer}>
              <IconSymbol name="mountain.2.fill" size={20} color="#10B981" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>スキー場</Text>
              <Text style={styles.detailValue}>{event.resortName}</Text>
            </View>
          </View>

          {/* 集合場所 */}
          {event.meetingPlace && (
            <TouchableOpacity
              style={[styles.detailRow, styles.detailRowWithBorder]}
              onPress={openMaps}
            >
              <View style={styles.detailIconContainer}>
                <IconSymbol name="mappin.circle.fill" size={20} color="#F59E0B" />
              </View>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>集合場所</Text>
                <Text style={[styles.detailValue, styles.linkText]}>
                  {event.meetingPlace} →
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* 参加人数 */}
          <View style={[styles.detailRow, styles.detailRowWithBorder]}>
            <View style={styles.detailIconContainer}>
              <IconSymbol name="person.3.fill" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>参加人数</Text>
              <Text style={styles.detailValue}>
                {event.spotsTaken}/{event.capacityTotal}人
              </Text>
            </View>
          </View>

          {/* 価格 - 最後の行なのでボーダーなし */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <IconSymbol name="yensign.circle.fill" size={20} color="#EC4899" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>参加費</Text>
              <Text style={styles.detailValue}>
                {event.pricePerPersonJpy !== null
                  ? `¥${event.pricePerPersonJpy.toLocaleString()}`
                  : '無料'}
              </Text>
            </View>
          </View>
        </View>

        {/* 説明 */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>詳細</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        )}

        {/* タグ */}
        {event.tags.length > 0 && (
          <View style={styles.section}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsContainer}
            >
              {event.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ホスト情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ホスト</Text>
          <View style={styles.hostCard}>
            {event.hostAvatar ? (
              <Image
                source={{ uri: event.hostAvatar }}
                style={styles.hostAvatar}
              />
            ) : (
              <View style={[styles.hostAvatar, styles.hostAvatarPlaceholder]}>
                <Text style={styles.hostAvatarText}>
                  {event.hostName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.hostInfo}>
              <Text style={styles.hostName}>{event.hostName}</Text>
              {event.hostLevel && (
                <Text style={styles.hostLevel}>
                  {event.hostLevel === 'beginner' ? '初級' :
                   event.hostLevel === 'intermediate' ? '中級' : '上級'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* アクションボタン */}
        <View style={styles.actionSection}>
          {event.isHost ? (
            <>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => {
                  // TODO: 申請管理画面へ遷移
                  Alert.alert('開発中', '申請管理機能は開発中です');
                }}
              >
                <Text style={styles.manageButtonText}>申請を管理</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => router.push({
                  pathname: '/event-chat/[eventId]' as any,
                  params: { eventId: event.id }
                })}
              >
                <IconSymbol name="message" size={20} color="#3B82F6" />
                <Text style={styles.chatButtonText}>チャット</Text>
              </TouchableOpacity>
            </>
          ) : event.hasApplied && event.applicationStatus === 'approved' ? (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => router.push({
                pathname: '/event-chat/[eventId]' as any,
                params: { eventId: event.id }
              })}
            >
              <IconSymbol name="message" size={20} color="#3B82F6" />
              <Text style={styles.chatButtonText}>チャットを開く</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.applyButton,
                (event.hasApplied || applying) && styles.applyButtonDisabled,
              ]}
              onPress={handleApply}
              disabled={event.hasApplied || applying}
            >
              {applying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.applyButtonText}>
                  {event.hasApplied
                    ? `申請中 (${event.applicationStatus})`
                    : '参加申請'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>

    {/* 全画面画像モーダル */}
    <Modal
      visible={fullscreenVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setFullscreenVisible(false)}
    >
      <View style={styles.fullscreenContainer}>
        <TouchableOpacity
          style={styles.fullscreenCloseButton}
          onPress={() => setFullscreenVisible(false)}
        >
          <IconSymbol name="xmark" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Image
          source={{ uri: event.photos[currentImageIndex] }}
          style={styles.fullscreenImage}
          resizeMode="contain"
        />
        {/* 全画面でも画像切り替え可能 */}
        {hasMultipleImages && (
          <>
            <TouchableOpacity
              style={styles.fullscreenTapLeft}
              onPress={prevImage}
              activeOpacity={1}
            />
            <TouchableOpacity
              style={styles.fullscreenTapRight}
              onPress={nextImage}
              activeOpacity={1}
            />
          </>
        )}
        {/* インジケーター */}
        <View style={styles.fullscreenIndicators}>
          {event.photos.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.indicator,
                idx === currentImageIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1628',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    color: '#E5E7EB',
    fontSize: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
    backgroundColor: '#000',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imageTapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 50,
    zIndex: 2,
  },
  imageTapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 50,
    zIndex: 2,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 3,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  content: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  // 詳細カード
  detailCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailRowWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 12,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  linkText: {
    color: '#60A5FA',
  },
  tagsContainer: {
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    marginRight: 8,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#E5E7EB',
    lineHeight: 24,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  hostAvatarPlaceholder: {
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  hostInfo: {
    marginLeft: 16,
  },
  hostName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hostLevel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actionSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  applyButton: {
    paddingVertical: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#475569',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  manageButton: {
    paddingVertical: 16,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  chatButton: {
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  chatButtonText: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: '600',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  fullscreenTapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 50,
    zIndex: 5,
  },
  fullscreenTapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 50,
    zIndex: 5,
  },
  fullscreenIndicators: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 6,
  },
});
