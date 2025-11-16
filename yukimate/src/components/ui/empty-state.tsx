import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from './icon-symbol';

type EmptyStateProps = {
  icon?: Parameters<typeof IconSymbol>[0]['name'];
  title: string;
  message?: string;
};

export function EmptyState({ icon = 'tray', title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <IconSymbol name={icon} size={64} color="#9CA3AF" />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#0A1628',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

