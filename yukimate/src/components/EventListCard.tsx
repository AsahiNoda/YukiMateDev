import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { saveEvent } from '@/hooks/useDiscoverEvents';
import type { DiscoverEvent } from '@types';

interface EventListCardProps {
  event: DiscoverEvent;
  onPress: () => void;
}

export function EventListCard({ event, onPress }: EventListCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  const getLevelLabel = (level: string | null) => {
    if (!level) return null;
    switch (level) {
      case 'beginner': return '初級';
      case 'intermediate': return '中級';
      case 'advanced': return '上級';
      default: return level;
    }
  };

  const getLevelColor = (level: string | null) => {
    if (!level) return '#6B7280';
    switch (level) {
      case 'beginner': return '#10B981';
      case 'intermediate': return '#3B82F6';
      case 'advanced': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const spotsAvailable = event.capacityTotal - event.spotsTaken;
  const isAlmostFull = spotsAvailable <= 2 && spotsAvailable > 0;
  const isFull = spotsAvailable <= 0;

  const handleSave = async (e: any) => {
    e.stopPropagation(); // カードのonPressを発火させない

    if (isSaving || isSaved) return;

    setIsSaving(true);
    const result = await saveEvent(event.id);
    setIsSaving(false);

    if (result.success) {
      setIsSaved(true);
      Alert.alert('保存完了', 'イベントを保存しました');
    } else {
      Alert.alert('エラー', result.error || '保存に失敗しました');
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* イベント画像 */}
      <View style={styles.imageContainer}>
        {event.photoUrl ? (
          <Image
            source={{ uri: event.photoUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <IconSymbol name="photo" size={32} color="#6B7280" />
          </View>
        )}

        {/* 空き状況バッジ */}
        <View style={styles.spotsBadge}>
          <Text style={styles.spotsText}>
            {event.spotsTaken}/{event.capacityTotal}
          </Text>
        </View>
      </View>

      {/* イベント情報 */}
      <View style={styles.content}>
        {/* タイトル */}
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        {/* 日時とスキー場 */}
        <View style={styles.infoRow}>
          <IconSymbol name="calendar" size={14} color="#9CA3AF" />
          <Text style={styles.infoText}>
            {event.resortName} · {formatDate(event.startAt)}
          </Text>
        </View>

        {/* タグ（最初の3つまで） */}
        {event.tags && event.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {event.tags.slice(0, 3).map((tag, index) => (
              <Text key={index} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}

        {/* 仕切り線 */}
        <View style={styles.divider} />

        {/* ホスト情報とレベル */}
        <View style={styles.footer}>
          <View style={styles.hostRow}>
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
            <Text style={styles.hostName} numberOfLines={1}>
              {event.hostName}
            </Text>
          </View>

          {/* レベルバッジ */}
          {event.levelRequired && (
            <View style={[
              styles.levelBadge,
              { backgroundColor: getLevelColor(event.levelRequired) }
            ]}>
              <Text style={styles.levelText}>
                {getLevelLabel(event.levelRequired)}
              </Text>
            </View>
          )}
        </View>

        {/* 価格と保存ボタン */}
        <View style={styles.bottomRow}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {event.pricePerPersonJpy !== null
                ? `¥${event.pricePerPersonJpy.toLocaleString()}`
                : '無料'}
            </Text>
            <Text style={styles.priceLabel}> / person</Text>
          </View>

          {/* 保存ボタン */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              isSaved && styles.saveButtonActive,
            ]}
            onPress={handleSave}
            disabled={isSaving || isSaved}
            activeOpacity={0.7}
          >
            <IconSymbol
              name={isSaved ? 'star.fill' : 'star'}
              size={18}
              color={isSaved ? '#FCD34D' : '#E5E7EB'}
            />
            <Text style={[
              styles.saveButtonText,
              isSaved && styles.saveButtonTextActive,
            ]}>
              {isSaved ? '保存済み' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  spotsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    fontSize: 11,
    color: '#60A5FA',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  hostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  hostAvatarPlaceholder: {
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hostName: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '500',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#334155',
    gap: 6,
  },
  saveButtonActive: {
    backgroundColor: '#1E3A5F',
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  saveButtonTextActive: {
    color: '#FCD34D',
  },
});
