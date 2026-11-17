import { Colors, ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@hooks/use-color-scheme';

/**
 * 端末のライト／ダーク設定に合わせたカラートークンを返す。
 * 色は直書きせず、ここから取得したトークンを使う（docs/ui-redesign/README.md「0. 進め方」7）。
 */
export function useAppColors(): ThemeColors {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
