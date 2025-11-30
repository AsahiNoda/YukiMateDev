import { Colors as AppColors } from '@/constants/theme';

export const colors = {
    text: {
        primary: AppColors.dark.text,
        secondary: AppColors.dark.textSecondary,
    },
    background: {
        primary: AppColors.dark.background,
        secondary: AppColors.dark.backgroundSecondary,
        tertiary: AppColors.dark.backgroundTertiary,
    },
    border: {
        light: AppColors.dark.borderLight,
    },
    accent: {
        primary: AppColors.dark.tint,
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
};

export const fontWeight = {
    normal: '400' as const,
    semibold: '600' as const,
    bold: '700' as const,
};
