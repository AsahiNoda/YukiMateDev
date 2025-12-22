/**
 * Supabase Database Type Definitions
 * 実際のスキーマに基づいた型定義
 */

// ==========================================
// Enums (カスタム型)
// ==========================================
export type VisibilityGrade = 'good' | 'moderate' | 'poor';
export type SnowQuality = 'powder' | 'packed' | 'slushy' | 'icy';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type PostType = 'snow' | 'spot' | 'access';
export type EventStatus = 'open' | 'closed' | 'cancelled' | 'full';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'user' | 'official' | 'developer';

// ==========================================
// Database Tables
// ==========================================

export interface User {
  id: string; // uuid
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface Resort {
  id: string; // uuid
  name: string;
  name_en: string | null; // English resort name
  area: string; // 日本語の県名（例：「長野県」）
  region: string | null; // 地方名（例：「中部」）※将来的に英語県名に移行予定
  latitude: number | null;
  longitude: number | null;
  official_site_url: string | null;
  pricing_url: string | null;
  night_ski: boolean;
  difficulty_dist: Record<string, number> | null; // jsonb
  map_image_url: string | null;
  searchable: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface WeatherDailyCache {
  id: string; // uuid
  resort_id: string; // uuid
  date: string; // date
  temp_c: number | null;
  new_snow_cm: number | null;
  base_depth_cm: number | null;
  wind_ms: number | null;
  visibility: VisibilityGrade | null;
  snow_quality: SnowQuality | null;
  source: string | null;
  fetched_at: string | null; // timestamptz
}

export interface ResortRatingSummary {
  resort_id: string; // uuid (primary key)
  powder_avg: number | null;
  carving_avg: number | null;
  family_avg: number | null;
  park_avg: number | null;
  night_avg: number | null;
  overall_avg: number | null;
  votes_count: number; // int4
  refreshed_at: string | null; // timestamptz
}

export interface Profile {
  user_id: string; // uuid (primary key)
  display_name: string | null;
  avatar_url: string | null;
  header_url: string | null;
  country_code: string | null;
  languages: string[] | null;
  level: SkillLevel | null;
  styles: string[] | null;
  bio: string | null;
  home_resort_id: string | null; // uuid
  created_at: string;
  updated_at: string | null;
}

export interface Event {
  id: string; // uuid
  title: string;
  description: string | null;
  type: string; // event type (from schema)
  resort_id: string | null; // uuid
  host_user_id: string; // uuid
  start_at: string; // timestamptz
  end_at: string | null; // timestamptz
  capacity_total: number | null;
  level_required: SkillLevel | null; // from schema
  status: EventStatus;
  photos: string[] | null;
  tags: string[] | null;
  price_per_person_jpy: number | null;
  meeting_place: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface FeedPost {
  id: string; // uuid
  user_id: string; // uuid
  resort_id: string | null; // uuid
  type: PostType;
  text: string | null;
  tags: string[] | null;
  photos: string[] | null;
  created_at: string;
}

export interface Gear {
  user_id: string; // uuid (primary key)
  board: string | null;
  binding: string | null;
  boots: string | null;
  others: Record<string, any> | null; // jsonb
  updated_at: string | null;
}

export interface EventParticipant {
  id: string; // uuid
  event_id: string; // uuid
  user_id: string; // uuid
  joined_at: string; // timestamptz
  left_at: string | null; // timestamptz
}

export interface EventApplication {
  id: string; // uuid
  event_id: string; // uuid
  applicant_user_id: string; // uuid
  status: ApplicationStatus;
  message: string | null;
  created_at: string; // timestamptz
  updated_at: string | null; // timestamptz
}

// Phase 7: Chat-related types
export type MessageType = 'text' | 'image';

export interface EventChat {
  id: string; // uuid
  event_id: string; // uuid
  created_at: string; // timestamptz
  updated_at: string | null; // timestamptz
}

export interface EventMessage {
  id: string; // uuid
  chat_id: string; // uuid
  sender_user_id: string; // uuid
  content_text: string | null;
  content_image_url: string | null;
  created_at: string; // timestamptz
}

export interface Star {
  id: string; // uuid
  user_id: string; // uuid
  target_user_id: string; // uuid
  created_at: string; // timestamptz
}

export interface Block {
  id: string; // uuid
  user_id: string; // uuid
  blocked_user_id: string; // uuid
  created_at: string; // timestamptz
}

// ==========================================
// Supabase Response Types (with relations)
// ==========================================

export interface ResortWithWeather extends Resort {
  weather_daily_cache: WeatherDailyCache[];
  resort_rating_summary: ResortRatingSummary | null;
}

export interface EventWithDetails extends Event {
  resorts: Pick<Resort, 'id' | 'name' | 'name_en' | 'area'> | null;
  profiles: Pick<Profile, 'user_id' | 'display_name' | 'avatar_url' | 'country_code' | 'level'> | null;
}

export interface FeedPostWithDetails extends FeedPost {
  resorts: Pick<Resort, 'id' | 'name' | 'name_en'> | null;
  profiles: Pick<Profile, 'user_id' | 'display_name' | 'avatar_url'> | null;
}

export interface EventMessageWithSender extends EventMessage {
  sender: {
    id: string;
    profiles: Pick<Profile, 'user_id' | 'display_name' | 'avatar_url'>;
  } | null;
}

export interface EventChatWithDetails extends EventChat {
  posts_events: Pick<Event, 'id' | 'title' | 'start_at'> & {
    resorts: Pick<Resort, 'id' | 'name' | 'name_en'> | null;
  } | null;
}

// ==========================================
// Query Result Types
// ==========================================

export interface WeatherSummaryResult {
  resortName: string;
  description: string;
  temperatureC: number;
  newSnowCm: number;
  snowDepthCm: number;
  windSpeedMs: number;
}

export interface EventSummaryResult {
  id: string;
  title: string;
  resortName: string;
  startAt: string;
  endAt: string;
  capacityTotal: number;
  spotsTaken: number;
  levelRequired: SkillLevel | null;
  pricePerPersonJpy: number;
}

// ==========================================
// Helper: Supabase Client Type
// ==========================================

import { createClient } from '@supabase/supabase-js';

export type SupabaseClient = ReturnType<typeof createClient<Database>>;

// Full database schema type
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'role'> & {
          id?: string;
          created_at?: string;
          role?: UserRole;
        };
        Update: Partial<Omit<User, 'id'>>;
      };
      resorts: {
        Row: Resort;
        Insert: Omit<Resort, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Resort, 'id'>>;
      };
      weather_daily_cache: {
        Row: WeatherDailyCache;
        Insert: Omit<WeatherDailyCache, 'id' | 'fetched_at'> & {
          id?: string;
          fetched_at?: string;
        };
        Update: Partial<Omit<WeatherDailyCache, 'id'>>;
      };
      resort_rating_summary: {
        Row: ResortRatingSummary;
        Insert: Omit<ResortRatingSummary, 'refreshed_at'> & {
          refreshed_at?: string;
        };
        Update: Partial<ResortRatingSummary>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'user_id'>>;
      };
      posts_events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Event, 'id'>>;
      };
      feed_posts: {
        Row: FeedPost;
        Insert: Omit<FeedPost, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<FeedPost, 'id'>>;
      };
      gear: {
        Row: Gear;
        Insert: Omit<Gear, 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Gear, 'user_id'>>;
      };
      event_participants: {
        Row: EventParticipant;
        Insert: Omit<EventParticipant, 'id' | 'joined_at'> & {
          id?: string;
          joined_at?: string;
        };
        Update: Partial<Omit<EventParticipant, 'id' | 'event_id' | 'user_id'>>;
      };
      event_applications: {
        Row: EventApplication;
        Insert: Omit<EventApplication, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<EventApplication, 'id' | 'event_id' | 'applicant_user_id'>>;
      };
    };
    Views: {
      // ビューがある場合はここに追加
    };
    Functions: {
      // カスタム関数がある場合はここに追加
    };
    Enums: {
      visibility_grade: VisibilityGrade;
      snow_quality: SnowQuality;
      skill_level: SkillLevel;
      post_type: PostType;
      event_status: EventStatus;
      application_status: ApplicationStatus;
      user_role: UserRole;
    };
  };
}