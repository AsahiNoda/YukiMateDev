/**
 * プロフィールの「言語」（profiles.languages）。表示名はその言語の文字で書く（翻訳しない）。
 * 先頭の言語はアプリの表示言語にも使われる（contexts/LocaleContext.tsx：ja / en 以外は日本語表示）。
 */
export const LANGUAGE_OPTIONS = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
] as const;

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]['code'];

/** 保存されている値（以前の 'Japanese' / '日本語' なども）を表示名に */
export function languageDisplayName(value: string): string {
  if (value === 'Japanese' || value === '日本語') return '日本語';
  if (value === 'English') return 'English';
  return LANGUAGE_OPTIONS.find((o) => o.code === value)?.label ?? value;
}
