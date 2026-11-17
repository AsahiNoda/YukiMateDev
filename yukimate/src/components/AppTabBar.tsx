import { borderRadius, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CreateMenuSheet } from '@/components/CreateMenuSheet';
import { PostCreateModal } from '@/components/snowfeed/PostCreateModal';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * タブバーの高さ（画面の下端から）。タブバーは画面の上に重ねて置いているので、
 * 下に固定のボタンを置く画面はこの分を空ける
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, spacing.sm);
}

/** paddingTop 8 ＋ タブ1つの高さ 48 */
const TAB_BAR_CONTENT_HEIGHT = spacing.sm + touchTarget.min + 4;

/** タブバーに出すタブ（この順で並べる）。これ以外のルートはタブバーに出さない */
export const VISIBLE_TABS = ['home', 'search', 'create', 'chat', 'profile'] as const;
export const CREATE_TAB = 'create';

interface AppTabBarProps extends BottomTabBarProps {
  /** タブ名 → バッジの数（0 なら出さない） */
  badges?: Partial<Record<string, number>>;
}

/**
 * 5つのラベル付きタブ（ホーム／さがす／作成／チャット／マイページ）。
 * 選択中はアイコンとラベルをティント色にする（4px の点だけで示すのはやめた）。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Home.html 下部の <nav>。
 */
export function AppTabBar({ state, descriptors, navigation, badges = {} }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t } = useTranslation();
  const [createMenuVisible, setCreateMenuVisible] = useState(false);
  const [postFormVisible, setPostFormVisible] = useState(false);

  const onCreatePress = () => setCreateMenuVisible(true);

  const handleCreateEvent = () => {
    setCreateMenuVisible(false);
    // 編集モードの eventId が残らないように明示的に消す
    navigation.navigate(CREATE_TAB, { eventId: undefined });
  };

  // シートを閉じたあとに開く投稿フォーム
  // （iOS はモーダルが閉じきる前に次のモーダルを開くと表示されないため、onDismiss を待つ）
  const pendingPostForm = useRef(false);

  const handlePostResortNow = () => {
    setCreateMenuVisible(false);
    // ゲレンデページには移動せず、その場で投稿フォームを開く。
    // 投稿先のゲレンデはフォームの中で選ぶ（初期値はホームゲレンデ）
    if (Platform.OS === 'ios') {
      pendingPostForm.current = true;
      // onDismiss が来なかったときの保険
      setTimeout(handleCreateMenuDismiss, 600);
    } else {
      setPostFormVisible(true);
    }
  };

  const handleCreateMenuDismiss = () => {
    if (pendingPostForm.current) {
      pendingPostForm.current = false;
      setPostFormVisible(true);
    }
  };

  return (
    <>
    <CreateMenuSheet
      visible={createMenuVisible}
      onClose={() => setCreateMenuVisible(false)}
      onDismiss={handleCreateMenuDismiss}
      onCreateEvent={handleCreateEvent}
      onPostResortNow={handlePostResortNow}
    />
    <PostCreateModal
      visible={postFormVisible}
      allowResortChange
      onClose={() => setPostFormVisible(false)}
      onPostCreated={() => setPostFormVisible(false)}
    />
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.tabBarBackground,
          borderTopColor: c.divider,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      {VISIBLE_TABS.map((name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return null;

        const { options } = descriptors[route.key];
        const isFocused = state.routes[state.index]?.key === route.key;
        const label = typeof options.title === 'string' ? options.title : name;
        const badge = badges[name] ?? 0;

        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

          if (name === CREATE_TAB) {
            onCreatePress();
            return;
          }

          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        if (name === CREATE_TAB) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={onPress}
              style={styles.tab}
              testID="tab-create"
            >
              <View style={[styles.createIcon, { backgroundColor: c.primaryButton }]}>
                <Ionicons name="add" size={24} color={c.primaryButtonText} />
              </View>
              <Text style={[styles.label, { color: c.chipText }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        }

        const color = isFocused ? c.tintText : c.textLabel;
        const a11yLabel =
          badge > 0 ? `${label} ${t('tabs.badgeCount', { count: badge })}` : label;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={a11yLabel}
            testID={`tab-${name}`}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <View style={styles.iconWrap}>
              {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
              {badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: c.badge }]}>
                  <Text style={[styles.badgeText, { color: c.badgeText }]}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.label,
                { color, fontWeight: isFocused ? fontWeight.bold : fontWeight.medium },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    minHeight: touchTarget.min + 4,
  },
  // 幅を固定して、バッジをアイコンの右上の角に合わせる（幅が無いと % 指定の位置がずれる）
  iconWrap: {
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createIcon: {
    width: 44,
    height: 32,
    borderRadius: borderRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
});

export default AppTabBar;
