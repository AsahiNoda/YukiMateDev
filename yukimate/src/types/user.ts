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
  homeResortId: string | null;
  homeResortName: string | null;
  gear: UserGear | null;
  stats: UserStats;
  recentEvents: RecentEvent[];
  recentPosts: RecentPost[];
};
