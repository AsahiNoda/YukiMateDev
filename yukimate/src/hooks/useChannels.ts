import { useAuth } from '@/contexts/AuthContext';
import { uploadChatImage } from '@/lib/chatImageUpload';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * テーマ別チャンネル（イベントとは別の、誰でも開設できるチャット）。
 * スキーマ・RLS：supabase/migrations/20261122000000_theme_channels.sql
 * オープン／プライベートと参加リクエスト：supabase/migrations/20261124000000_private_channels.sql
 */

export type ChannelKind = 'chat' | 'media_only' | 'reaction_only';
export type ChannelRole = 'owner' | 'moderator' | 'member';

export const CHANNEL_KINDS: ChannelKind[] = ['chat', 'media_only', 'reaction_only'];
/** リアクションに使える絵文字（DB の CHECK 制約と同じ） */
export const CHANNEL_REACTIONS = ['👍', '❤️', '😂', '😮', '🙌', '❄️'] as const;
export type ChannelReaction = (typeof CHANNEL_REACTIONS)[number];
/** 1人が開設できる数（DB のトリガーと同じ） */
export const CHANNEL_OWN_LIMIT = 3;
export const CHANNEL_NAME_MAX = 40;
export const CHANNEL_DESCRIPTION_MAX = 300;
export const CHANNEL_POST_MAX = 2000;
/** 1投稿の写真の上限（DB の CHECK 制約と同じ） */
export const CHANNEL_MEDIA_MAX = 4;

export const channelKindLabelKey = (kind: ChannelKind) =>
  kind === 'media_only' ? 'channels.kindMediaOnly' : kind === 'reaction_only' ? 'channels.kindReactionOnly' : 'channels.kindChat';

export interface Channel {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  kind: ChannelKind;
  resortId: string | null;
  resortName: string | null;
  /** オーナーの表示名 */
  ownerName: string;
  /** true＝オープン（誰でも参加）／false＝プライベート（リクエストして承認制） */
  isPublic: boolean;
  memberCount: number;
  lastPostAt: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface ChannelMedia {
  url: string;
  width?: number;
  height?: number;
}

export interface ChannelReactionSummary {
  emoji: ChannelReaction;
  count: number;
  mine: boolean;
}

export interface ChannelPost {
  id: string;
  channelId: string;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string | null;
  media: ChannelMedia[];
  createdAt: string;
  reactions: ChannelReactionSummary[];
}

export interface ChannelMember {
  userId: string;
  role: ChannelRole;
  joinedAt: string;
  name: string;
  avatarUrl: string | null;
}

const CHANNEL_FIELDS =
  'id, owner_user_id, name, description, kind, resort_id, is_public, member_count, last_post_at, created_at, archived_at, resorts(name), owner:profiles!channels_owner_user_id_fkey(display_name)';

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

function toChannel(row: any): Channel {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    description: row.description ?? null,
    kind: row.kind,
    resortId: row.resort_id ?? null,
    resortName: one<any>(row.resorts)?.name ?? null,
    ownerName: one<any>(row.owner)?.display_name || 'Unknown',
    isPublic: !!row.is_public,
    memberCount: row.member_count ?? 0,
    lastPostAt: row.last_post_at ?? null,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? null,
  };
}

/** DB のエラー（トリガーの RAISE）を翻訳キーに直す */
export function channelErrorKey(error: unknown): string {
  const message = error instanceof Error ? error.message : (error as any)?.message ?? '';
  if (message.includes('channel_limit_reached')) return 'channels.limitReached';
  if (message.includes('media_only')) return 'channels.mediaOnlyHint';
  if (message.includes('reaction_only')) return 'channels.reactionOnlyNotice';
  if (message.includes('not_a_member')) return 'channels.joinFirst';
  if (message.includes('muted')) return 'channels.muted';
  if (message.includes('request_rejected')) return 'channels.requestRejected';
  if (message.includes('request_not_found')) return 'channels.requestGone';
  if (message.includes('banned') || message.includes('row-level security')) return 'channels.banned';
  return 'channels.actionFailed';
}

/** キャッシュキー。操作のあとに ['channels'] でまとめて取り直す */
export const channelKeys = {
  all: ['channels'] as const,
  mine: (userId?: string) => ['channels', 'mine', userId] as const,
  discover: (search: string) => ['channels', 'discover', search] as const,
  detail: (channelId: string, userId?: string) => ['channels', 'detail', channelId, userId] as const,
  posts: (channelId: string) => ['channels', 'posts', channelId] as const,
  members: (channelId: string) => ['channels', 'members', channelId] as const,
  myRequests: (userId?: string) => ['channels', 'myRequests', userId] as const,
  incoming: (userId?: string) => ['channels', 'incoming', userId] as const,
};

