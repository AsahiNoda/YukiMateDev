import { Colors } from '@/constants/theme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle, useColorScheme } from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'primary' | 'secondary' | 'outline';
}

export default function Button({
    title,
    onPress,
    loading = false,
    disabled = false,
    style,
    textStyle,
    variant = 'primary',
}: ButtonProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const backgroundColor = variant === 'primary' ? theme.tint : variant === 'secondary' ? theme.backgroundTertiary : 'transparent';
    const textColor = variant === 'outline' ? theme.tint : '#ffffff';
    const borderWidth = variant === 'outline' ? 1 : 0;
    const borderColor = variant === 'outline' ? theme.tint : 'transparent';

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor, borderWidth, borderColor, opacity: disabled ? 0.6 : 1 },
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});
