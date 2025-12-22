/**
 * リゾート関連のヘルパー関数
 */

import { Resort } from '@/lib/database.types';
import { getPrefectureInEnglish } from './prefecture-mapping';

/**
 * リゾートの英語の県名を取得
 * @param resort リゾート情報
 * @returns 英語の県名（例：「Nagano」）
 */
export function getResortPrefectureEN(resort: Resort | { area: string; region?: string | null }): string {
  // If region (English name) is available in database, use it
  if ('region' in resort && resort.region) {
    return resort.region;
  }
  // Fallback to mapping from Japanese area name
  return getPrefectureInEnglish(resort.area);
}

/**
 * リゾートの日本語の県名を取得
 * @param resort リゾート情報
 * @returns 日本語の県名（例：「長野県」）
 */
export function getResortPrefectureJP(resort: Resort | { area: string }): string {
  return resort.area;
}

/**
 * ロケールに応じたリゾートの県名を取得
 * @param resort リゾート情報
 * @param locale ロケール ('ja' | 'en')
 * @returns 県名
 */
export function getResortPrefecture(resort: Resort | { area: string; region?: string | null }, locale: string): string {
  if (locale === 'en') {
    return getResortPrefectureEN(resort);
  }
  return getResortPrefectureJP(resort);
}

/**
 * リゾートの英語名を取得
 * @param resort リゾート情報
 * @returns 英語のリゾート名（name_enがない場合は日本語名にフォールバック）
 */
export function getResortNameEN(resort: Resort | { name: string; name_en?: string | null }): string {
  return resort.name_en || resort.name;
}

/**
 * リゾートの日本語名を取得
 * @param resort リゾート情報
 * @returns 日本語のリゾート名
 */
export function getResortNameJP(resort: Resort | { name: string }): string {
  return resort.name;
}

/**
 * ロケールに応じたリゾート名を取得
 * @param resort リゾート情報
 * @param locale ロケール ('ja' | 'en')
 * @returns リゾート名
 */
export function getResortName(resort: Resort | { name: string; name_en?: string | null }, locale: string): string {
  if (locale === 'en') {
    return getResortNameEN(resort);
  }
  return getResortNameJP(resort);
}
