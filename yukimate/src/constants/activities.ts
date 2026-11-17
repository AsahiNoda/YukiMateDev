/**
 * イベントのアクティビティ（posts_events.activities）。
 * 値は DB の CHECK 制約（supabase/migrations/20261121000000_add_activities_to_posts_events.sql）と同じにすること。
 * 表示名は translations の activities.<key>。チップは文字だけ（アイコンは付けない）。
 */
export const ACTIVITY_TYPES = [
  'ski',
  'snowboard',
  'alpine',
  'freestyle',
  'park',
  'powder',
  'crosscountry',
  'backcountry',
  'carving',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** 作成画面で一度に選べる数 */
export const MAX_ACTIVITIES = 4;

export function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

/** DB から来た値のうち、知っているものだけを並び順どおりに返す */
export function normalizeActivities(values: unknown): ActivityType[] {
  if (!Array.isArray(values)) return [];
  return ACTIVITY_TYPES.filter((a) => values.includes(a));
}
