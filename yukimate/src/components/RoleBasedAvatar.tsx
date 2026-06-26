import { getAvatarGradientColors, getBadgeColor } from '@/utils/avatar-utils';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { OfficialBadge } from './OfficialBadge';

interface RoleBasedAvatarProps {
    /** Avatar image URL */
    avatarUrl: string | null;
    /** User role (developer, official, user) */
    role: string;
    /** Avatar size in pixels */
    size?: number;
    /** Background color for inner container */
    backgroundColor?: string;
    /** Icon color for placeholder */
    iconColor?: string;
    /** Show badge for developer/official roles */
    showBadge?: boolean;
}

/**
 * Reusable avatar component with role-based gradient border and badge
 */
export const RoleBasedAvatar: React.FC<RoleBasedAvatarProps> = ({
    avatarUrl,
    role,
    size = 112,
    backgroundColor = '#1a202c',
    iconColor = '#64748b',
    showBadge = true,
}) => {
    const borderWidth = size > 80 ? 4 : 2;
    const innerSize = size - borderWidth * 2;
    const iconSize = size > 80 ? 40 : 24;
    const badgeSize = size > 80 ? 38 : 24;
    const badgeIconSize = size > 80 ? 24 : 16;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={getAvatarGradientColors(role)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.gradientRing,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        padding: borderWidth,
                    },
                ]}
            >
                <View
                    style={[
                        styles.innerContainer,
                        {
                            width: innerSize,
                            height: innerSize,
                            borderRadius: innerSize / 2,
                            backgroundColor,
                        },
                    ]}
                >
                    {avatarUrl ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={[
                                styles.avatar,
                                {
                                    width: innerSize,
                                    height: innerSize,
                                    borderRadius: innerSize / 2,
                                },
                            ]}
                        />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="person" size={iconSize} color={iconColor} />
                        </View>
                    )}
                </View>
            </LinearGradient>

            {/* Badge for developer and official roles */}
            {showBadge && (role === 'developer' || role === 'official') && (
                <View
                    style={[
                        styles.badgeContainer,
                        {
                            width: badgeSize,
                            height: badgeSize,
                            borderRadius: badgeSize / 2,
                            backgroundColor,
                            borderColor: backgroundColor,
                        },
                    ]}
                >
                    <OfficialBadge color={getBadgeColor(role)} size={badgeIconSize} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    gradientRing: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    innerContainer: {
        overflow: 'hidden',
    },
    avatar: {
        // Dimensions set dynamically
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeContainer: {
        position: 'absolute',
        top: -4,
        right: -2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 3,
    },
});
