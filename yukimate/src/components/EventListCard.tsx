import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import { Chip } from '@/components/ui/Chip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { borderRadius, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useBookmark } from '@/hooks/useBookmark';
import { useTranslation } from '@/hooks/useTranslation';
import {
  categoryLabel,
  isSoloFriendly,
  levelLabel,
  priceLabel,
  spotsLeftChip,
} from '@/utils/eventDisplay';
import { formatEventDate } from '@/utils/formatEventDate';
import { Ionicons } from '@expo/vector-icons';
import type { DiscoverEvent } from '@types';
import { Image } from 'expo-image';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

// カテゴリアイコン
import CameraIcon from '../../assets/images/icons/camera.svg';
import EventFlagIcon from '../../assets/images/icons/event-flag.svg';
import GroupIcon from '../../assets/images/icons/group.svg';
import LessonIcon from '../../assets/images/icons/lesson.svg';
import MountainIcon from '../../assets/images/icons/mountain.svg';

const CATEGORY_ICONS = {
  event: EventFlagIcon,
  lesson: LessonIcon,
  filming: CameraIcon,
  group: GroupIcon,
} as const;

const PHOTO_HEIGHT = 176;

interface EventListCardProps {
  event: DiscoverEvent;
  onPress: () => void;
}

/**
 * 「さがす」リストのイベントカード。写真が主役（上に写真176px、下に情報）。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Explore.html
 * - 写真の上：左上カテゴリ／右上保存（ブックマーク）／左下日付／右下レベル
 * - 本文：タイトル（主役）→ スキー場・集合場所 → チップ → ホストと価格
 */
export function EventListCard({ event, onPress }: EventListCardProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const { isBookmarked, loading: isSaving, toggleBookmark } = useBookmark(event.id);

  const CategoryIcon = CATEGORY_ICONS[event.category] ?? EventFlagIcon;
  const level = levelLabel(event.levelRequired, t);
  const spots = spotsLeftChip(event.capacityTotal, event.spotsTaken, t);
  const hasStarredParticipant = (event.starredParticipants?.length ?? 0) > 0;
  const place = [event.resortName, event.meetingPlace].filter(Boolean).join(' ・ ');

  const handleSave = async () => {
    if (isSaving) return;
    const success = await toggleBookmark();
    if (!success) {
      Alert.alert(t('common.error'), t('eventDetail.bookmarkFailed'));
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: c.card }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[event.title, formatEventDate(event.startAt, t), event.resortName].join(', ')}
    >
      {/* 写真 */}
      <View style={styles.photo}>
        {event.photoUrl ? (
          <Image source={{ uri: event.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder, { backgroundColor: c.chipBackground }]}>
            <IconSymbol name="photo" size={32} color={c.textLabel} />
          </View>
        )}

        {/* 左上：カテゴリ */}
        <View style={[styles.categoryBadge, { backgroundColor: c.photoOverlayBackground }]}>
          <CategoryIcon width={14} height={14} color={c.photoOverlayText} />
          <Text style={[styles.overlaySmallText, { color: c.photoOverlayText }]}>
            {categoryLabel(event.category, t)}
          </Text>
        </View>

        {/* 右上：保存（ブックマーク） */}
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          hitSlop={4}
          style={[styles.saveButton, { backgroundColor: c.photoOverlayBackground }]}
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? t('actions.unsave') : t('actions.save')}
          accessibilityState={{ selected: isBookmarked, busy: isSaving }}
          testID={`event-card-save-${event.id}`}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={c.photoOverlayText}
          />
        </Pressable>

        {/* 左下：日付 */}
        <View style={[styles.datePill, { backgroundColor: c.photoOverlayBackground }]}>
          <Ionicons name="calendar-outline" size={14} color={c.photoOverlayText} />
          <Text style={[styles.dateText, { color: c.photoOverlayText }]}>{formatEventDate(event.startAt, t)}</Text>
        </View>

        {/* 右下：レベル（上級を赤で示さない＝中立） */}
        {level ? (
          <View style={[styles.levelPill, { backgroundColor: c.photoOverlayBackground }]}>
            <Ionicons name="stats-chart-outline" size={12} color={c.photoOverlayText} />
            <Text style={[styles.overlaySmallText, { color: c.photoOverlayText }]}>{level}</Text>
          </View>
        ) : null}
      </View>

      {/* 本文 */}
      <View style={styles.body}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.placeRow}>
          <MountainIcon width={14} height={14} color={c.chipText} />
          <Text style={[styles.placeText, { color: c.chipText }]} numberOfLines={1}>
            {place}
          </Text>
        </View>

        {isSoloFriendly(event) || spots || hasStarredParticipant ? (
          <View style={styles.chips}>
            {isSoloFriendly(event) ? <Chip label={t('chips.soloOk')} tone="tint" /> : null}
            {spots ? <Chip label={spots.label} tone={spots.tone} /> : null}
            {hasStarredParticipant ? <Chip label={t('chips.starredJoining')} tone="neutral" /> : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.hostRow}>
            <RoleBasedAvatar avatarUrl={event.hostAvatar} role={event.hostRole} size={26} showBadge={false} />
            <Text style={[styles.hostName, { color: c.chipText }]} numberOfLines={1}>
              {event.hostName}
            </Text>
            {event.isHostStarred ? (
              <Ionicons name="star" size={12} color={c.gold} accessibilityLabel={t('settings.starredUsers')} />
            ) : null}
          </View>
          <Text style={[styles.price, { color: c.gold }]}>
            {priceLabel(event.pricePerPersonJpy, t)}
            <Text style={[styles.perPerson, { color: c.chipText }]}>{t('chips.perPerson')}</Text>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md - 4,
    borderRadius: borderRadius.photoCard,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
  photo: {
    height: PHOTO_HEIGHT,
    width: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePill: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '900',
  },
  levelPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overlaySmallText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  body: {
    paddingTop: 12,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
    gap: 7,
  },
  title: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    lineHeight: 24,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeText: {
    flex: 1,
    fontSize: 13,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: spacing.sm,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  hostName: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    flexShrink: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
  },
  perPerson: {
    fontSize: 12,
    fontWeight: fontWeight.normal,
  },
});

export default EventListCard;
