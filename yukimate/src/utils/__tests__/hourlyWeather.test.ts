import {
  buildTodayColumns,
  freshSnowThisMorning,
  hourKey,
  snowUntilTomorrowMorning,
  type HourlyWeather,
} from '../hourlyWeather';

/** 前日0時から48時間ぶんのデータを作る。overrides で時刻ごとの値を上書き */
function makeHourly(
  today: Date,
  overrides: Record<string, { temp?: number; snow?: number; code?: number }> = {},
  base = { temp: -5, snow: 0, code: 3 }
): HourlyWeather {
  const h: HourlyWeather = { time: [], temperature: [], snowfall: [], weatherCode: [] };
  for (let i = 0; i < 72; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, i);
    const key = hourKey(d);
    const o = overrides[key] ?? {};
    h.time.push(key);
    h.temperature.push(o.temp ?? base.temp);
    h.snowfall.push(o.snow ?? base.snow);
    h.weatherCode.push(o.code ?? base.code);
  }
  return h;
}

const day = (h: number, offset = 0) => hourKey(new Date(2026, 11, 17 + offset, h));
const EARLY = new Date(2026, 11, 17, 7, 0); // 当日7時（どの列も過ぎていない）

describe('freshSnowThisMorning', () => {
  it('sums snowfall from 18:00 the day before (exclusive) to 08:00 (inclusive)', () => {
    const h = makeHourly(EARLY, {
      [day(18, -1)]: { snow: 9 }, // 18時ちょうど（＝17〜18時の分）は含めない
      [day(19, -1)]: { snow: 2 },
      [day(3)]: { snow: 3 },
      [day(8)]: { snow: 1 },
      [day(9)]: { snow: 4 }, // 8時より後は含めない
    });
    expect(freshSnowThisMorning(h, EARLY)).toBe(6);
  });
});

describe('buildTodayColumns', () => {
  it('returns 5 columns from 8 to 16', () => {
    const cols = buildTodayColumns(makeHourly(EARLY), EARLY);
    expect(cols.map((c) => c.hour)).toEqual([8, 10, 12, 14, 16]);
  });

  it('sums snowfall for each 2-hour slot', () => {
    const h = makeHourly(EARLY, { [day(9)]: { snow: 1.2 }, [day(10)]: { snow: 0.8 }, [day(11)]: { snow: 5 } });
    const cols = buildTodayColumns(h, EARLY);
    expect(cols[0].snowfallCm).toBe(2); // 8〜10時 = 9時 + 10時
    expect(cols[1].snowfallCm).toBe(5); // 10〜12時 = 11時 + 12時
  });

  it('no highlight on a dry day without fresh snow', () => {
    const cols = buildTodayColumns(makeHourly(EARLY), EARLY);
    expect(cols.some((c) => c.highlighted)).toBe(false);
  });

  it('rule 1: highlights slots with 0.5cm or more snowfall', () => {
    const h = makeHourly(EARLY, { [day(13)]: { snow: 0.5 } });
    const cols = buildTodayColumns(h, EARLY);
    expect(cols.map((c) => c.highlighted)).toEqual([false, false, true, false, false]);
  });

  it('rule 2: after 5cm+ fresh snow, highlights from 8:00 until temperature exceeds -2', () => {
    const h = makeHourly(EARLY, {
      [day(2)]: { snow: 6 },
      [day(8)]: { temp: -6 },
      [day(10)]: { temp: -3 },
      [day(12)]: { temp: -1 }, // ここで -2 を超える
      [day(14)]: { temp: -4 }, // また下がっても、連続が切れたあとはハイライトしない
    });
    const cols = buildTodayColumns(h, EARLY);
    expect(cols.map((c) => c.highlighted)).toEqual([true, true, false, false, false]);
  });

  it('rule 2 does not apply below 5cm of fresh snow', () => {
    const h = makeHourly(EARLY, { [day(2)]: { snow: 4.9 } });
    expect(buildTodayColumns(h, EARLY).some((c) => c.highlighted)).toBe(false);
  });

  it('never highlights past columns', () => {
    const now = new Date(2026, 11, 17, 12, 30);
    const h = makeHourly(now, {
      [day(2)]: { snow: 10 },
      [day(12)]: { temp: -1 }, // 新雪の朝のハイライトは12時で切れる
      [day(13)]: { snow: 1 }, // 12時の列は降雪でハイライト
    });
    const cols = buildTodayColumns(h, now);
    expect(cols.map((c) => c.isPast)).toEqual([true, true, false, false, false]);
    expect(cols.map((c) => c.highlighted)).toEqual([false, false, true, false, false]);
  });
});

describe('snowUntilTomorrowMorning', () => {
  it('sums from now to tomorrow 08:00', () => {
    const now = new Date(2026, 11, 17, 15, 0);
    const h = makeHourly(now, {
      [day(15)]: { snow: 9 }, // 今の時刻ちょうどは含めない
      [day(20)]: { snow: 8 },
      [day(4, 1)]: { snow: 12 },
      [day(9, 1)]: { snow: 30 }, // 明日8時より後は含めない
    });
    expect(snowUntilTomorrowMorning(h, now)).toBe(20);
  });
});