/** 自分が出した参加リクエストの状態 */
export type ChannelRequestStatus = 'pending' | 'approved' | 'rejected';

// ---------- 一覧 ----------

export interface MyChannel {
  channel: Channel;
  role: ChannelRole;
}

/** 参加中のチャンネル（新しく投稿があった順） */
export function useMyChannels() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: channelKeys.mine(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<MyChannel[]> => {
      const { data, error } = await supabase
        .from('channel_members')
        .select(`role, channels!inner(${CHANNEL_FIELDS})`)
        .eq('user_id', userId!);
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => ({ channel: toChannel(one(row.channels)), role: row.role as ChannelRole }))
        .filter((row) => !row.channel.archivedAt)
        .sort((a, b) =>
          (b.channel.lastPostAt ?? b.channel.createdAt).localeCompare(a.channel.lastPostAt ?? a.channel.createdAt)
        );
    },
  });
}

/** 見つける：オープンとプライベートのチャンネル（メンバーが多い順）。名前で絞り込める */
export function useDiscoverChannels(search: string) {
  const term = search.trim();
  return useQuery({
    queryKey: channelKeys.discover(term),
    staleTime: 1000 * 60,
    queryFn: async (): Promise<Channel[]> => {
      let query = supabase
        .from('channels')
        .select(CHANNEL_FIELDS)
        .is('archived_at', null)
        .order('member_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (term) query = query.ilike('name', `%${term.replace(/[%_]/g, '')}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(toChannel);
    },
  });
}

/** 自分が出した参加リクエスト（チャンネルID → 状態）。「見つける」のボタンの出し分けに使う */
export function useMyChannelRequests() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: channelKeys.myRequests(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<Map<string, ChannelRequestStatus>> => {
      const { data, error } = await supabase.from('channel_join_requests').select('channel_id, status').eq('user_id', userId!);
      if (error) throw error;
      return new Map((data ?? []).map((row: any) => [row.channel_id as string, row.status as ChannelRequestStatus]));
    },
  });
}

export interface IncomingChannelRequest {
  channelId: string;
  channelName: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

/**
 * 自分がオーナー・モデレーターのチャンネルに届いている参加リクエスト（未対応のもの）。
 * チャットタブの「リクエスト」にイベントの申請と並べて出す。
 */
export function useIncomingChannelRequests() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const channelName = useRef(`channel_requests_${Math.random().toString(36).slice(2)}`).current;

  const query = useQuery({
    queryKey: channelKeys.incoming(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<IncomingChannelRequest[]> => {
      // RLS で「自分の分」と「自分が管理するチャンネルの分」だけが返る。自分の分は除く
      const { data, error } = await supabase
        .from('channel_join_requests')
        .select(
          'channel_id, user_id, created_at, channels!inner(name, archived_at), profiles!channel_join_requests_user_id_fkey(display_name, avatar_url)'
        )
        .eq('status', 'pending')
        .neq('user_id', userId!)
        .is('channels.archived_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => {
        const profile = one<any>(row.profiles);
        return {
          channelId: row.channel_id,
          channelName: one<any>(row.channels)?.name ?? '',
          userId: row.user_id,
          name: profile?.display_name || 'Unknown',
          avatarUrl: profile?.avatar_url ?? null,
          createdAt: row.created_at,
        };
      });
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_join_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: channelKeys.incoming(userId) });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, channelName, queryClient]);

  return query;
}

// ---------- 1つのチャンネル ----------

export interface ChannelDetail {
  channel: Channel;
  /** 自分の役割（参加していなければ null） */
  myRole: ChannelRole | null;
  /** 外されていて参加できない */
  banned: boolean;
  /** 自分の参加リクエスト（プライベート。出していなければ null） */
  requestStatus: ChannelRequestStatus | null;
}

export function useChannel(channelId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: channelKeys.detail(channelId ?? '', userId),
    enabled: !!channelId && !!userId,
    queryFn: async (): Promise<ChannelDetail | null> => {
      const [channelRes, memberRes, banRes, requestRes] = await Promise.all([
        supabase.from('channels').select(CHANNEL_FIELDS).eq('id', channelId!).maybeSingle(),
        supabase.from('channel_members').select('role').eq('channel_id', channelId!).eq('user_id', userId!).maybeSingle(),
        supabase.from('channel_bans').select('user_id').eq('channel_id', channelId!).eq('user_id', userId!).maybeSingle(),
        supabase
          .from('channel_join_requests')
          .select('status')
          .eq('channel_id', channelId!)
          .eq('user_id', userId!)
          .maybeSingle(),
      ]);
      if (channelRes.error) throw channelRes.error;
      if (!channelRes.data) return null;
      return {
        channel: toChannel(channelRes.data),
        myRole: (memberRes.data?.role as ChannelRole | undefined) ?? null,
        banned: !!banRes.data,
        requestStatus: (requestRes.data?.status as ChannelRequestStatus | undefined) ?? null,
      };
    },
  });
}

