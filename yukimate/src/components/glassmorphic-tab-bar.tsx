import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GlassmorphicTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <BlurView
        intensity={95}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[
          styles.blurContainer,
          {
            borderTopColor: colors.border
          }
        ]}
      >
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
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
                <View style={styles.iconContainer}>
                  {options.tabBarIcon && options.tabBarIcon({
                    focused: isFocused,
                    color: isFocused ? colors.tint : colors.icon,
                    size: 24, // Slightly larger icons for minimalist look
                  })}
                  {isFocused && (
                    <View style={[styles.activeDot, { backgroundColor: colors.tint }]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    width: '100%',
    borderTopWidth: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40, // Fixed height for consistent alignment
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
