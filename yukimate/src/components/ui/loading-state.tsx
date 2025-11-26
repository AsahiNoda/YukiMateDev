import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@hooks/use-color-scheme';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = '読み込み中...' }: LoadingStateProps) {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={tint} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#1A202C',
  },
  message: {
    marginTop: 16,
    color: '#E5E7EB',
    fontSize: 16,
  },
});