const POSTS_LIMIT = 100;

/** 投稿（新しい順）。ブロックした人の投稿は出さない。Realtime で新しい投稿・リアクションを取り直す */
export function useChannelPosts(channelId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const channelName = useRef(`channel_posts_${Math.random().toString(36).slice(2)}`).current;

  const query = useQuery({
    queryKey: channelKeys.posts(channelId ?? ''),
    enabled: !!channelId && !!userId,
    queryFn: async (): Promise<ChannelPost[]> => {
      const [postsRes, blocksRes] = await Promise.all([
        supabase
          .from('channel_posts')
          .select(
            'id, channel_id, user_id, body, media, created_at, profiles!channel_posts_user_id_fkey(display_name, avatar_url), channel_reactions(emoji, user_id)'
          )
          .eq('channel_id', channelId!)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(POSTS_LIMIT),
        supabase.from('blocks').select('blocked_user_id').eq('user_id', userId!),
      ]);
      if (postsRes.error) throw postsRes.error;
      const blocked = new Set((blocksRes.data ?? []).map((b: any) => b.blocked_user_id as string));

      return (postsRes.data ?? [])
        .filter((row: any) => !blocked.has(row.user_id))
        .map((row: any) => {
          const profile = one<any>(row.profiles);
          const reactions = CHANNEL_REACTIONS.map((emoji) => {
            const list = (row.channel_reactions ?? []).filter((r: any) => r.emoji === emoji);
            return { emoji, count: list.length, mine: list.some((r: any) => r.user_id === userId) };
          }).filter((r) => r.count > 0);
          return {
            id: row.id,
            channelId: row.channel_id,
            userId: row.user_id,
            authorName: profile?.display_name || 'Unknown',
            authorAvatar: profile?.avatar_url ?? null,
            body: row.body ?? null,
            media: Array.isArray(row.media) ? (row.media as ChannelMedia[]).filter((m) => m?.url) : [],
            createdAt: row.created_at,
            reactions,
          };
        });
    },
  });

  useEffect(() => {
    if (!channelId || !userId) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: channelKeys.posts(channelId) });
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_posts', filter: `channel_id=eq.${channelId}` },
        refresh
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_reactions', filter: `channel_id=eq.${channelId}` },
        refresh
      )
      // DELETE は filter が効かないので、届いた行のチャンネルで判定する（REPLICA IDENTITY FULL）
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'channel_reactions' }, (payload: any) => {
        if (payload?.old?.channel_id === channelId) refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, userId, channelName, queryClient]);

  return query;
}

const ROLE_ORDER: Record<ChannelRole, number> = { owner: 0, moderator: 1, member: 2 };

