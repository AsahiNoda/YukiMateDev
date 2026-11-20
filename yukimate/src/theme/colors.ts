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

// 文字・角の丸み・太さは src/constants/spacing.ts の1か所で決める
export { borderRadius, fontSize, fontWeight } from '@/constants/spacing';
