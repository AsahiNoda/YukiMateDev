import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import { borderRadius, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import type { SnowfeedPost } from '@types';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ResortPostCardProps {
  post: SnowfeedPost;
  helpfulOn: boolean;
  onToggleHelpful: () => void;
  /** 右上の「…」（自分の投稿なら削除、ほかの人の投稿なら通報） */
  onOpenMenu: () => void;
}

function useRelativeTime() {
  const { t } = useTranslation();
  return (iso: string) => {
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return t('snowfeed.justNow');
    if (diffMin < 60) return t('snowfeed.minutesAgo', { minutes: diffMin });
    const hours = Math.floor(diffMin / 60);
    if (hours < 24) return t('snowfeed.hoursAgo', { hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('snowfeed.daysAgo', { days });
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
}

/**
 * ゲレンデページの投稿カード。写真が主役（220px）。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Snowfeed.html
 * TODO(ui-redesign)：撮影場所のタグ（リーゼン上部など）は、feed_posts に場所の項目ができたら投稿者名の下に出す。
 */
export function ResortPostCard({ post, helpfulOn, onToggleHelpful, onOpenMenu }: ResortPostCardProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const relative = useRelativeTime();
  const photo = post.photos?.[0];

  return (
    <View style={[styles.card, { borderBottomColor: c.divider }]}>
      <View style={styles.header}>
        <RoleBasedAvatar avatarUrl={post.userAvatar} role={post.userRole} size={36} showBadge={false} />
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {post.userName}
          </Text>
          <Text style={[styles.meta, { color: c.textLabel }]}>{relative(post.createdAt)}</Text>
        </View>
        <Pressable
          onPress={onOpenMenu}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel={t('resortPage.postMenu')}
          testID={`post-menu-${post.id}`}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={c.textLabel} />
        </Pressable>
      </View>

      {photo ? (
        <Image source={{ uri: photo }} style={[styles.photo, { backgroundColor: c.chipBackground }]} contentFit="cover" />
      ) : null}

      {post.text ? <Text style={[styles.text, { color: c.chipText }]}>{post.text}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={onToggleHelpful}
          style={styles.helpful}
          accessibilityRole="button"
          accessibilityState={{ selected: helpfulOn }}
          hitSlop={4}
        >
          <Ionicons
            name={helpfulOn ? 'thumbs-up' : 'thumbs-up-outline'}
            size={18}
            color={helpfulOn ? c.tintText : c.chipText}
          />
          <Text style={[styles.helpfulText, { color: helpfulOn ? c.tintText : c.chipText }]}>
            {t('resortPage.helpful', { count: post.likeCount })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  meta: {
    fontSize: 12,
  },
  menuButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  photo: {
    marginTop: 10,
    width: '100%',
    height: 220,
    borderRadius: borderRadius.card,
  },
  text: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  helpful: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpfulText: {
    fontSize: 13,
  },
});

export default ResortPostCard;
