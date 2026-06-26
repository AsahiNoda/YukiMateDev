import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useBookmark } from '@/hooks/useBookmark';
import { useColorScheme } from '@hooks/use-color-scheme';
import type { DiscoverEvent } from '@types';
import { BlurView } from 'expo-blur';
import React from 'react';
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

  // useBookmarkフックを使用
  const { isBookmarked, loading: isSaving, toggleBookmark } = useBookmark(event.id);

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
    if (!level) return colors.textSecondary;
    switch (level) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.tint;
      case 'advanced': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const spotsAvailable = event.capacityTotal - event.spotsTaken;
  const isAlmostFull = spotsAvailable <= 2 && spotsAvailable > 0;
  const isFull = spotsAvailable <= 0;

  const handleSave = async (e: any) => {
    e.stopPropagation(); // カードのonPressを発火させない

    if (isSaving) return;

    const success = await toggleBookmark();

    if (!success) {
      Alert.alert('エラー', 'ブックマークの更新に失敗しました');
    }
  };

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={95} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.blurContainer}>
        <View style={[styles.gradientOverlay, { backgroundColor: colors.card }]}>
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
            <View style={[styles.categoryBadge, { backgroundColor: `${colors.backgroundSecondary}CC` }]}>
              {(() => {
                const IconComponent = getCategoryIcon(event.category);
                return <IconComponent width={14} height={14} color={colors.text} />;
              })()}
              <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                {getCategoryLabel(event.category)}
              </Text>
            </View>

            {/* 空き状況バッジ（右上） */}
            <View style={[styles.spotsBadge, { backgroundColor: `${colors.backgroundSecondary}CC` }]}>
              <Text style={[styles.spotsText, { color: colors.text }]}>
                {event.spotsTaken}/{event.capacityTotal}
              </Text>
            </View>

            {/* ★登録ユーザー参加中バッジ（右上、空き状況バッジの下） */}
            {event.starredParticipants && event.starredParticipants.length > 0 && (
              <View style={[styles.starredParticipantBadge, { backgroundColor: `${colors.accent}DD` }]}>
                <IconSymbol name="star.fill" size={10} color={colors.text} />
                <Text style={[styles.starredParticipantText, { color: colors.text }]}>
                  ユーザーが参加中
                </Text>
              </View>
            )}

            {/* レベルバッジ（右下） */}
            {event.levelRequired && (
              <View style={[
                styles.levelBadgeImage,
                { backgroundColor: `${getLevelColor(event.levelRequired)}DD` }
              ]}>
                <IconSymbol name="cube.fill" size={12} color={colors.text} />
                <Text style={[styles.levelText, { color: colors.text }]}>
                  {getLevelLabel(event.levelRequired)}
                </Text>
              </View>
            )}
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
                  <Text key={index} style={[styles.tag, { color: colors.tint }]}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}

            {/* 仕切り線 */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* ホスト情報 */}
            <View style={styles.footer}>
              <View style={styles.hostRow}>
                <RoleBasedAvatar
                  avatarUrl={event.hostAvatar}
                  role={event.hostRole}
                  size={45}
                  showBadge={true}
                />
                <View style={styles.hostNameContainer}>
                  <Text style={[styles.hostName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {event.hostName}
                  </Text>
                  {event.isHostStarred && (
                    <IconSymbol name="star.fill" size={14} color={colors.accent} style={styles.hostStarIcon} />
                  )}
                </View>
              </View>
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
                  { backgroundColor: `${colors.backgroundSecondary}1A`, borderColor: `${colors.border}1A` },
                  isBookmarked && { backgroundColor: `${colors.tint}99`, borderColor: colors.accent },
                ]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name={isBookmarked ? 'star.fill' : 'star'}
                  size={18}
                  color={isBookmarked ? colors.accent : colors.textSecondary}
                />
                <Text style={[
                  styles.saveButtonText,
                  { color: colors.textSecondary },
                  isBookmarked && { color: colors.accent },
                ]}>
                  {isBookmarked ? '保存済み' : '保存'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#161618ff',
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
    // backgroundColor is set dynamically in the component
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
    // backgroundColor is set dynamically in the component
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  spotsText: {
    // color is set dynamically in the component
    fontSize: 12,
    fontWeight: '600',
  },
  starredParticipantBadge: {
    position: 'absolute',
    top: 48,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor is set dynamically in the component
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  starredParticipantText: {
    // color is set dynamically in the component
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
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
    // backgroundColor is set dynamically in the component
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
  hostNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hostAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    borderWidth: 1,
    // borderColor is set dynamically in the component
  },
  hostAvatarPlaceholder: {
    // backgroundColor is set dynamically in the component
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    // borderColor is set dynamically in the component
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
  },
  hostStarIcon: {
    marginLeft: 0,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  levelBadgeImage: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
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
    // backgroundColor is set dynamically in the component
    borderWidth: 1,
    // borderColor is set dynamically in the component
    gap: 6,
  },
  saveButtonActive: {
    // backgroundColor is set dynamically in the component
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

