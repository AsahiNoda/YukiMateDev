import { Chip } from '@/components/ui/Chip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { borderRadius, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import type { HomeEventSummary } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import { levelLabel, spotsLeftChip } from '@/utils/eventDisplay';
import { formatEventDate } from '@/utils/formatEventDate';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface RecommendedEventRowProps {
  event: HomeEventSummary;
  /** プロフィールと一致したスタイル（表示名に変換済み） */
  matchedStyles: string[];
  onPress: () => void;
}

/** 「あなたに合いそう」の1行。見た目の仕様：docs/ui-redesign/mockups/New-Home-Snow.html */
export function RecommendedEventRow({ event, matchedStyles, onPress }: RecommendedEventRowProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const level = levelLabel(event.levelRequired, t);
  const spots = spotsLeftChip(event.capacityTotal, event.participants, t);
  const place = event.meetingPlace || event.resortName;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: c.card }, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={[event.title, formatEventDate(event.startAt, t), place].join(', ')}
    >
      <View style={[styles.thumb, { backgroundColor: c.chipBackground }]}>
        {event.photoUrl ? (
          <Image source={{ uri: event.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <IconSymbol name="photo" size={24} color={c.textLabel} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.meta, { color: c.tintText }]} numberOfLines={1}>
          {formatEventDate(event.startAt, t)}
          {place ? ` ・ ${place}` : ''}
        </Text>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.chips}>
          {level ? <Chip label={level} tone="outline" /> : null}
          {matchedStyles.map((s) => (
            <Chip key={s} label={s} tone="outline" />
          ))}
          {event.soloOk ? <Chip label={t('chips.soloOk')} tone="tint" /> : null}
          {spots ? <Chip label={spots.label} tone={spots.tone} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    borderRadius: borderRadius.card,
    padding: 10,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  meta: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});

export default RecommendedEventRow;
