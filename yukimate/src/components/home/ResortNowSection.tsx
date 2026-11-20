import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import type { ResortPostThumb } from '@/hooks/useHomeFeed';
import { useTranslation } from '@/hooks/useTranslation';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ResortNowSectionProps {
  posts: ResortPostThumb[];
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
 * 「ゲレンデの今」：ゲレンデの投稿の写真2枚。
 * パウダーアラートはホームの天気カードの中（今の状態の下）に移した。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Home-Snow.html
 */
export function ResortNowSection({ posts, onPressPost }: ResortNowSectionProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const relative = useRelativeTime();

  return (
    <View style={styles.wrap}>
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
    fontSize: fontSize.xs,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
  },
  empty: {
    fontSize: fontSize.meta,
  },
});

export default ResortNowSection;
