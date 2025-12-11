/**
 * Social feed and post-related type definitions
 */

// Post types
export type PostType = 'snow' | 'spot' | 'access';

// Snowfeed post
export type SnowfeedPost = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  userRole: string;
  resortId: string | null;
  resortName: string | null;
  type: PostType;
  text: string | null;
  tags: string[];
  photos: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

// Simple post for home screen
export type SimplePost = {
  id: string;
  resortName: string;
  photoUrl: string;
  snowTag: string;
  comment: string;
  likeCount: number;
  createdAt: string;
};

// Resort ratings
export type ResortRating = {
  powder: number | null;
  carving: number | null;
  family: number | null;
  park: number | null;
  night: number | null;
  overall: number | null;
  votesCount: number;
};

// Snowfeed weather (different from WeatherSummary in weather.ts)
export type SnowfeedWeather = {
  tempC: number | null;
  newSnowCm: number | null;
  baseDepthCm: number | null;
  windMs: number | null;
  visibility: 'good' | 'moderate' | 'poor' | null;
  snowQuality: 'powder' | 'packed' | 'slushy' | 'icy' | null;
  weatherCode: number | null; // WMO Weather interpretation codes
};

// Complete snowfeed data
export type SnowfeedData = {
  rating: ResortRating | null;
  weather: SnowfeedWeather | null;
  posts: SnowfeedPost[];
};
