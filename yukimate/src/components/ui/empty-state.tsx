import { fontSize, fontWeight } from '@/constants/spacing';
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
    backgroundColor: '#1A202C',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.sm,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

