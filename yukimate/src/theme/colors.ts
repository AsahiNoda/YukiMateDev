import { Colors as AppColors } from '@/constants/theme';

/**
 * ダークテーマの値に固定した旧来のショートカット。
 * ライトモードにも対応するため、新しいコードでは `useAppColors()`（src/hooks/useAppColors.ts）で
 * 端末の設定に合わせたトークンを取得すること。
 */
export const colors = {
    text: {
        primary: AppColors.dark.text,
        secondary: AppColors.dark.textSecondary,
        muted: AppColors.dark.textMuted,
        label: AppColors.dark.textLabel,
        tint: AppColors.dark.tintText,
    },
    background: {
        primary: AppColors.dark.background,
        secondary: AppColors.dark.backgroundSecondary,
        tertiary: AppColors.dark.backgroundTertiary,
    },
    border: {
        light: AppColors.dark.borderLight,
        divider: AppColors.dark.divider,
    },
    accent: {
        primary: AppColors.dark.tint,
        gold: AppColors.dark.gold,
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
    // UIリデザインの基本ルール（src/constants/spacing.ts と同じ値）
    card: 12,
    pill: 999,
};

export const fontWeight = {
    normal: '400' as const,
    semibold: '600' as const,
    bold: '700' as const,
};
