import { useLocale } from '@/contexts/LocaleContext';
import { getTranslation } from '@/i18n/translations';

export function useTranslation() {
  const { locale } = useLocale();

  const t = (key: string): string => {
    return getTranslation(locale, key);
  };

  return { t, locale };
}
