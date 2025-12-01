-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.access_official (
  resort_id uuid NOT NULL,
  summary_text text,
  links jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT access_official_pkey PRIMARY KEY (resort_id),
  CONSTRAINT access_official_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id)
);
CREATE TABLE public.access_tips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mode USER-DEFINED,
  time_minutes integer,
  cost_jpy integer,
  text text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT access_tips_pkey PRIMARY KEY (id),
  CONSTRAINT access_tips_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id),
  CONSTRAINT access_tips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blocks_pkey PRIMARY KEY (id),
  CONSTRAINT blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT blocks_blocked_user_id_fkey FOREIGN KEY (blocked_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.event_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  applicant_user_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_applications_pkey PRIMARY KEY (id),
  CONSTRAINT event_applications_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.posts_events(id),
  CONSTRAINT event_applications_applicant_user_id_fkey FOREIGN KEY (applicant_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.event_chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT event_chats_pkey PRIMARY KEY (id),
  CONSTRAINT event_chats_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.posts_events(id)
);
CREATE TABLE public.event_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_user_id uuid NOT NULL,
  content_text text,
  content_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_messages_pkey PRIMARY KEY (id),
  CONSTRAINT event_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.event_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  CONSTRAINT event_participants_pkey PRIMARY KEY (id),
  CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.posts_events(id),
  CONSTRAINT event_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.feed_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feed_comments_pkey PRIMARY KEY (id),
  CONSTRAINT feed_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feed_posts(id),
  CONSTRAINT feed_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.feed_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid,
  user_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  text text,
  tags ARRAY DEFAULT '{}'::text[],
  photos ARRAY DEFAULT '{}'::text[],
  snow_quality USER-DEFINED,
  new_snow_cm integer,
  spot_id uuid,
  access_mode USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feed_posts_pkey PRIMARY KEY (id),
  CONSTRAINT feed_posts_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id),
  CONSTRAINT feed_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT feed_posts_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id)
);
CREATE TABLE public.feed_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'like'::reaction_type,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feed_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT feed_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feed_posts(id),
  CONSTRAINT feed_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.gear (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  board text,
  binding text,
  boots text,
  others jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  board_name text,
  binding_name text,
  boots_name text,
  CONSTRAINT gear_pkey PRIMARY KEY (id),
  CONSTRAINT gear_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.posts_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type USER-DEFINED NOT NULL,
  host_user_id uuid NOT NULL,
  resort_id uuid,
  title text NOT NULL,
  description text,
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone,
  meeting_place text,
  level_required USER-DEFINED,
  capacity_total integer,
  price_per_person_jpy integer,
  photos ARRAY DEFAULT '{}'::text[],
  tags ARRAY DEFAULT '{}'::text[],
  status USER-DEFINED NOT NULL DEFAULT 'open'::event_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT posts_events_pkey PRIMARY KEY (id),
  CONSTRAINT posts_events_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id),
  CONSTRAINT posts_events_host_user_id_fkey1 FOREIGN KEY (host_user_id) REFERENCES public.users(id),
  CONSTRAINT posts_events_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES public.profiles(user_id)
);
CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  display_name text,
  avatar_url text,
  country_code text,
  languages ARRAY DEFAULT '{}'::text[],
  level USER-DEFINED,
  styles ARRAY DEFAULT '{}'::text[],
  bio text,
  home_resort_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  header_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT profiles_home_resort_id_fkey FOREIGN KEY (home_resort_id) REFERENCES public.resorts(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['user'::text, 'event'::text, 'post'::text, 'comment'::text, 'spot'::text])),
  target_id uuid NOT NULL,
  reporter_user_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'reviewed'::text, 'closed'::text])),
  handled_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES public.users(id),
  CONSTRAINT reports_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.users(id)
);
CREATE TABLE public.resort_features_score (
  resort_id uuid NOT NULL,
  carving_score numeric,
  family_score numeric,
  park_score numeric,
  night_score numeric,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resort_features_score_pkey PRIMARY KEY (resort_id),
  CONSTRAINT resort_features_score_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id)
);
CREATE TABLE public.resort_rating_summary (
  resort_id uuid NOT NULL,
  powder_avg numeric,
  carving_avg numeric,
  family_avg numeric,
  park_avg numeric,
  night_avg numeric,
  overall_avg numeric,
  votes_count integer,
  refreshed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resort_rating_summary_pkey PRIMARY KEY (resort_id),
  CONSTRAINT resort_rating_summary_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id)
);
CREATE TABLE public.resort_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL,
  user_id uuid NOT NULL,
  category USER-DEFINED NOT NULL,
  score numeric NOT NULL CHECK (score >= 0::numeric AND score <= 5::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT resort_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT resort_ratings_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id),
  CONSTRAINT resort_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.resorts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text,
  latitude double precision,
  longitude double precision,
  official_site_url text,
  pricing_url text,
  night_ski boolean DEFAULT false,
  difficulty_dist jsonb,
  map_image_url text,
  searchable tsvector,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  region text,
  CONSTRAINT resorts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.saved_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT saved_events_pkey PRIMARY KEY (id),
  CONSTRAINT saved_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT saved_events_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.posts_events(id)
);
CREATE TABLE public.spot_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT spot_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT spot_reviews_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id),
  CONSTRAINT spot_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.spots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL,
  title text NOT NULL,
  type text CHECK (type = ANY (ARRAY['food'::text, 'onsen'::text, 'stay'::text, 'rental'::text, 'school'::text, 'other'::text])),
  latitude double precision,
  longitude double precision,
  image_url text,
  opening_hours jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT spots_pkey PRIMARY KEY (id),
  CONSTRAINT spots_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id)
);
CREATE TABLE public.stars (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stars_pkey PRIMARY KEY (id),
  CONSTRAINT stars_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT stars_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  role USER-DEFINED NOT NULL DEFAULT 'user'::user_role,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.weather_daily_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL,
  date date NOT NULL,
  temp_c numeric,
  new_snow_cm numeric,
  base_depth_cm numeric,
  wind_ms numeric,
  visibility USER-DEFINED,
  snow_quality USER-DEFINED,
  source text,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT weather_daily_cache_pkey PRIMARY KEY (id),
  CONSTRAINT weather_daily_cache_resort_id_fkey FOREIGN KEY (resort_id) REFERENCES public.resorts(id)
);