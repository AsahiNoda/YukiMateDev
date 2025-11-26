import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './themed-text';

export function GlassmorphicTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <BlurView
        intensity={95}
        tint="dark"
        style={styles.blurContainer}
      >
        <LinearGradient
          colors={['rgba(40, 60, 80, 0.45)', 'rgba(30, 50, 70, 0.5)', 'rgba(40, 60, 80, 0.48)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        >
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
                    color: isFocused ? '#A0F0FF' : 'rgba(255, 255, 255, 0.8)',
                    size: 20,
                  })}
                </View>
                <ThemedText
                  style={[
                    styles.label,
                    {
                      color: isFocused ? '#A0F0FF' : 'rgba(255, 255, 255, 0.75)',
                      textShadowColor: isFocused ? 'rgba(160, 240, 255, 0.7)' : 'transparent',
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: isFocused ? 10 : 0,
                    }
                  ]}
                >
                  {typeof label === 'string' ? label : ''}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
          </View>
        </LinearGradient>
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
    borderColor: 'rgba(248, 255, 255, 0.25)',
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
