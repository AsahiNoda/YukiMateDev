import { getTranslation, TranslationParams } from '@/i18n/translations';
import { daysUntil, formatEventDate } from '../formatEventDate';

const tJa = (key: string, params?: TranslationParams) => getTranslation('ja', key, params);
const tEn = (key: string, params?: TranslationParams) => getTranslation('en', key, params);

describe('formatEventDate', () => {
  // 2026-12-19 は土曜日（ローカル時刻で作る）
  const sat = new Date(2026, 11, 19, 8, 30);

  it('formats in Japanese', () => {
    expect(formatEventDate(sat, tJa)).toBe('12/19（土）8:30');
    expect(formatEventDate(sat, tJa, { withTime: false })).toBe('12/19（土）');
  });

  it('formats in English', () => {
    expect(formatEventDate(sat, tEn)).toBe('Sat 12/19 8:30');
  });

  it('returns empty string for invalid dates', () => {
    expect(formatEventDate('not a date', tJa)).toBe('');
  });
});

describe('daysUntil', () => {
  it('counts calendar days', () => {
    const now = new Date(2026, 11, 16, 23, 0);
    expect(daysUntil(new Date(2026, 11, 19, 8, 30), now)).toBe(3);
    expect(daysUntil(new Date(2026, 11, 16, 1, 0), now)).toBe(0);
  });
});
