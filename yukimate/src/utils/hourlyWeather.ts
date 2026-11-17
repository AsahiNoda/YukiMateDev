/**
 * Open-Meteo の hourly（時間ごと）データから、ホームの天気カード（案D）の
 * 「今日の時間ごと」の列・ハイライト・パウダーアラートを計算する。
 *
 * 時刻は Open-Meteo に timezone=Asia/Tokyo を指定して取得した "YYYY-MM-DDTHH:mm"（現地時刻）。
 * now は端末の時刻を使う（端末が日本時間である前提）。
 * snowfall は「その時刻までの1時間」の降雪量（cm）。
 */

export interface HourlyWeather {
  time: string[];
  temperature: number[];
  snowfall: number[];
  weatherCode: number[];
}

export interface HourColumn {
  /** 列の開始時刻（8, 10, 12, 14, 16） */
  hour: number;
  temperatureC: number | null;
  /** その2時間（hour〜hour+2）の降雪量 cm */
  snowfallCm: number;
  weatherCode: number | null;
  /** 滑るのに良い時間帯 */
  highlighted: boolean;
  /** すでに終わった時間帯（ハイライトしない） */
  isPast: boolean;
}

export const COLUMN_HOURS = [8, 10, 12, 14, 16] as const;

/** ハイライトのルール（docs/ui-redesign/README.md 9章の決定：新雪の朝＋降雪中） */
export const HIGHLIGHT_RULES = {
  /** ① この量以上の降雪予報がある列 */
  snowingSlotCm: 0.5,
  /** ② 前日18時〜当日8時の新雪がこの量以上の日は… */
  freshSnowCm: 5,
  /** …8時から、気温がこの温度を超える前までの列 */
  powderMaxTempC: -2,
} as const;

/** パウダーアラート：今〜明日8時の降雪予報がこの量以上 */
export const POWDER_ALERT_CM = 20;

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DDTHH:00"（端末の現地時刻） */
export function hourKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

function at(date: Date, dayOffset: number, hour: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset, hour, 0, 0, 0);
}

function indexOfTime(h: HourlyWeather, d: Date): number {
  return h.time.indexOf(hourKey(d));
}

function valueAt(values: number[], index: number): number | null {
  if (index < 0 || index >= values.length) return null;
  const v = values[index];
  return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

/** (from, to] の時刻の降雪量の合計 */
export function snowfallBetween(h: HourlyWeather, from: Date, to: Date): number {
  let sum = 0;
  h.time.forEach((t, i) => {
    const ts = new Date(t).getTime();
    if (ts > from.getTime() && ts <= to.getTime()) sum += h.snowfall[i] || 0;
  });
  return Math.round(sum * 10) / 10;
}

/** 前日18時〜当日8時の新雪 */
export function freshSnowThisMorning(h: HourlyWeather, now: Date): number {
  return snowfallBetween(h, at(now, -1, 18), at(now, 0, 8));
}

/** 今〜明日8時の降雪予報（パウダーアラート用） */
export function snowUntilTomorrowMorning(h: HourlyWeather, now: Date): number {
  return snowfallBetween(h, now, at(now, 1, 8));
}

export function buildTodayColumns(h: HourlyWeather, now: Date): HourColumn[] {
  const fresh = freshSnowThisMorning(h, now) >= HIGHLIGHT_RULES.freshSnowCm;
  let powderMorning = fresh; // 8時から続く間だけ true

  return COLUMN_HOURS.map((hour) => {
    const start = at(now, 0, hour);
    const i = indexOfTime(h, start);
    const temperature = valueAt(h.temperature, i);
    const slotSnow = snowfallBetween(h, start, at(now, 0, hour + 2));
    const isPast = now.getTime() >= at(now, 0, hour + 2).getTime();

    // ② 新雪の朝：8時から、気温が基準を超えるまで連続する列
    if (powderMorning && (temperature === null || temperature > HIGHLIGHT_RULES.powderMaxTempC)) {
      powderMorning = false;
    }
    const snowing = slotSnow >= HIGHLIGHT_RULES.snowingSlotCm; // ① 降雪中

    return {
      hour,
      temperatureC: temperature === null ? null : Math.round(temperature),
      snowfallCm: slotSnow,
      weatherCode: valueAt(h.weatherCode, i),
      highlighted: !isPast && (snowing || powderMorning),
      isPast,
    };
  });
}
