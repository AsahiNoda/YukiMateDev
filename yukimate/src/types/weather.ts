/**
 * Weather-related type definitions
 */

// Weather summary for home screen and snowfeed
export type WeatherSummary = {
  resortName: string;
  description: string;
  temperatureC: number;
  newSnowCm: number;
  snowDepthCm: number;
  windSpeedMs: number;
  visibility?: 'good' | 'moderate' | 'poor';
  snowQuality?: 'powder' | 'packed' | 'slushy' | 'icy';
};

// Resort rating information
export type ResortRating = {
  resortId: string;
  resortName: string;
  avgSnowQuality: number;
  avgCrowdLevel: number;
  lastUpdated: string;
};
