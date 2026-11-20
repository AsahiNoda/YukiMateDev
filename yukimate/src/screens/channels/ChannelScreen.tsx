import { useMarkChatRead } from '@/hooks/useUnreadCounts';
import { RemovablePhoto } from '@/components/ui/RemovablePhoto';
import { ChannelPostSheet, formatChannelTime, ReactionPills } from '@/components/channels/ChannelParts';
import { ImageViewer } from '@/components/ImageViewer';
import { ReportSheet } from '@/components/ReportSheet';
import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import {
  canDeleteChannelPost,
  canPostInChannel,
  channelErrorKey,
  channelKindLabelKey,
  CHANNEL_MEDIA_MAX,
  CHANNEL_POST_MAX,
  uploadChannelImage,
  useChannel,
  useChannelActions,
  useChannelPosts,
  type ChannelKind,
  type ChannelMedia,
  type ChannelPost,
  type ChannelReaction,
} from '@/hooks/useChannels';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PickedImage = { uri: string; width?: number; height?: number };

/** チャットの吹き出しの中の写真の幅 */
const BUBBLE_IMAGE_WIDTH = 220;

/** 写真の高さ：縦長・横長どちらも、極端な比率は切り詰める */
const imageHeightFor = (media: ChannelMedia, width: number) => {
  const ratio = media.width && media.height ? media.height / media.width : 0.75;
  return Math.round(width * Math.min(Math.max(ratio, 0.5), 1.4));
};

/**
 * テーマ別チャンネルの画面。種類で中身が変わる：
 *   chat          … 吹き出しのチャット（下が新しい）
 *   media_only    … 写真だけのチャット（吹き出し・下が新しい。チャットと同じ並び）
 *   reaction_only … お知らせのフィード。メンバーは絵文字を押すだけ
 * 投稿の長押しでリアクション・通報・削除。参加していない人は読むだけ（下に「参加する」）。
 * プライベートは参加していないと中身が見えない（下に「参加をリクエスト」）。
 */