export function useChannelMembers(channelId: string | undefined) {
  return useQuery({
    queryKey: channelKeys.members(channelId ?? ''),
    enabled: !!channelId,
    queryFn: async (): Promise<ChannelMember[]> => {
      const { data, error } = await supabase
        .from('channel_members')
        .select('user_id, role, joined_at, profiles!channel_members_user_id_fkey(display_name, avatar_url)')
        .eq('channel_id', channelId!)
        .order('joined_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? [])
        .map((row: any) => {
          const profile = one<any>(row.profiles);
          return {
            userId: row.user_id,
            role: row.role as ChannelRole,
            joinedAt: row.joined_at,
            name: profile?.display_name || 'Unknown',
            avatarUrl: profile?.avatar_url ?? null,
          };
        })
        .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
    },
  });
}

// ---------- 操作 ----------

/** 写真を縮小して channel_media の「自分のユーザーID/チャンネルID/」の下に置く */
export async function uploadChannelImage(
  userId: string,
  channelId: string,
  asset: { uri: string; width?: number; height?: number }
): Promise<ChannelMedia> {
  return uploadChatImage('channel_media', userId, channelId, asset);
}

/** 書き込みのあとにチャンネル関係のキャッシュを取り直すための関数一式 */
export function useChannelActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const refresh = () => queryClient.invalidateQueries({ queryKey: channelKeys.all });
  /** リクエストの件数はタブのバッジとホームにも出ているので一緒に取り直す */
  const refreshRequests = () => {
    refresh();
    queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
  };

  const requireUser = () => {
    if (!userId) throw new Error('not signed in');
    return userId;
  };

  return {
    userId,

    async createChannel(input: { name: string; description: string; kind: ChannelKind; isPublic: boolean }) {
      const owner = requireUser();
      const { data, error } = await supabase
        .from('channels')
        .insert({
          owner_user_id: owner,
          name: input.name.trim(),
          description: input.description.trim() || null,
          kind: input.kind,
          is_public: input.isPublic,
        })
        .select('id')
        .single();
      if (error) throw error;
      refresh();
      return data.id as string;
    },

    async joinChannel(channelId: string) {
      const me = requireUser();
      const { error } = await supabase.from('channel_members').insert({ channel_id: channelId, user_id: me, role: 'member' });
      if (error && error.code !== '23505') throw error; // 23505 = もう参加している
      refresh();
    },

    /** プライベートのチャンネルに参加をリクエストする */
    async requestJoin(channelId: string) {
      requireUser();
      const { error } = await supabase.rpc('request_channel_join', { p_channel: channelId });
      if (error) throw error;
      refreshRequests();
    },

    /** 自分のリクエストを取り消す（承認・見送りの前だけ） */
    async cancelRequest(channelId: string) {
      const me = requireUser();
      const { data, error } = await supabase
        .from('channel_join_requests')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', me)
        .eq('status', 'pending')
        .select('user_id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('request_not_found');
      refreshRequests();
    },

    /** 届いたリクエストを承認・見送りする（オーナー・モデレーター） */
    async respondRequest(channelId: string, requesterUserId: string, approve: boolean) {
      const { error } = await supabase.rpc('respond_channel_join_request', {
        p_channel: channelId,
        p_user: requesterUserId,
        p_approve: approve,
      });
      if (error) throw error;
      refreshRequests();
    },

    async leaveChannel(channelId: string) {
      const me = requireUser();
      const { data, error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', me)
        .select('user_id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('not left');
      refresh();
    },

    async archiveChannel(channelId: string) {
      const { data, error } = await supabase
        .from('channels')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', channelId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('not archived');
      refresh();
    },

    async sendPost(channelId: string, body: string, media: ChannelMedia[]) {
      const me = requireUser();
      const { error } = await supabase.from('channel_posts').insert({
        channel_id: channelId,
        user_id: me,
        body: body.trim() || null,
        media,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: channelKeys.posts(channelId) });
      queryClient.invalidateQueries({ queryKey: ['channels', 'mine'] });
    },

    async deletePost(channelId: string, postId: string) {
      const { error } = await supabase.rpc('delete_channel_post', { p_post: postId });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: channelKeys.posts(channelId) });
    },

    async toggleReaction(post: ChannelPost, emoji: ChannelReaction) {
      const me = requireUser();
      const mine = post.reactions.find((r) => r.emoji === emoji)?.mine;
      const { error } = mine
        ? await supabase.from('channel_reactions').delete().eq('post_id', post.id).eq('user_id', me).eq('emoji', emoji)
        : await supabase
            .from('channel_reactions')
            // channel_id は DB のトリガーで投稿のチャンネルに合わせ直す
            .insert({ post_id: post.id, user_id: me, emoji, channel_id: post.channelId });
      if (error && error.code !== '23505') throw error;
      queryClient.invalidateQueries({ queryKey: channelKeys.posts(post.channelId) });
    },

    async removeMember(channelId: string, memberUserId: string) {
      const { error } = await supabase.rpc('remove_channel_member', { p_channel: channelId, p_user: memberUserId });
      if (error) throw error;
      refresh();
    },

    async setModerator(channelId: string, memberUserId: string, moderator: boolean) {
      const { data, error } = await supabase
        .from('channel_members')
        .update({ role: moderator ? 'moderator' : 'member' })
        .eq('channel_id', channelId)
        .eq('user_id', memberUserId)
        .select('user_id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('not updated');
      queryClient.invalidateQueries({ queryKey: channelKeys.members(channelId) });
    },
  };
}

/** 投稿を消せるか（本人・オーナー・モデレーター） */
export const canDeleteChannelPost = (post: ChannelPost, userId: string | undefined, role: ChannelRole | null) =>
  !!userId && (post.userId === userId || role === 'owner' || role === 'moderator');

/** このチャンネルで自分が投稿できるか */
export const canPostInChannel = (kind: ChannelKind, role: ChannelRole | null) =>
  !!role && (kind !== 'reaction_only' || role === 'owner' || role === 'moderator');
