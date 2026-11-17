import { IconSymbol } from '@/components/ui/icon-symbol';
import { borderRadius, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useBookmark } from '@/hooks/useBookmark';
import type { HomeEventSummary } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEventDate } from '@/utils/formatEventDate';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

export const FEATURED_CARD_WIDTH = 240;
const CARD_HEIGHT = 300;

interface FeaturedEventCardProps {
  event: HomeEventSummary;
  onPress: () => void;
}

/**
 * ホーム特集「今週末、◯◯で滑る人」のカード。写真が主役（240×300）。
 * 写真の上：左上に参加人数（＋公式）、右上に保存（ブックマーク）、下部に日付（ティント色）・タイトル・場所。
 * 文字は写真の上なので textShadow を使ってよい（README 1章）。
 */
export function FeaturedEventCard({ event, onPress }: FeaturedEventCardProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const { isBookmarked, loading, toggleBookmark } = useBookmark(event.id);
  const isOfficial = event.hostRole === 'official' || event.hostRole === 'developer';
  const place = [event.resortName, event.meetingPlace].filter(Boolean).join(' ・ ');

  const handleSave = async () => {
    if (loading) return;
    const ok = await toggleBookmark();
    if (!ok) Alert.alert(t('common.error'), t('eventDetail.bookmarkFailed'));
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: c.chipBackground }, pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={[event.title, formatEventDate(event.startAt, t), place].join(', ')}
    >
      {event.photoUrl ? (
        <Image source={{ uri: event.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <IconSymbol name="photo" size={40} color={c.textLabel} />
        </View>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0)', c.photoGradientEnd]}
        locations={[0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 左上：参加人数・公式 */}
      <View style={styles.topLeft}>
        <View style={[styles.overlayPill, { backgroundColor: c.photoOverlayBackground }]}>
          <Ionicons name="people" size={12} color={c.photoOverlayText} />
          <Text style={[styles.overlayText, { color: c.photoOverlayText }]}>
            {t('homeFeed.participating', { count: event.participants })}
          </Text>
        </View>
        {isOfficial ? (
          <View style={[styles.overlayPill, { backgroundColor: c.photoOverlayBackground }]}>
            <Ionicons name="checkmark-circle" size={12} color={c.photoOverlayTint} />
            <Text style={[styles.overlayText, { color: c.photoOverlayText }]}>{t('chips.official')}</Text>
          </View>
        ) : null}
      </View>

      {/* 右上：保存 */}
      <Pressable
        onPress={handleSave}
        disabled={loading}
        hitSlop={4}
        style={[styles.save, { backgroundColor: c.photoOverlayBackground }]}
        accessibilityRole="button"
        accessibilityLabel={isBookmarked ? t('actions.unsave') : t('actions.save')}
        accessibilityState={{ selected: isBookmarked }}
      >
        <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={c.photoOverlayText} />
      </Pressable>

      {/* 下部：日付・タイトル・場所 */}
      <View style={styles.bottom} pointerEvents="none">
        <Text style={[styles.date, { color: c.photoOverlayTint }]}>{formatEventDate(event.startAt, t)}</Text>
        <Text style={[styles.title, { color: c.photoOverlayText }]} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.placeRow}>
          <Ionicons name="location" size={13} color={c.photoOverlayText} />
          <Text style={[styles.place, { color: c.photoOverlayText }]} numberOfLines={1}>
            {place}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: FEATURED_CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.photoCardLarge,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  overlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overlayText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  save: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  date: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  place: {
    flex: 1,
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },
});

export default FeaturedEventCard;
