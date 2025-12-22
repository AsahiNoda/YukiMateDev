/**
 * Event-related type definitions
 */

import type { SkillLevel } from './common';

// Base event type for home screen
export type HomeEvent = {
  id: string;
  title: string;
  resortName: string;
  startAt: string;
  endAt: string;
  capacityTotal: number;
  spotsTaken: number;
  levelRequired: SkillLevel;
  pricePerPersonJpy: number;
  isOfficial?: boolean;
  photoUrl: string | null;
  hostRole?: string;
  resortArea?: string;
  resortRegion?: string | null;
};

// Extended event type for discover/swipe feature
export type DiscoverEvent = {
  id: string;
  title: string;
  description: string | null;
  category: 'event' | 'lesson' | 'filming' | 'group';
  hostName: string;
  hostAvatar: string | null;
  resortName: string;
  startAt: string;
  endAt: string | null;
  capacityTotal: number;
  spotsTaken: number;
  levelRequired: SkillLevel | null;
  pricePerPersonJpy: number | null;
  meetingPlace: string | null;
  tags: string[];
  photoUrl: string | null; // 下位互換性のため残す（最初の画像）
  photoUrls: string[]; // 全画像のURL配列
  hostUserId: string;
  hostRole: string;
  isHostStarred?: boolean; // ホストが★登録されているか
  starredParticipants?: string[]; // ★登録された参加者のユーザーID配列
};

// Event filter options
export type EventFilterOptions = {
  category?: 'event' | 'lesson' | 'filming' | 'group';
  level?: SkillLevel;
  resortId?: string;
  limit?: number;
};
