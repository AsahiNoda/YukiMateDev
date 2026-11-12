/**
 * User and Profile-related type definitions
 */

import type { SkillLevel } from './common';

// User gear information
export type UserGear = {
  board: string | null;
  binding: string | null;
  boots: string | null;
  others: Record<string, any> | null;
};

// User statistics
export type UserStats = {
  eventsJoined: number;
  postsCount: number;
  starsReceived: number;
};

// お気に入りスキー場
export type FavoriteResortSummary = {
  id: string;
  name: string;
};

// よく行くゲレンデ（イベント実績から集計した Top3）
export type TopResort = {
  id: string;
  name: string;
  count: number;
};

// SNSリンク（ハンドル/URLを種類別に保持）
export type SocialLinks = {
  instagram?: string;
  x?: string;
  youtube?: string;
  tiktok?: string;
};

// Recent event summary
export type RecentEvent = {
  id: string;
  title: string;
  resortName: string | null;
  startAt: string;
};

// Recent post summary
export type RecentPost = {
  id: string;
  text: string | null;
  resortName: string | null;
  createdAt: string;
};

// User role type
export type UserRole = 'user' | 'developer' | 'official';

// Complete user profile data
export type ProfileData = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  countryCode: string | null;
  languages: string[];
  level: SkillLevel | null;
  styles: string[];
  bio: string | null;
  favoriteResorts: FavoriteResortSummary[];
  topResorts: TopResort[];
  socialLinks: SocialLinks;
  gear: UserGear | null;
  stats: UserStats;
  recentEvents: RecentEvent[];
  recentPosts: RecentPost[];
  headerUrl: string | null;
  role: UserRole;
};
