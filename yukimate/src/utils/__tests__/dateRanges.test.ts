import { getDateRange, getDayRange } from '../dateRanges';

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe('getDateRange', () => {
  it('today: from now to end of today', () => {
    const now = local(2026, 12, 16, 10, 0); // 水
    const r = getDateRange('today', now);
    expect(new Date(r.start).getTime()).toBe(now.getTime());
    expect(new Date(r.end)).toEqual(new Date(2026, 11, 16, 23, 59, 59, 999));
  });

  it('tomorrow: whole next day', () => {
    const r = getDateRange('tomorrow', local(2026, 12, 31, 22, 0));
    expect(new Date(r.start)).toEqual(local(2027, 1, 1));
    expect(new Date(r.end)).toEqual(new Date(2027, 0, 1, 23, 59, 59, 999));
  });

  it('thisWeekend on a weekday: coming Sat 0:00 to Sun end', () => {
    const r = getDateRange('thisWeekend', local(2026, 12, 16, 10, 0)); // 水
    expect(new Date(r.start)).toEqual(local(2026, 12, 19));
    expect(new Date(r.end)).toEqual(new Date(2026, 11, 20, 23, 59, 59, 999));
  });

  it('thisWeekend on Saturday starts now', () => {
    const now = local(2026, 12, 19, 9, 0);
    const r = getDateRange('thisWeekend', now);
    expect(new Date(r.start).getTime()).toBe(now.getTime());
    expect(new Date(r.end)).toEqual(new Date(2026, 11, 20, 23, 59, 59, 999));
  });

  it('a picked future day covers the whole day', () => {
    const r = getDayRange(local(2026, 12, 24, 15, 0), local(2026, 12, 16, 10, 0));
    expect(new Date(r.start)).toEqual(local(2026, 12, 24));
    expect(new Date(r.end)).toEqual(new Date(2026, 11, 24, 23, 59, 59, 999));
  });

  it('picking today starts from now', () => {
    const now = local(2026, 12, 16, 10, 0);
    const r = getDayRange(local(2026, 12, 16), now);
    expect(new Date(r.start).getTime()).toBe(now.getTime());
  });

  it('thisWeekend on Sunday is just the rest of today', () => {
    const now = local(2026, 12, 20, 9, 0);
    const r = getDateRange('thisWeekend', now);
    expect(new Date(r.start).getTime()).toBe(now.getTime());
    expect(new Date(r.end)).toEqual(new Date(2026, 11, 20, 23, 59, 59, 999));
  });
});
