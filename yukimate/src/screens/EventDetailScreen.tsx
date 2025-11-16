import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function EventDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Detail</Text>
      <Text style={styles.body}>Details for a selected event will appear here (mock).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#0A1628',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
  },
});

