import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ExploreFilters } from '@/hooks/useExplore';
import { useResorts } from '@/hooks/useResorts';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LEVELS = [
  { key: 'beginner', label: '初級', icon: '🟢' },
  { key: 'intermediate', label: '中級', icon: '🔵' },
  { key: 'advanced', label: '上級', icon: '🔴' },
];

const LANGUAGES = [
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

export default function FilterScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ currentFilters?: string }>();
  const resortsState = useResorts();

  // フィルター状態
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedResorts, setSelectedResorts] = useState<number[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [resortSearchQuery, setResortSearchQuery] = useState('');

  // 既存フィルターの読み込み
  React.useEffect(() => {
    if (params.currentFilters) {
      try {
        const filters: ExploreFilters = JSON.parse(params.currentFilters);
        if (filters.resortIds) setSelectedResorts(filters.resortIds);
        if (filters.skillLevel) setSelectedLevel(filters.skillLevel);
        if (filters.languages) setSelectedLanguages(filters.languages);
        if (filters.hasAvailability) setOnlyAvailable(filters.hasAvailability);
        if (filters.dateRange?.start) setStartDate(new Date(filters.dateRange.start));
        if (filters.dateRange?.end) setEndDate(new Date(filters.dateRange.end));
      } catch (error) {
        console.error('Error parsing current filters:', error);
      }
    }
  }, [params.currentFilters]);

  const handleResortToggle = (resortId: number) => {
    setSelectedResorts(prev =>
      prev.includes(resortId)
        ? prev.filter(id => id !== resortId)
        : [...prev, resortId]
    );
  };

  const handleLanguageToggle = (code: string) => {
    setSelectedLanguages(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const handleApply = () => {
    const filters: ExploreFilters = {
      resortIds: selectedResorts.length > 0 ? selectedResorts : undefined,
      skillLevel: selectedLevel as any,
      dateRange: {
        start: startDate?.toISOString(),
        end: endDate?.toISOString(),
      },
      languages: selectedLanguages.length > 0 ? selectedLanguages : undefined,
      hasAvailability: onlyAvailable,
    };

    // パラメータを保持しながら戻る
    router.setParams({ filters: JSON.stringify(filters) });
    router.back();
  };

  const handleReset = () => {
    setSelectedResorts([]);
    setSelectedLevel(null);
    setStartDate(null);
    setEndDate(null);
    setSelectedLanguages([]);
    setOnlyAvailable(false);
    setResortSearchQuery('');
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '選択してください';
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const filteredResorts = resortsState.status === 'success'
    ? resortsState.resorts.filter(resort =>
        resort.name.toLowerCase().includes(resortSearchQuery.toLowerCase())
      )
    : [];

  const resortsByArea = filteredResorts.reduce((acc, resort) => {
    if (!acc[resort.area]) acc[resort.area] = [];
    acc[resort.area].push(resort);
    return acc;
  }, {} as Record<string, typeof filteredResorts>);

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="xmark" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetText}>リセット</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 日付範囲 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>日付範囲</Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateLabel}>開始日</Text>
            <View style={styles.dateValue}>
              <Text style={styles.dateText}>{formatDate(startDate)}</Text>
              <IconSymbol name="calendar" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateLabel}>終了日</Text>
            <View style={styles.dateValue}>
              <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              <IconSymbol name="calendar" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {(startDate || endDate) && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setStartDate(null);
                setEndDate(null);
              }}
            >
              <Text style={styles.clearButtonText}>日付をクリア</Text>
            </TouchableOpacity>
          )}

          {showStartPicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (date) setStartDate(date);
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (date) setEndDate(date);
              }}
            />
          )}
        </View>

        {/* レベル */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>スキルレベル</Text>
          {LEVELS.map(level => (
            <TouchableOpacity
              key={level.key}
              style={[
                styles.radioOption,
                selectedLevel === level.key && styles.radioOptionSelected,
              ]}
              onPress={() =>
                setSelectedLevel(prev => prev === level.key ? null : level.key)
              }
            >
              <View style={styles.radioLabel}>
                <Text style={styles.levelIcon}>{level.icon}</Text>
                <Text style={styles.radioText}>{level.label}</Text>
              </View>
              <View
                style={[
                  styles.radio,
                  selectedLevel === level.key && styles.radioSelected,
                ]}
              >
                {selectedLevel === level.key && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* スキー場 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>スキー場</Text>

          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="スキー場を検索"
              placeholderTextColor="#6B7280"
              value={resortSearchQuery}
              onChangeText={setResortSearchQuery}
            />
          </View>

          {resortsState.status === 'loading' && (
            <Text style={styles.loadingText}>読み込み中...</Text>
          )}

          {resortsState.status === 'error' && (
            <Text style={styles.errorText}>エラーが発生しました</Text>
          )}

          {resortsState.status === 'success' && (
            <View style={styles.resortsContainer}>
              {Object.entries(resortsByArea).map(([area, resorts]) => (
                <View key={area} style={styles.resortGroup}>
                  <Text style={styles.resortGroupTitle}>{area}</Text>
                  {resorts.map(resort => (
                    <TouchableOpacity
                      key={resort.id}
                      style={styles.checkboxOption}
                      onPress={() => handleResortToggle(Number(resort.id))}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          selectedResorts.includes(Number(resort.id)) && styles.checkboxChecked,
                        ]}
                      >
                        {selectedResorts.includes(Number(resort.id)) && (
                          <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={styles.checkboxText}>{resort.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 言語 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>言語</Text>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={styles.checkboxOption}
              onPress={() => handleLanguageToggle(lang.code)}
            >
              <View
                style={[
                  styles.checkbox,
                  selectedLanguages.includes(lang.code) && styles.checkboxChecked,
                ]}
              >
                {selectedLanguages.includes(lang.code) && (
                  <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.languageFlag}>{lang.flag}</Text>
              <Text style={styles.checkboxText}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 空き状況 */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>空きがあるイベントのみ</Text>
            <Switch
              value={onlyAvailable}
              onValueChange={setOnlyAvailable}
              trackColor={{ false: '#374151', true: '#60A5FA' }}
              thumbColor={onlyAvailable ? '#5A7D9A' : '#9CA3AF'}
            />
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ボタン */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
        >
          <Text style={styles.applyButtonText}>フィルターを適用</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resetText: {
    fontSize: 16,
    color: '#5A7D9A',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  dateButton: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  dateValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#5A7D9A',
  },
  radioOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  radioOptionSelected: {
    backgroundColor: '#334155',
    borderWidth: 2,
    borderColor: '#5A7D9A',
  },
  radioLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelIcon: {
    fontSize: 20,
  },
  radioText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#5A7D9A',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5A7D9A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  loadingText: {
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    padding: 20,
  },
  resortsContainer: {
    maxHeight: 300,
  },
  resortGroup: {
    marginBottom: 16,
  },
  resortGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60A5FA',
    marginBottom: 8,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5A7D9A',
    borderColor: '#5A7D9A',
  },
  checkboxText: {
    fontSize: 15,
    color: '#E5E7EB',
  },
  languageFlag: {
    fontSize: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  applyButton: {
    backgroundColor: '#5A7D9A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
