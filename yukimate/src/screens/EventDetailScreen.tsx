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
        photos: eventData.photos || [],
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

  return (
    <ScrollView style={styles.container}>
      {/* 画像ギャラリー */}
      {event.photos.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageGallery}
        >
          {event.photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
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

        {/* 日時 */}
        <View style={styles.infoRow}>
          <IconSymbol name="calendar" size={20} color="#9CA3AF" />
          <Text style={styles.infoText}>{formatDate(event.startAt)}</Text>
        </View>

        {/* スキー場 */}
        <View style={styles.infoRow}>
          <IconSymbol name="map" size={20} color="#9CA3AF" />
          <Text style={styles.infoText}>{event.resortName}</Text>
        </View>

        {/* 集合場所 */}
        {event.meetingPlace && (
          <TouchableOpacity style={styles.infoRow} onPress={openMaps}>
            <IconSymbol name="location" size={20} color="#3B82F6" />
            <Text style={[styles.infoText, styles.linkText]}>
              {event.meetingPlace}
            </Text>
          </TouchableOpacity>
        )}

        {/* 参加人数 */}
        <View style={styles.infoRow}>
          <IconSymbol name="person.3" size={20} color="#9CA3AF" />
          <Text style={styles.infoText}>
            {event.spotsTaken}/{event.capacityTotal}人
          </Text>
        </View>

        {/* 価格 */}
        {event.pricePerPersonJpy !== null && (
          <View style={styles.infoRow}>
            <IconSymbol name="yensign" size={20} color="#9CA3AF" />
            <Text style={styles.infoText}>¥{event.pricePerPersonJpy.toLocaleString()}</Text>
          </View>
        )}

        {/* タグ */}
        {event.tags.length > 0 && (
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
        )}

        {/* 説明 */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>説明</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
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
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => {
                // TODO: 申請管理画面へ遷移
                Alert.alert('開発中', '申請管理機能は開発中です');
              }}
            >
              <Text style={styles.manageButtonText}>申請を管理</Text>
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
  imageGallery: {
    height: 300,
  },
  eventImage: {
    width: 400,
    height: 300,
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#E5E7EB',
  },
  linkText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  tagsContainer: {
    flexDirection: 'row',
    marginVertical: 16,
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
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
