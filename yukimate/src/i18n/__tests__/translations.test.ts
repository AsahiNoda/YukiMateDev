import { getTranslation, interpolate, translations } from '../translations';

describe('interpolate', () => {
  it('replaces {name} placeholders', () => {
    expect(interpolate('残り{count}人', { count: 3 })).toBe('残り3人');
  });

  it('replaces legacy ${name} placeholders', () => {
    expect(interpolate('${name}さんの参加を承認しますか？', { name: 'Asa' })).toBe(
      'Asaさんの参加を承認しますか？'
    );
  });

  it('leaves unknown placeholders and returns the template without params', () => {
    expect(interpolate('{a}-{b}', { a: 1 })).toBe('1-{b}');
    expect(interpolate('{a}')).toBe('{a}');
  });
});

describe('getTranslation', () => {
  it('resolves nested keys with params', () => {
    expect(getTranslation('ja', 'chips.spotsLeft', { count: 2 })).toBe('残り2人');
    expect(getTranslation('en', 'chips.spotsLeft', { count: 2 })).toBe('2 spots left');
  });

  it('returns the key when missing', () => {
    expect(getTranslation('ja', 'nope.missing')).toBe('nope.missing');
  });
});

/** ja と en でキーの集合が一致していること（片方だけに追加する漏れを防ぐ） */
describe('translation keys parity', () => {
  const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
    Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object' ? flatten(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
    );

  const redesignNamespaces = [
    'dateFormat',
    'tabs',
    'actions',
    'chips',
    'levels',
    'ridingStyles',
    'createMenu',
    'search',
    'homeFeed',
    'resortPage',
    'chatRoom',
    'myPage',
    'settingsGroups',
  ] as const;

  it.each(redesignNamespaces)('%s has the same keys in ja and en', (ns) => {
    const ja = flatten((translations.ja as any)[ns]).sort();
    const en = flatten((translations.en as any)[ns]).sort();
    expect(en).toEqual(ja);
  });
});
