import { ReportSheet } from '@/components/ReportSheet';
import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import {
  channelErrorKey,
  channelKindDescKey,
  channelKindLabelKey,
  useChannel,
  useChannelActions,
  useChannelMembers,
  type ChannelMember,
} from '@/hooks/useChannels';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * チャンネル情報：説明・種類・メンバー一覧。
 * オーナー：モデレーターの任命・解除、メンバーを外す、アーカイブ。
 * モデレーター：メンバーを外す。メンバー：退出・通報。
 */
export default function ChannelInfoScreen() {
  const c = useAppColors();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const detail = useChannel(channelId);
  const members = useChannelMembers(channelId);
  const actions = useChannelActions();
  const [selected, setSelected] = useState<ChannelMember | null>(null);
  const [reporting, setReporting] = useState(false);

  const channel = detail.data?.channel;
  const myRole = detail.data?.myRole ?? null;
  const isOwner = myRole === 'owner';
  const isModerator = myRole === 'moderator';
  const isArchived = !!channel?.archivedAt;
  // プライベートでメンバーでない：メンバー一覧は RLS で返ってこない
  const locked = !!channel && !channel.isPublic && !myRole;

  const roleLabel = (role: ChannelMember['role']) =>
    role === 'owner' ? t('channels.owner') : role === 'moderator' ? t('channels.moderator') : null;

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (error) {
      Alert.alert(t('common.error'), t(channelErrorKey(error)));
    }
  };

  const confirmRemove = (member: ChannelMember) => {
    Alert.alert(t('channels.removeMember'), t('channels.removeMemberConfirm', { name: member.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('channels.removeMember'),
        style: 'destructive',
        onPress: () => run(() => actions.removeMember(channelId!, member.userId)),
      },
    ]);
  };

  const memberActions = (member: ChannelMember): ActionSheetAction[] => {
    const list: ActionSheetAction[] = [
      {
        label: t('channels.viewProfile'),
        onPress: () => {
          setSelected(null);
          router.push(`/user/${member.userId}` as any);
        },
      },
    ];
    if (isOwner && member.role !== 'owner') {
      list.push({
        label: member.role === 'moderator' ? t('channels.removeModerator') : t('channels.makeModerator'),
        onPress: () => {
          setSelected(null);
          run(() => actions.setModerator(channelId!, member.userId, member.role !== 'moderator'));
        },
      });
    }
    if ((isOwner && member.role !== 'owner') || (isModerator && member.role === 'member')) {
      list.push({
        label: t('channels.removeMember'),
        destructive: true,
        onPress: () => {
          setSelected(null);
          confirmRemove(member);
        },
      });
    }
    return list;
  };

  // 退出・アーカイブのあとはチャットタブの「チャンネル」に戻る
  const backToChannels = () =>
    router.dismissTo({ pathname: '/(tabs)/chat', params: { tab: 'channels', t: String(Date.now()) } } as any);

  const handleLeave = () => {
    Alert.alert(t('channels.leave'), t('channels.leaveConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('channels.leave'),
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await actions.leaveChannel(channelId!);
            backToChannels();
          }),
      },
    ]);
  };

  const handleArchive = () => {
    Alert.alert(t('channels.archive'), t('channels.archiveConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('channels.archive'),
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await actions.archiveChannel(channelId!);
            backToChannels();
          }),
      },
    ]);
  };

  const createdDate = channel
    ? new Date(channel.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]} accessibilityRole="header">
          {t('channels.info')}
        </Text>
        <View style={styles.flex} />
        {channel && !isOwner ? (
          <Pressable
            onPress={() => setReporting(true)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('channels.reportChannel')}
          >
            <Ionicons name="flag-outline" size={20} color={c.text} />
          </Pressable>
        ) : null}
      </View>

      {detail.isPending ? (
        <ActivityIndicator style={styles.flex} color={c.tint} />
      ) : !channel ? (
        <Text style={[styles.notFound, { color: c.text }]}>{t('channels.notFound')}</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View>
            <Text style={[styles.name, { color: c.text }]}>{channel.name}</Text>
            <Text style={[styles.meta, { color: c.textMuted }]}>
              {t('channels.memberCount', { count: channel.memberCount })} ・ {t('channels.createdAt', { date: createdDate })}
            </Text>
            <Text style={[styles.meta, { color: c.textMuted }]}>{t('channels.ownerName', { name: channel.ownerName })}</Text>
          </View>

          {channel.description ? <Text style={[styles.description, { color: c.text }]}>{channel.description}</Text> : null}

          <View style={[styles.kindBox, { backgroundColor: c.backgroundSecondary }]}>
            <Text style={[styles.kindTitle, { color: c.text }]}>
              {t(channel.isPublic ? 'channels.visibilityOpen' : 'channels.visibilityPrivate')}
            </Text>
            <Text style={[styles.kindDesc, { color: c.textMuted }]}>
              {t(channel.isPublic ? 'channels.visibilityOpenDesc' : 'channels.visibilityPrivateDesc')}
            </Text>
          </View>
          <View style={[styles.kindBox, { backgroundColor: c.backgroundSecondary }]}>
            <Text style={[styles.kindTitle, { color: c.text }]}>{t(channelKindLabelKey(channel.kind))}</Text>
            <Text style={[styles.kindDesc, { color: c.textMuted }]}>{t(channelKindDescKey(channel.kind))}</Text>
          </View>

          {isArchived ? <Text style={[styles.archived, { color: c.textMuted }]}>{t('channels.archived')}</Text> : null}

          <Text style={[styles.sectionTitle, { color: c.textLabel }]}>{t('channels.members')}</Text>
          {locked ? (
            <Text style={[styles.kindDesc, { color: c.textMuted }]}>{t('channels.privateMembers')}</Text>
          ) : members.isPending ? (
            <ActivityIndicator color={c.tint} />
          ) : (
            (members.data ?? []).map((member) => {
              const label = roleLabel(member.role);
              return (
                <Pressable
                  key={member.userId}
                  onPress={() => setSelected(member)}
                  style={({ pressed }) => [styles.memberRow, { borderBottomColor: c.divider, opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={label ? t('channels.memberA11y', { name: member.name, role: label }) : member.name}
                >
                  <Image
                    source={member.avatarUrl ? { uri: member.avatarUrl } : undefined}
                    style={[styles.avatar, { backgroundColor: c.chipBackground }]}
                  />
                  <Text style={[styles.memberName, { color: c.text }]} numberOfLines={1}>
                    {member.name}
                  </Text>
                  {label ? <Chip label={label} tone={member.role === 'owner' ? 'tint' : 'neutral'} /> : null}
                </Pressable>
              );
            })
          )}

          <View style={styles.footerActions}>
            {myRole && !isOwner ? <PillButton title={t('channels.leave')} variant="danger" onPress={handleLeave} /> : null}
            {isOwner && !isArchived ? <PillButton title={t('channels.archive')} variant="danger" onPress={handleArchive} /> : null}
          </View>
        </ScrollView>
      )}

      <ActionSheet
        visible={!!selected}
        title={selected ? t('channels.memberActions', { name: selected.name }) : undefined}
        actions={selected ? memberActions(selected) : []}
        onClose={() => setSelected(null)}
        cancelLabel={t('common.cancel')}
      />
      <ReportSheet visible={reporting} targetType="channel" targetId={channel?.id ?? null} onClose={() => setReporting(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  iconButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSize.md,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md - 4,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 23,
  },
  kindBox: {
    borderRadius: 12,
    padding: 14,
    gap: 2,
  },
  kindTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  kindDesc: {
    fontSize: 13,
  },
  archived: {
    fontSize: fontSize.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    minHeight: touchTarget.min + 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberName: {
    flex: 1,
    fontSize: fontSize.md,
  },
  footerActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
});
