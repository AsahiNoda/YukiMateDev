import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './themed-text';

export function GlassmorphicTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <BlurView
        intensity={95}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[styles.blurContainer, { borderColor: colors.border }]}
      >
        <View style={[styles.gradientOverlay, { backgroundColor: colors.card }]}>
          <View style={styles.tabBar}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const label =
                options.tabBarLabel !== undefined
                  ? options.tabBarLabel
                  : options.title !== undefined
                    ? options.title
                    : route.name;

              const isFocused = state.index === index;

              const onPress = () => {
                // Add haptic feedback
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              // Skip rendering if tabBarButton returns null (hidden tabs like "create")
              if (options.tabBarButton) {
                const buttonResult = options.tabBarButton({ children: null } as any);
                if (buttonResult === null) {
                  return null;
                }
              }

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={(options as any).tabBarTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.tab}
                >
                  <View style={isFocused ? styles.activeIconContainer : styles.iconContainer}>
                    {isFocused && <View style={styles.glowEffect} />}
                    {options.tabBarIcon && options.tabBarIcon({
                      focused: isFocused,
                      color: isFocused ? colors.tint : colors.icon,
                      size: 20,
                    })}
                  </View>
                  <ThemedText
                    style={[
                      styles.label,
                      {
                        color: isFocused ? colors.tint : colors.icon,
                        textShadowColor: isFocused ? (colorScheme === 'dark' ? 'rgba(160, 240, 255, 0.7)' : 'transparent') : 'transparent',
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: isFocused && colorScheme === 'dark' ? 10 : 0,
                      }
                    ]}
                  >
                    {typeof label === 'string' ? label : ''}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  blurContainer: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    // borderColor is set dynamically in the component
    ...Platform.select({
      ios: {
        shadowColor: '#A0F0FF',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 28,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  gradientOverlay: {
    borderRadius: 32,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(160, 240, 255, 0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#A0F0FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  label: {
    fontSize: 9,
    marginTop: 1,
    fontWeight: '700',
  },
});
