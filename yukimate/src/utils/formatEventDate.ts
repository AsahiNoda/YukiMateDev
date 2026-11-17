import { TranslationParams } from '@/i18n/translations';

type TFunction = (key: string, params?: TranslationParams) => string;

const WEEKDAY_KEYS = [
  'dateFormat.weekdaySun',
  'dateFormat.weekdayMon',
  'dateFormat.weekdayTue',
  'dateFormat.weekdayWed',
  'dateFormat.weekdayThu',
  'dateFormat.weekdayFri',
  'dateFormat.weekdaySat',
] as const;

/**
 * イベントの日付を短く表記する。
 * ja: 「12/20（土）8:30」 / en: 「Sat 12/20 8:30」
 * 端末のタイムゾーンで表示する。
 */
export function formatEventDate(
  value: string | Date,
  t: TFunction,
  options: { withTime?: boolean } = {}
): string {
  const { withTime = true } = options;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const params = {
    month: date.getMonth() + 1,
    day: date.getDate(),
    weekday: t(WEEKDAY_KEYS[date.getDay()]),
    time: `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`,
  };

  return t(withTime ? 'dateFormat.monthDayWeekdayTime' : 'dateFormat.monthDayWeekday', params);
}

/** 今日から対象日までの日数（日付単位。今日なら0、過去なら負） */
export function daysUntil(value: string | Date, now: Date = new Date()): number {
  const date = typeof value === 'string' ? new Date(value) : value;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((target - start) / 86_400_000);
}
