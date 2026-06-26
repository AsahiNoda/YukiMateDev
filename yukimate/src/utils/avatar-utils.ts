/**
 * Avatar utility functions for role-based styling
 */

import { Colors } from '@/constants/theme';

/**
 * Get avatar border color based on user role
 * @param role - User role (developer, official, user)
 * @returns Color hex string
 */
export const getAvatarBorderColor = (role: string): string => {
    switch (role) {
        case 'developer':
            return Colors.light.roleDeveloper;
        case 'official':
            return Colors.light.roleOfficial;
        case 'user':
        default:
            return Colors.light.roleUser;
    }
};

/**
 * Get badge color based on user role
 * @param role - User role (developer, official, user)
 * @returns Color hex string
 */
export const getBadgeColor = (role: string): string => {
    switch (role) {
        case 'developer':
            return Colors.light.roleDeveloper;
        case 'official':
            return Colors.light.roleOfficial;
        default:
            return Colors.light.roleUser;
    }
};

/**
 * Get avatar gradient colors based on user role
 * @param role - User role (developer, official, user)
 * @returns Array of three gradient colors
 */
export const getAvatarGradientColors = (role: string): [string, string, string] => {
    const baseColor = getAvatarBorderColor(role);
    switch (role) {
        case 'developer':
            return [baseColor, '#10b981', '#059669']; // green gradient
        case 'official':
            return [baseColor, '#fbbf24', '#f59e0b']; // yellow/orange gradient
        case 'user':
        default:
            return [baseColor, '#8b5cf6', '#f97316']; // cyan to purple to orange
    }
};
