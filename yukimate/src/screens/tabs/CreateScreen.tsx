import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CreateEventScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('2025-12-20');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('15:00');
  const [location, setLocation] = useState('Hakuba Happo-One');
  const [capacity, setCapacity] = useState('6');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter an event title.');
      return;
    }

    Alert.alert(
      'Event created (mock)',
      `Title: ${title}\nResort: ${location}\nDate: ${date} ${startTime} - ${endTime}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Event</Text>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Epic Niseko Powder Session"
          placeholderTextColor="#6B7280"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Looking for riders to explore the backcountry together..."
          placeholderTextColor="#6B7280"
          multiline
        />

        <Text style={styles.label}>Resort</Text>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Hakuba Happo-One"
          placeholderTextColor="#6B7280"
        />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#6B7280"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Start</Text>
            <TextInput
              style={styles.input}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="10:00"
              placeholderTextColor="#6B7280"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>End</Text>
            <TextInput
              style={styles.input}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="15:00"
              placeholderTextColor="#6B7280"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Capacity</Text>
            <TextInput
              style={styles.input}
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
              placeholder="6"
              placeholderTextColor="#6B7280"
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Level</Text>
            <View style={styles.segmentRow}>
              {(['beginner', 'intermediate', 'advanced'] as const).map((lv) => (
                <TouchableOpacity
                  key={lv}
                  style={[
                    styles.segment,
                    level === lv && styles.segmentActive,
                  ]}
                  onPress={() => setLevel(lv)}>
                  <Text
                    style={[
                      styles.segmentText,
                      level === lv && styles.segmentTextActive,
                    ]}>
                    {lv}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.createButton} activeOpacity={0.8} onPress={handleCreate}>
          <Text style={styles.createButtonText}>Create Event (Mock)</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F9FAFB',
    marginBottom: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rowItem: {
    flex: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  segment: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 6,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  segmentText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  createButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

