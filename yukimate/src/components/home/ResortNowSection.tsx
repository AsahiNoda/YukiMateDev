import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import type { ResortPostThumb } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ResortNowSectionProps {
  /** 今〜明日8時の降雪予報が基準以上のときだけ渡す（パウダーアラート） */
  powderCm: number | null;
  posts: ResortPostThumb[];
  onMakeEarlyGroup: () => void;
  onPressPost: () => void;
}

function useRelativeTime() {
  const { t } = useTranslation();
  return (iso: string) => {
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return t('snowfeed.justNow');
    if (diffMin < 60) return t('snowfeed.minutesAgo', { minutes: diffMin });
    const hours = Math.floor(diffMin / 60);
    if (hours < 24) return t('snowfeed.hoursAgo', { hours });
    return t('snowfeed.daysAgo', { days: Math.floor(hours / 24) });
  };
}

/**
 * 「ゲレンデの今」：パウダーアラート（+20cm以上の予報のとき先頭）と、投稿の写真2枚。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Home-Snow.html
 */
export function ResortNowSection({ powderCm, posts, onMakeEarlyGroup, onPressPost }: ResortNowSectionProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const relative = useRelativeTime();

  return (
    <View style={styles.wrap}>
      {powderCm !== null ? (
        <View style={[styles.alert, { backgroundColor: c.accentSurface, borderColor: c.accentSurfaceBorder }]}>
          <View style={[styles.alertIcon, { backgroundColor: c.primaryButton }]}>
            <Ionicons name="snow" size={22} color={c.primaryButtonText} />
          </View>
          <View style={styles.alertText}>
            <Text style={[styles.alertKicker, { color: c.tintText }]}>{t('homeFeed.powderAlertTitle')}</Text>
            <Text style={[styles.alertTitle, { color: c.text }]}>{t('homeFeed.powderAlertMessage', { cm: powderCm })}</Text>
          </View>
          <PillButton title={t('homeFeed.makeEarlyGroup')} size="sm" onPress={onMakeEarlyGroup} />
        </View>
      ) : null}

      {posts.length > 0 ? (
        <View style={styles.posts}>
          {posts.map((post) => (
            <Pressable
              key={post.id}
              onPress={onPressPost}
              style={({ pressed }) => [styles.post, { backgroundColor: c.card }, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={[post.text, relative(post.createdAt)].filter(Boolean).join(', ')}
            >
              <Image source={{ uri: post.photoUrl }} style={[styles.postPhoto, { backgroundColor: c.chipBackground }]} contentFit="cover" />
              <Text style={[styles.postText, { color: c.chipText }]} numberOfLines={1}>
                {post.text ? `${post.text} · ` : ''}
                {relative(post.createdAt)}
              </Text>
            </Pressable>
          ))}
          {posts.length === 1 ? <View style={styles.postSpacer} /> : null}
        </View>
      ) : (
        <Text style={[styles.empty, { color: c.textLabel }]}>{t('homeFeed.noResortPosts')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: {
    flex: 1,
  },
  alertKicker: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  posts: {
    flexDirection: 'row',
    gap: 10,
  },
  post: {
    flex: 1,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
  },
  postSpacer: {
    flex: 1,
  },
  postPhoto: {
    width: '100%',
    height: 96,
  },
  postText: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
  },
  empty: {
    fontSize: 13,
  },
});

export default ResortNowSection;