export default function ChannelScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { channelId } = useLocalSearchParams<{ channelId: string }>();

  const detail = useChannel(channelId);
  const posts = useChannelPosts(channelId);
  const actions = useChannelActions();

  const channel = detail.data?.channel;
  const role = detail.data?.myRole ?? null;
  const isArchived = !!channel?.archivedAt;
  const kind: ChannelKind = channel?.kind ?? 'chat';
  const canPost = !isArchived && canPostInChannel(kind, role);
  const canReact = !isArchived && !!role;
  // プライベートでメンバーでない：投稿は RLS で返ってこないので、空ではなく案内を出す
  const locked = !!channel && !channel.isPublic && !role;
  const requestStatus = detail.data?.requestStatus ?? null;

  const [menuPost, setMenuPost] = useState<ChannelPost | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);

  // 未読：開いている間は、投稿が増えるたびと閉じるときに「ここまで読んだ」にする
  const markRead = useMarkChatRead('channel', channelId);
  const postCount = posts.data?.length ?? 0;
  useEffect(() => {
    if (role) markRead();
  }, [postCount, role, markRead]);
  useEffect(() => () => {
    markRead();
  }, [markRead]);

  // 入力欄をキーボードの真上に（EventChatScreen と同じやり方）
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      if (Platform.OS === 'android') setAndroidKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setAndroidKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const list = posts.data ?? [];

  const toggleReaction = async (post: ChannelPost, emoji: ChannelReaction) => {
    try {
      await actions.toggleReaction(post, emoji);
    } catch (error) {
      Alert.alert(t('common.error'), t(channelErrorKey(error)));
    }
  };

  const pickImages = async () => {
    const remaining = CHANNEL_MEDIA_MAX - images.length;
    if (remaining <= 0) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('postModal.permissionError'), t('postModal.photoLibraryAccess'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    setImages((prev) =>
      [...prev, ...result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }))].slice(0, CHANNEL_MEDIA_MAX)
    );
  };

  const handleSend = async () => {
    if (!channelId || !actions.userId || sending) return;
    const body = kind === 'media_only' ? '' : text.trim();
    if (!body && images.length === 0) return;
    setSending(true);
    try {
      const media: ChannelMedia[] = [];
      for (const image of images) {
        media.push(await uploadChannelImage(actions.userId, channelId, image));
      }
      await actions.sendPost(channelId, body, media);
      setText('');
      setImages([]);
    } catch (error) {
      Alert.alert(t('common.error'), t(channelErrorKey(error)));
    } finally {
      setSending(false);
    }
  };

  const handleJoin = async () => {
    if (!channelId) return;
    setJoining(true);
    try {
      await actions.joinChannel(channelId);
    } catch (error) {
      Alert.alert(t('common.error'), t(channelErrorKey(error)));
    } finally {
      setJoining(false);
    }
  };

  const handleRequest = async () => {
    if (!channelId) return;
    setJoining(true);
    try {
      await actions.requestJoin(channelId);
      Alert.alert(t('channels.requestSent'), t('channels.requestSentText', { name: channel?.name ?? '' }));
    } catch (error) {
      Alert.alert(t('common.error'), t(channelErrorKey(error)));
    } finally {
      setJoining(false);
    }
  };

  const handleCancelRequest = () => {
    if (!channelId) return;
    Alert.alert(t('channels.cancelRequest'), t('channels.cancelRequestConfirm', { name: channel?.name ?? '' }), [
      { text: t('common.back'), style: 'cancel' },
      {
        text: t('channels.cancelRequest'),
        style: 'destructive',
        onPress: async () => {
          setJoining(true);
          try {
            await actions.cancelRequest(channelId);
          } catch (error) {
            Alert.alert(t('common.error'), t(channelErrorKey(error)));
          } finally {
            setJoining(false);
          }
        },
      },
    ]);
  };

  const confirmDelete = (post: ChannelPost) => {
    setMenuPost(null);
    Alert.alert(t('channels.deletePost'), t('channels.deletePostConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await actions.deletePost(post.channelId, post.id);
          } catch (error) {
            Alert.alert(t('common.error'), t(channelErrorKey(error)));
          }
        },
      },
    ]);
  };

  const openUser = (userId: string) => router.push(`/user/${userId}` as any);

  // ---------- 投稿の描画（種類ごと） ----------

  const renderBubble = ({ item }: { item: ChannelPost }) => {
    const own = item.userId === actions.userId;
    return (
      <View style={[styles.messageRow, own ? styles.ownRow : styles.otherRow]}>
        {!own ? (
          <Pressable onPress={() => openUser(item.userId)} accessibilityRole="button" accessibilityLabel={item.authorName}>
            <Image source={item.authorAvatar ? { uri: item.authorAvatar } : undefined} style={[styles.avatar, { backgroundColor: c.chipBackground }]} />
          </Pressable>
        ) : null}
        <View style={[styles.messageContent, own && styles.ownContent]}>
          {!own ? (
            <Text style={[styles.senderName, { color: c.textMuted }]} onPress={() => openUser(item.userId)} accessibilityRole="link">
              {item.authorName}
            </Text>
          ) : null}
          <Pressable
            onLongPress={() => setMenuPost(item)}
            delayLongPress={300}
            accessibilityHint={t('channels.postMenuTitle')}
            style={[
              styles.bubble,
              own ? { backgroundColor: c.primaryButton, borderBottomRightRadius: borderRadius.sm } : { backgroundColor: c.chipBackground, borderBottomLeftRadius: borderRadius.sm },
              item.media.length > 0 && !item.body && styles.bubbleMediaOnly,
            ]}
          >
            {item.media.map((media, i) => (
              <Pressable
                key={`${item.id}_${i}`}
                onPress={() => setViewerUrl(media.url)}
                onLongPress={() => setMenuPost(item)}
                accessibilityRole="imagebutton"
                accessibilityLabel={t('channels.photoA11y', { name: item.authorName })}
              >
                <Image
                  source={{ uri: media.url }}
                  style={[styles.bubbleImage, { width: BUBBLE_IMAGE_WIDTH, height: imageHeightFor(media, BUBBLE_IMAGE_WIDTH) }]}
                  contentFit="cover"
                />
              </Pressable>
            ))}
            {item.body ? (
              <Text style={[styles.bubbleText, { color: own ? c.primaryButtonText : c.text }]}>{item.body}</Text>
            ) : null}
          </Pressable>
          <ReactionPills post={item} canReact={canReact} onToggle={(emoji) => toggleReaction(item, emoji)} />
          <Text style={[styles.time, { color: c.textLabel, textAlign: own ? 'right' : 'left' }]}>
            {formatChannelTime(item.createdAt, t)}
          </Text>
        </View>
      </View>
    );
  };

  const renderFeedCard = ({ item }: { item: ChannelPost }) => {
    const cardWidth = windowWidth - spacing.md * 2 - 28;
    return (
      <Pressable
        onLongPress={() => setMenuPost(item)}
        delayLongPress={300}
        style={[styles.feedCard, { backgroundColor: c.backgroundSecondary }]}
      >
        <View style={styles.feedHeader}>
          <Pressable onPress={() => openUser(item.userId)} style={styles.feedAuthor} accessibilityRole="button">
            <Image source={item.authorAvatar ? { uri: item.authorAvatar } : undefined} style={[styles.avatar, { backgroundColor: c.chipBackground }]} />
            <Text style={[styles.feedName, { color: c.text }]} numberOfLines={1}>
              {item.authorName}
            </Text>
          </Pressable>
          <Text style={[styles.time, { color: c.textLabel }]}>{formatChannelTime(item.createdAt, t)}</Text>
          <Pressable
            onPress={() => setMenuPost(item)}
            hitSlop={8}
            style={styles.feedMore}
            accessibilityRole="button"
            accessibilityLabel={t('channels.postMenuTitle')}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={c.textLabel} />
          </Pressable>
        </View>
        {item.body ? <Text style={[styles.feedBody, { color: c.text }]}>{item.body}</Text> : null}
        {item.media.map((media, i) => (
          <Pressable
            key={`${item.id}_${i}`}
            onPress={() => setViewerUrl(media.url)}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('channels.photoA11y', { name: item.authorName })}
          >
            <Image
              source={{ uri: media.url }}
              style={[styles.feedImage, { height: imageHeightFor(media, cardWidth), backgroundColor: c.chipBackground }]}
              contentFit="cover"
            />
          </Pressable>
        ))}
        <ReactionPills post={item} canReact={canReact} showAll={canReact} onToggle={(emoji) => toggleReaction(item, emoji)} />
      </Pressable>
    );
  };

  const empty = (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: c.text }]}>{t('channels.noPosts')}</Text>
      {canPost ? <Text style={[styles.emptyText, { color: c.chipText }]}>{t('channels.noPostsMember')}</Text> : null}
    </View>
  );

  // ---------- 下の帯（入力欄・参加・お知らせ） ----------

  const bottomPadding = spacing.sm + (keyboardVisible ? 0 : insets.bottom);

  const renderFooter = () => {
    if (!channel) return null;
    if (isArchived) return <FooterNotice text={t('channels.archived')} paddingBottom={bottomPadding} />;
    if (!role) {
      if (detail.data?.banned) return <FooterNotice text={t('channels.banned')} paddingBottom={bottomPadding} />;
      if (!channel.isPublic) {
        if (requestStatus === 'rejected') {
          return <FooterNotice text={t('channels.requestRejected')} paddingBottom={bottomPadding} />;
        }
        return (
          <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.divider, paddingBottom: bottomPadding }]}>
            {requestStatus === 'pending' ? (
              <PillButton
                title={t('channels.requestPendingLong')}
                variant="secondary"
                onPress={handleCancelRequest}
                loading={joining}
                fill
                testID="channel-request-pending"
              />
            ) : (
              <PillButton title={t('channels.requestJoin')} onPress={handleRequest} loading={joining} fill testID="channel-request" />
            )}
          </View>
        );
      }
      return (
        <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.divider, paddingBottom: bottomPadding }]}>
          <PillButton title={t('channels.join')} onPress={handleJoin} loading={joining} fill testID="channel-join" />
        </View>
      );
    }
    if (!canPost) return <FooterNotice text={t('channels.reactionOnlyNotice')} paddingBottom={bottomPadding} />;

    return (
      <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.divider, paddingBottom: bottomPadding }]}>
        {images.length > 0 ? (
          <View style={styles.previews}>
            {images.map((image, i) => (
              <RemovablePhoto
                key={`${image.uri}_${i}`}
                uri={image.uri}
                onRemove={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                removeLabel={t('common.removePhoto')}
              />
            ))}
          </View>
        ) : null}
        {kind === 'media_only' ? (
          <View style={styles.composer}>
            <PillButton
              title={t('channels.postPhoto')}
              icon="image-outline"
              variant="secondary"
              onPress={pickImages}
              disabled={sending || images.length >= CHANNEL_MEDIA_MAX}
              fill
            />
            {images.length > 0 ? (
              <PillButton title={t('channels.send')} onPress={handleSend} loading={sending} disabled={sending} />
            ) : null}
          </View>
        ) : (
          <View style={styles.composer}>
            <Pressable
              onPress={pickImages}
              disabled={sending || images.length >= CHANNEL_MEDIA_MAX}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={t('channels.addPhoto')}
            >
              <Ionicons name="image-outline" size={24} color={c.textMuted} />
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('channels.messagePlaceholder')}
              placeholderTextColor={c.textLabel}
              style={[styles.input, { backgroundColor: c.backgroundSecondary, color: c.text }]}
              multiline
              maxLength={CHANNEL_POST_MAX}
              accessibilityLabel={t('channels.messagePlaceholder')}
              testID="channel-input"
            />
            <Pressable
              onPress={handleSend}
              disabled={sending || (!text.trim() && images.length === 0)}
              style={[
                styles.sendButton,
                { backgroundColor: text.trim() || images.length > 0 ? c.primaryButton : c.chipBackground },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('channels.send')}
              testID="channel-send"
            >
              {sending ? (
                <ActivityIndicator size="small" color={c.primaryButtonText} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={text.trim() || images.length > 0 ? c.primaryButtonText : c.textLabel} />
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  // ---------- 画面 ----------

  const loading = detail.isPending || (!!channel && posts.isPending);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: androidKeyboardHeight }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS === 'ios'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.headerName, { color: c.text }]} numberOfLines={1} accessibilityRole="header">
            {channel?.name ?? ''}
          </Text>
          {channel ? (
            <Text style={[styles.headerMeta, { color: c.textMuted }]} numberOfLines={1}>
              {channel.isPublic ? '' : `${t('channels.visibilityPrivate')} ・ `}
              {t(channelKindLabelKey(channel.kind))} ・ {t('channels.memberCount', { count: channel.memberCount })}
            </Text>
          ) : null}
        </View>
        {channel ? (
          <Pressable
            onPress={() => router.push({ pathname: '/channel-info/[channelId]', params: { channelId: channel.id } } as any)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('channels.info')}
            testID="channel-info"
          >
            <Ionicons name="information-circle-outline" size={24} color={c.text} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.flex} color={c.tint} />
      ) : !channel ? (
        <View style={[styles.flex, styles.empty]}>
          <Text style={[styles.emptyTitle, { color: c.text }]}>{t('channels.notFound')}</Text>
        </View>
      ) : locked ? (
        <View style={[styles.flex, styles.empty]}>
          <Text style={[styles.emptyTitle, { color: c.text }]}>{t('channels.privateTitle')}</Text>
          <Text style={[styles.emptyText, { color: c.chipText }]}>{t('channels.privateText')}</Text>
        </View>
      ) : posts.isError ? (
        <View style={[styles.flex, styles.empty]}>
          <Text style={[styles.emptyText, { color: c.chipText }]}>{t('channels.actionFailed')}</Text>
          <PillButton title={t('common.retry')} icon="refresh" variant="secondary" onPress={() => posts.refetch()} />
        </View>
      ) : kind === 'reaction_only' ? (
        <FlatList
          key="feed"
          style={styles.flex}
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedList}
          renderItem={renderFeedCard}
          ListEmptyComponent={empty}
        />
      ) : (
        <FlatList
          key="chat"
          style={styles.flex}
          data={list}
          // 空のときは inverted を外す（「まだ投稿はありません」が逆さまにならないように）
          inverted={list.length > 0}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          renderItem={renderBubble}
          ListEmptyComponent={empty}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {renderFooter()}

      <ChannelPostSheet
        post={menuPost}
        canReact={canReact}
        canDelete={!!menuPost && canDeleteChannelPost(menuPost, actions.userId, role)}
        canReport={!!menuPost && menuPost.userId !== actions.userId}
        onReact={(emoji) => {
          const post = menuPost;
          setMenuPost(null);
          if (post) toggleReaction(post, emoji);
        }}
        onDelete={() => menuPost && confirmDelete(menuPost)}
        onReport={() => {
          const id = menuPost?.id ?? null;
          setMenuPost(null);
          setReportPostId(id);
        }}
        onClose={() => setMenuPost(null)}
      />
      <ReportSheet
        visible={!!reportPostId}
        targetType="channel_post"
        targetId={reportPostId}
        onClose={() => setReportPostId(null)}
      />
      <ImageViewer visible={!!viewerUrl} imageUrl={viewerUrl ?? ''} onClose={() => setViewerUrl(null)} />
    </KeyboardAvoidingView>
  );
}

