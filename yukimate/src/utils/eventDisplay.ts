import type { ChipTone } from '@/components/ui/Chip';
import type { TranslationParams } from '@/i18n/translations';

type TFunction = (key: string, params?: TranslationParams) => string;

/** レベルの表示名（生の値 beginner などを出さない）。未指定なら null */
export function levelLabel(level: string | null | undefined, t: TFunction): string | null {
  if (level === 'beginner' || level === 'intermediate' || level === 'advanced') {
    return t(`levels.${level}`);
  }
  return null;
}

const CATEGORY_KEYS: Record<string, string> = {
  event: 'explore.categoryEvent',
  lesson: 'explore.categoryLesson',
  filming: 'explore.categoryFilming',
  group: 'explore.categoryGroup',
};

export function categoryLabel(category: string, t: TFunction): string {
  const key = CATEGORY_KEYS[category];
  return key ? t(key) : category;
}

/**
 * 残り人数のチップ。残り1人以下は注意系（色だけでなく「残り1人」の文言でも伝わる）。
 * 定員が未設定（0）のときは出さない
 */
export function spotsLeftChip(
  capacityTotal: number,
  spotsTaken: number,
  t: TFunction
): { label: string; tone: ChipTone } | null {
  if (!capacityTotal) return null;
  const left = capacityTotal - spotsTaken;
  if (left <= 0) return { label: t('chips.full'), tone: 'neutral' };
  // 「参加者／定員」で見せる（あと1人のときは注意の色）
  return { label: t('chips.spotsCount', { taken: spotsTaken, total: capacityTotal }), tone: left <= 1 ? 'warning' : 'success' };
}

/** 価格の表示。null と 0 は「無料」 */
export function priceLabel(price: number | null | undefined, t: TFunction): string {
  if (!price) return t('chips.free');
  return `¥${price.toLocaleString()}`;
}

/** 「一人参加OK」を出すかどうか（posts_events.solo_ok。ホストが作成時に設定） */
export function isSoloFriendly(event: { soloOk?: boolean }): boolean {
  return !!event.soloOk;
}
