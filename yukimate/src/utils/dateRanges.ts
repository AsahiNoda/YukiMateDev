/**
 * 「さがす」の日付フィルター（今日／明日／今週末）の範囲を作る。端末のタイムゾーンで計算する。
 */

export type DatePreset = 'today' | 'tomorrow' | 'thisWeekend';

export const DATE_PRESETS: readonly DatePreset[] = ['today', 'tomorrow', 'thisWeekend'];

export interface DateRange {
  /** ISO 文字列（以上） */
  start: string;
  /** ISO 文字列（以下） */
  end: string;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

/** 選んだ1日（今日なら今から、それ以降はその日の0:00から）〜その日の終わり */
export function getDayRange(day: Date, now: Date = new Date()): DateRange {
  const start = startOfDay(day);
  return {
    start: (start.getTime() < now.getTime() ? now : start).toISOString(),
    end: endOfDay(day).toISOString(),
  };
}

/**
 * 今週末：次の土曜〜日曜。土曜なら今日〜明日、日曜なら今日だけ。
 * 開始は「今」より前にしない（終わったイベントは出さない）
 */
export function getDateRange(preset: DatePreset, now: Date = new Date()): DateRange {
  switch (preset) {
    case 'today':
      return { start: now.toISOString(), end: endOfDay(now).toISOString() };
    case 'tomorrow': {
      const tomorrow = addDays(now, 1);
      return { start: startOfDay(tomorrow).toISOString(), end: endOfDay(tomorrow).toISOString() };
    }
    case 'thisWeekend': {
      const day = now.getDay(); // 0=日, 6=土
      if (day === 0) {
        return { start: now.toISOString(), end: endOfDay(now).toISOString() };
      }
      const saturday = addDays(now, 6 - day);
      const sunday = addDays(saturday, 1);
      const start = day === 6 ? now : startOfDay(saturday);
      return { start: start.toISOString(), end: endOfDay(sunday).toISOString() };
    }
  }
}
