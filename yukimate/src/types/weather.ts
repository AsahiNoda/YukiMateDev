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
};

// Resort rating information
export type ResortRating = {
  resortId: string;
  resortName: string;
  avgSnowQuality: number;
  avgCrowdLevel: number;
  lastUpdated: string;
};
