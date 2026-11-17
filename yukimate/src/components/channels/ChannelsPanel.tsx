import { formatChannelTime } from '@/components/channels/ChannelParts';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import {
  channelErrorKey,
  channelKindLabelKey,
  CHANNEL_OWN_LIMIT,
  useChannelActions,
  useDiscoverChannels,
  useMyChannelRequests,
  useMyChannels,
  type Channel,
} from '@/hooks/useChannels';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

type Segment = 'joined' | 'discover';

const openChannel = (channelId: string) =>
  router.push({ pathname: '/channel/[channelId]', params: { channelId } } as any);

/**
 * チャットタブの「チャンネル」：参加中／見つける の切り替え、作成への入口。
 * イベントのチャットとは別枠（docs/feature-roadmap.md 3-2）。
 */
export function ChannelsPanel() {
  const c = useAppColors();
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('joined');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const mine = useMyChannels();
  const discover = useDiscoverChannels(debounced);
  const myRequests = useMyChannelRequests();
  const actions = useChannelActions();

  const joinedIds = useMemo(() => new Set((mine.data ?? []).map((m) => m.channel.id)), [mine.data]);
  const ownedCount = useMemo(() => (mine.data ?? []).filter((m) => m.role === 'owner').length, [mine.data]);
  const discoverList = useMemo(() => (discover.data ?? []).filter((ch) => !joinedIds.has(ch.id)), [discover.data, joinedIds]);

  const handleCreate = () => {
    if (ownedCount >= CHANNEL_OWN_LIMIT) {
      Alert.alert(t('channels.limitReached', { count: CHANNEL_OWN_LIMIT }));
      return;
    }
    router.push('/channel/new' as any);
  };

  const runFor = async (channelId: string, fn: () => Promise<void>) => {
    setJoiningId(channelId);
    try {
      await fn();
    } catch (error) {
      Alert.alert(t('common.error'), t(channelErrorKey(error)));
    } finally {
      setJoiningId(null);
    }
  };

  // オープン：すぐ参加して開く
  const handleJoin = (channel: Channel) =>
    runFor(channel.id, async () => {
      await actions.joinChannel(channel.id);
      openChannel(channel.id);
    });

  // プライベート：参加をリクエスト（オーナー・モデレーターの「リクエスト」に届く）
  const handleRequest = (channel: Channel) =>
    runFor(channel.id, async () => {
      await actions.requestJoin(channel.id);
      Alert.alert(t('channels.requestSent'), t('channels.requestSentText', { name: channel.name }));
    });

  const handleCancelRequest = (channel: Channel) =>
    Alert.alert(t('channels.cancelRequest'), t('channels.cancelRequestConfirm', { name: channel.name }), [
      { text: t('common.back'), style: 'cancel' },
      {
        text: t('channels.cancelRequest'),
        style: 'destructive',
        onPress: () => runFor(channel.id, () => actions.cancelRequest(channel.id)),
      },
    ]);

  const discoverAction = (channel: Channel) => {
    const busy = joiningId === channel.id;
    if (channel.isPublic) {
      return <PillButton title={t('channels.join')} size="sm" loading={busy} disabled={!!joiningId} onPress={() => handleJoin(channel)} />;
    }
    const status = myRequests.data?.get(channel.id);
    if (status === 'pending') {
      return (
        <PillButton
          title={t('channels.requestPending')}
          size="sm"
          variant="secondary"
          loading={busy}
          disabled={!!joiningId}
          onPress={() => handleCancelRequest(channel)}
        />
      );
    }
    if (status === 'rejected') {
      return <Text style={[styles.rowStatus, { color: c.textLabel }]}>{t('channels.requestRejectedShort')}</Text>;
    }
    return (
      <PillButton title={t('channels.request')} size="sm" loading={busy} disabled={!!joiningId} onPress={() => handleRequest(channel)} />
    );
  };

  const active = segment === 'joined' ? mine : discover;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <SegmentedToggle<Segment>
          options={[
            { value: 'joined', label: t('channels.segmentJoined') },
            { value: 'discover', label: t('channels.segmentDiscover') },
          ]}
          value={segment}
          onChange={setSegment}
          accessibilityLabel={t('channels.segmentLabel')}
        />
        <View style={styles.flex} />
        <PillButton title={t('channels.create')} icon="add" size="sm" variant="secondary" onPress={handleCreate} testID="channel-create" />
      </View>

      {segment === 'discover' ? (
        <View style={[styles.search, { backgroundColor: c.chipBackground }]}>
          <Ionicons name="search" size={18} color={c.textLabel} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('channels.searchPlaceholder')}
            placeholderTextColor={c.textLabel}
            style={[styles.searchInput, { color: c.text }]}
            returnKeyType="search"
            accessibilityLabel={t('channels.searchPlaceholder')}
          />
        </View>
      ) : null}

      {active.isPending ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.tint} />
      ) : active.isError ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.chipText }]}>{t('channels.actionFailed')}</Text>
          <PillButton title={t('common.retry')} icon="refresh" variant="secondary" onPress={() => active.refetch()} />
        </View>
      ) : segment === 'joined' ? (
        <FlatList
          data={mine.data ?? []}
          keyExtractor={(item) => item.channel.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={mine.isRefetching} onRefresh={() => mine.refetch()} tintColor={c.tint} />}
          renderItem={({ item }) => <ChannelRow channel={item.channel} onPress={() => openChannel(item.channel.id)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: c.text }]}>{t('channels.emptyJoinedTitle')}</Text>
              <Text style={[styles.emptyText, { color: c.chipText }]}>{t('channels.emptyJoinedText')}</Text>
              <PillButton title={t('channels.segmentDiscover')} variant="secondary" onPress={() => setSegment('discover')} />
            </View>
          }
        />
      ) : (
        <FlatList
          data={discoverList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={discover.isRefetching}
              onRefresh={() => {
                discover.refetch();
                myRequests.refetch();
              }}
              tintColor={c.tint}
            />
          }
          renderItem={({ item }) => <ChannelRow channel={item} onPress={() => openChannel(item.id)} trailing={discoverAction(item)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: c.chipText }]}>{t('channels.emptyDiscover')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function ChannelRow({ channel, onPress, trailing }: { channel: Channel; onPress: () => void; trailing?: React.ReactNode }) {
  const c = useAppColors();
  const { t } = useTranslation();
  const kind = t(channelKindLabelKey(channel.kind));
  const members = t('channels.memberCount', { count: channel.memberCount });
  const time = channel.lastPostAt ? formatChannelTime(channel.lastPostAt, t) : '';
  const visibility = t(channel.isPublic ? 'channels.visibilityOpen' : 'channels.visibilityPrivate');
  const owner = t('channels.ownerName', { name: channel.ownerName });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: c.divider, opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={t('channels.openA11y', { name: channel.name, visibility, kind, members, owner })}
    >
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
            {channel.name}
          </Text>
          {!channel.isPublic ? <Chip label={visibility} tone="neutral" /> : null}
          <View style={styles.flex} />
          {time && !trailing ? <Text style={[styles.rowTime, { color: c.textLabel }]}>{time}</Text> : null}
        </View>
        <Text style={[styles.rowMeta, { color: c.tintText }]} numberOfLines={1}>
          {kind} ・ {members}
        </Text>
        <Text style={[styles.rowOwner, { color: c.textMuted }]} numberOfLines={1}>
          {owner}
        </Text>
        {channel.description ? (
          <Text style={[styles.rowDesc, { color: c.textMuted }]} numberOfLines={1}>
            {channel.description}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md - 4,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: 14,
    height: touchTarget.min,
    borderRadius: borderRadius.pill,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 0,
  },
  list: {
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  rowTitle: {
    flexShrink: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  rowTime: {
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  rowMeta: {
    fontSize: fontSize.xs,
  },
  rowOwner: {
    fontSize: fontSize.xs,
  },
  rowStatus: {
    fontSize: fontSize.xs,
  },
  rowDesc: {
    fontSize: fontSize.sm,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md - 4,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
