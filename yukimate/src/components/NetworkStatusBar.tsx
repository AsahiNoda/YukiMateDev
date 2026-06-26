import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Colors } from '@/constants/theme';

/**
 * ネットワーク状態を表示するステータスバー
 * オフライン時に警告を表示し、同期待ちのアクション数を表示
 */
export function NetworkStatusBar() {
  const { isOnline, isSyncing, queueLength } = useOfflineSync();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // オンライン時は何も表示しない
  if (isOnline && queueLength === 0) {
    return null;
  }

  const backgroundColor = isOnline ? theme.info : theme.warning;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.text}>
        {isSyncing
          ? `🔄 同期中... (${queueLength}件)`
          : isOnline
          ? `✅ オンライン (${queueLength}件の同期待ち)`
          : `📡 オフライン${queueLength > 0 ? ` (${queueLength}件の同期待ち)` : ''}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NetworkStatusBar;
