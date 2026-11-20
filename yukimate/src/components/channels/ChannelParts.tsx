import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { CHANNEL_REACTIONS, type ChannelPost, type ChannelReaction } from '@/hooks/useChannels';
import { useTranslation } from '@/hooks/useTranslation';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 投稿の時刻：今日は「9:05」、昨日は「昨日」、それより前は「11/3」 */
export function formatChannelTime(iso: string, t: (key: string) => string) {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === now.toDateString()) {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 投稿の下のリアクション。
 * showAll：リアクションのみのチャンネルでは、まだ付いていない絵文字も並べて押せるようにする。
 */
export function ReactionPills({
  post,
  canReact,
  showAll = false,
  onToggle,
}: {
  post: ChannelPost;
  canReact: boolean;
  showAll?: boolean;
  onToggle: (emoji: ChannelReaction) => void;
}) {
  const c = useAppColors();
  const { t } = useTranslation();
  const items = showAll
    ? CHANNEL_REACTIONS.map((emoji) => post.reactions.find((r) => r.emoji === emoji) ?? { emoji, count: 0, mine: false })
    : post.reactions;
  if (items.length === 0) return null;

  return (
    <View style={styles.pills}>
      {items.map((r) => (
        <Pressable
          key={r.emoji}
          disabled={!canReact}
          onPress={() => onToggle(r.emoji)}
          hitSlop={{ top: 6, bottom: 6 }}
          accessibilityRole="button"
          accessibilityState={{ selected: r.mine, disabled: !canReact }}
          accessibilityLabel={t('channels.reactionA11y', { emoji: r.emoji, count: r.count })}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: r.mine ? c.tintChipBackground : c.chipBackground,
              borderColor: r.mine ? c.tint : 'transparent',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={styles.pillEmoji}>{r.emoji}</Text>
          {r.count > 0 ? (
            <Text style={[styles.pillCount, { color: r.mine ? c.tintChipText : c.chipText }]}>{r.count}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

/** 投稿を長押ししたときのメニュー：リアクション＋通報・削除 */
export function ChannelPostSheet({
  post,
  canReact,
  canDelete,
  canReport,
  onReact,
  onDelete,
  onReport,
  onClose,
}: {
  post: ChannelPost | null;
  canReact: boolean;
  canDelete: boolean;
  canReport: boolean;
  onReact: (emoji: ChannelReaction) => void;
  onDelete: () => void;
  onReport: () => void;
  onClose: () => void;
}) {
  const c = useAppColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!post} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
        onPress={onClose}
        accessibilityLabel={t('common.cancel')}
      />
      <View style={[styles.sheet, { backgroundColor: c.sheetBackground, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Text style={[styles.sheetTitle, { color: c.textLabel }]} accessibilityRole="header">
          {t('channels.postMenuTitle')}
        </Text>
        {canReact && post ? (
          <View style={styles.emojiRow} accessibilityLabel={t('channels.reactionsLabel')}>
            {CHANNEL_REACTIONS.map((emoji) => {
              const mine = post.reactions.find((r) => r.emoji === emoji)?.mine ?? false;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => onReact(emoji)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mine }}
                  accessibilityLabel={emoji}
                  style={({ pressed }) => [
                    styles.emojiButton,
                    { backgroundColor: mine ? c.tintChipBackground : c.chipBackground, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {canReport ? (
          <Pressable
            onPress={onReport}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, { borderBottomColor: c.divider }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionText, { color: c.text }]}>{t('channels.reportPost')}</Text>
          </Pressable>
        ) : null}
        {canDelete ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, { borderBottomColor: c.divider }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionText, { color: c.danger }]}>{t('channels.deletePost')}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
          <Text style={[styles.cancelText, { color: c.tintText }]}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  pillEmoji: {
    fontSize: fontSize.sm,
  },
  pillCount: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.semibold,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.glass,
    borderTopRightRadius: borderRadius.glass,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  emojiButton: {
    width: touchTarget.min + 4,
    height: touchTarget.min + 4,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: fontSize.xxl,
  },
  action: {
    minHeight: touchTarget.min + 8,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  cancel: {
    minHeight: touchTarget.min + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