function FooterNotice({ text, paddingBottom }: { text: string; paddingBottom: number }) {
  const c = useAppColors();
  return (
    <View style={[styles.footer, { backgroundColor: c.card, borderTopColor: c.divider, paddingBottom }]}>
      <Text style={[styles.notice, { color: c.textMuted }]}>{text}</Text>
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
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  headerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  headerMeta: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  iconButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginVertical: 4,
  },
  ownRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
  },
  messageContent: {
    maxWidth: '78%',
    alignItems: 'flex-start',
  },
  ownContent: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: borderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
    overflow: 'hidden',
  },
  bubbleMediaOnly: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bubbleImage: {
    borderRadius: borderRadius.card,
  },
  bubbleText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  time: {
    fontSize: fontSize.xxs,
    marginTop: 2,
    marginHorizontal: 4,
  },
  feedList: {
    padding: spacing.md,
    gap: spacing.md - 4,
  },
  feedCard: {
    borderRadius: borderRadius.card,
    padding: 14,
    gap: spacing.sm,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedAuthor: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedName: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  feedMore: {
    padding: 4,
  },
  feedBody: {
    fontSize: fontSize.md,
    lineHeight: 23,
  },
  feedImage: {
    width: '100%',
    borderRadius: borderRadius.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md - 4,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  notice: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: borderRadius.glass,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: fontSize.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: 4,
  },
  previews: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 4,
  },
});
