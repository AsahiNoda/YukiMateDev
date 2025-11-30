import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { saveEvent } from '@/hooks/useDiscoverEvents';
import { useColorScheme } from '@hooks/use-color-scheme';
import type { DiscoverEvent } from '@types';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// カテゴリアイコンのインポート
import CalendarIcon from '../../assets/images/icons/calendar.svg';
import CameraIcon from '../../assets/images/icons/camera.svg';
import EventFlagIcon from '../../assets/images/icons/event-flag.svg';
import GroupIcon from '../../assets/images/icons/group.svg';
import LessonIcon from '../../assets/images/icons/lesson.svg';
import MountainIcon from '../../assets/images/icons/mountain.svg';

interface EventListCardProps {
  event: DiscoverEvent;
  onPress: () => void;
}

export function EventListCard({ event, onPress }: EventListCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'event': return 'イベント';
      case 'lesson': return 'レッスン';
      case 'filming': return '撮影';
      case 'group': return '仲間';
      default: return category;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'event': return EventFlagIcon;
      case 'lesson': return LessonIcon;
      case 'filming': return CameraIcon;
      case 'group': return GroupIcon;
      default: return EventFlagIcon;
    }
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
      case 'intermediate': return '#5A7D9A';
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
      style={styles.cardContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={95} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.blurContainer}>
        <LinearGradient
          colors={['rgba(219, 240, 250, 0.7)', 'rgba(181, 228, 255, 0.68)', 'rgba(210, 235, 248, 0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
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
              <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                <IconSymbol name="photo" size={32} color={colors.icon} />
              </View>
            )}

            {/* カテゴリバッジ（左上） */}
            <View style={styles.categoryBadge}>
              {(() => {
                const IconComponent = getCategoryIcon(event.category);
                return <IconComponent width={14} height={14} color={colors.text} />;
              })()}
              <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                {getCategoryLabel(event.category)}
              </Text>
            </View>

            {/* 空き状況バッジ（右上） */}
            <View style={styles.spotsBadge}>
              <Text style={[styles.spotsText, { color: colors.text }]}>
                {event.spotsTaken}/{event.capacityTotal}
              </Text>
            </View>
          </View>

          {/* イベント情報 */}
          <View style={styles.content}>
            {/* タイトル */}
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {event.title}
            </Text>

            {/* スキー場と日時 */}
            <View style={styles.infoRow}>
              <MountainIcon width={14} height={14} color={colors.icon} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{event.resortName}</Text>
              <CalendarIcon width={14} height={14} color={colors.icon} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{formatDate(event.startAt)}</Text>
            </View>

            {/* タグ（10個まで） */}
            {event.tags && event.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {event.tags.slice(0, 10).map((tag, index) => (
                  <Text key={index} style={[styles.tag, { color: colors.accent }]}>
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
                  <View style={[styles.hostAvatar, styles.hostAvatarPlaceholder, { backgroundColor: colors.tint }]}>
                    <Text style={[styles.hostAvatarText, { color: colors.text }]}>
                      {event.hostName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={[styles.hostName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {event.hostName}
                </Text>
              </View>

              {/* レベルバッジ */}
              {event.levelRequired && (
                <View style={[
                  styles.levelBadge,
                  { backgroundColor: getLevelColor(event.levelRequired) }
                ]}>
                  <Text style={[styles.levelText, { color: colors.text }]}>
                    {getLevelLabel(event.levelRequired)}
                  </Text>
                </View>
              )}
            </View>

            {/* 価格と保存ボタン */}
            <View style={styles.bottomRow}>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.accent }]}>
                  {event.pricePerPersonJpy !== null
                    ? `¥${event.pricePerPersonJpy.toLocaleString()}`
                    : '無料'}
                </Text>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}> / 1人</Text>
              </View>

              {/* 保存ボタン */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaved && [styles.saveButtonActive, { borderColor: colors.accent }],
                ]}
                onPress={handleSave}
                disabled={isSaving || isSaved}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name={isSaved ? 'star.fill' : 'star'}
                  size={18}
                  color={isSaved ? colors.accent : colors.textSecondary}
                />
                <Text style={[
                  styles.saveButtonText,
                  { color: colors.textSecondary },
                  isSaved && { color: colors.accent },
                ]}>
                  {isSaved ? '保存済み' : '保存'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(158, 210, 255, 0.68)',
  },
  gradientOverlay: {
    borderRadius: 16,
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
    // backgroundColor is set dynamically in the component
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  categoryBadgeText: {
    // color is set dynamically in the component
    fontSize: 11,
    fontWeight: '600',
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
    // color is set dynamically in the component
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    // color is set dynamically in the component
    marginBottom: 8,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    // color is set dynamically in the component
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    fontSize: 11,
    // color is set dynamically in the component
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // More subtle divider
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
    width: 45,
    height: 45,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  hostAvatarPlaceholder: {
    // backgroundColor is set dynamically in the component
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  hostAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    // color is set dynamically in the component
  },
  hostName: {
    fontSize: 18,
    // color is set dynamically in the component
    fontWeight: '700',
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
    // color is set dynamically in the component
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
    // color is set dynamically in the component
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  priceLabel: {
    fontSize: 13,
    // color is set dynamically in the component
    marginLeft: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Glassy button
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  saveButtonActive: {
    backgroundColor: 'rgba(30, 58, 95, 0.6)',
    borderColor: '#D4AF37',
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    // color is set dynamically in the component
  },
  saveButtonTextActive: {
    // color is set dynamically in the component
  },
});

