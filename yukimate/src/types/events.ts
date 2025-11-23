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
};

// Extended event type for discover/swipe feature
export type DiscoverEvent = {
  id: string;
  title: string;
  description: string | null;
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
};

// Event filter options
export type EventFilterOptions = {
  category?: string;
  level?: SkillLevel;
  resortId?: string;
  limit?: number;
};
