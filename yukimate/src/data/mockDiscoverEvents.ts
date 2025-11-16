import type { DiscoverEvent } from '@types';

export const mockDiscoverEvents: DiscoverEvent[] = [
  {
    id: 'evt-1',
    title: 'Epic Niseko Powder Session',
    description:
      "Looking for experienced riders to explore the Niseko backcountry. Let's chase some fresh tracks!",
    hostName: 'Yuki',
    hostAvatar: null,
    resortName: 'Niseko Grand Hirafu',
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    capacityTotal: 5,
    spotsTaken: 3,
    levelRequired: 'advanced',
    pricePerPersonJpy: 5000,
    tags: ['Powder', 'Backcountry'],
    photoUrl: null,
    hostUserId: 'stub-host-1',
  },
  {
    id: 'evt-2',
    title: 'Beginner Carving Meetup',
    description: 'Friendly session for beginner-intermediate riders to practice carving turns together.',
    hostName: 'Aoi',
    hostAvatar: null,
    resortName: 'Hakuba Happo-One',
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    capacityTotal: 8,
    spotsTaken: 2,
    levelRequired: 'beginner',
    pricePerPersonJpy: 0,
    tags: ['Carving', 'Beginner'],
    photoUrl: null,
    hostUserId: 'stub-host-2',
  },
];
