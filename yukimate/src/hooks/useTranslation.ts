import { useLocale } from '@/contexts/LocaleContext';
import { getTranslation, TranslationParams } from '@/i18n/translations';

export function useTranslation() {
  const { locale } = useLocale();

  /**
   * @param params 文言中の `{name}`（または旧形式の `${name}`）を置き換える値。
   *   例：t('chips.spotsLeft', { count: 3 }) → 「残り3人」
   */
  const t = (key: string, params?: TranslationParams): string => {
    return getTranslation(locale, key, params);
  };

  return { t, locale };
}
