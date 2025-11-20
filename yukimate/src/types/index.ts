/**
 * Central type definitions export
 * Import types using: import type { TypeName } from '@types'
 */

// Common types
export type { SkillLevel, LoadingState, ErrorState, SuccessState, ApiState } from './common';

// Database types
export type {
  ApplicationStatus,
  EventParticipant,
  EventApplication,
} from '@/lib/database.types';

// Event types
export type { HomeEvent, DiscoverEvent, EventFilterOptions } from './events';

// User/Profile types
export type {
  UserGear,
  UserStats,
  RecentEvent,
  RecentPost,
  ProfileData,
} from './user';

// Weather types
export type { WeatherSummary, ResortRating } from './weather';

// Chat types
export type { EventMessage, EventChat } from './chat';

// Social/Feed types
export type {
  PostType,
  SnowfeedPost,
  SimplePost,
  ResortRating as SocialResortRating, // Alias to avoid conflict with weather.ts
  SnowfeedWeather,
  SnowfeedData,
} from './social';

export type RootStackParamList = {
  Auth: undefined;
  ProfileSetup: undefined;
  Main: undefined;
  EditProfile: undefined;
  EventDetail: { eventId: string };
  EventChat: { eventId: string; roomId: string };
  CreateEvent: undefined;
  UserProfile: { userId: string };
  ResortDetail: { resortId: number };
};