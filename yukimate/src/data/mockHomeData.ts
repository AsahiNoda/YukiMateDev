import type { WeatherSummary, HomeEvent, SimplePost } from '@types';

export type HomeData = {
  weather: WeatherSummary | null;
  recommendedEvents: HomeEvent[];
  suggestedEvents: HomeEvent[];
  trendingPosts: SimplePost[];
};

export const mockHomeData: HomeData = {
  weather: {
    resortName: 'Hakuba Happo-One',
    description: 'Powder morning with light winds',
    temperatureC: -6,
    newSnowCm: 18,
    snowDepthCm: 220,
    windSpeedMs: 3.5,
    visibility: 'good',
    snowQuality: 'powder',
    weatherCode: 71, // Snow
  },
  recommendedEvents: [
    {
      id: 'evt-1',
      title: 'Morning Powder Session',
      resortName: 'Hakuba Happo-One',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      capacityTotal: 6,
      spotsTaken: 3,
      levelRequired: 'intermediate',
      pricePerPersonJpy: 0,
      isOfficial: true,
    },
    {
      id: 'evt-2',
      title: 'Carving Clinic with Local Rider',
      resortName: 'Hakuba Goryu',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      capacityTotal: 8,
      spotsTaken: 5,
      levelRequired: 'advanced',
      pricePerPersonJpy: 5000,
    },
  ],
  suggestedEvents: [
    {
      id: 'evt-3',
      title: 'Night Ski Social Session',
      resortName: 'Hakuba 47',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      capacityTotal: 10,
      spotsTaken: 4,
      levelRequired: 'beginner',
      pricePerPersonJpy: 2000,
    },
  ],
  trendingPosts: [
    {
      id: 'post-1',
      resortName: 'Hakuba Happo-One',
      photoUrl: 'https://placehold.co/400x300',
      snowTag: 'Powder',
      comment: 'Bottomless turns all morning in Skyline!',
      likeCount: 128,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'post-2',
      resortName: 'Hakuba Goryu',
      photoUrl: 'https://placehold.co/400x300',
      snowTag: 'Carving',
      comment: 'Perfect groomers on the main course',
      likeCount: 96,
      createdAt: new Date().toISOString(),
    },
  ],
};
