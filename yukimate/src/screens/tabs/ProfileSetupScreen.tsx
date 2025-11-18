import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { SkillLevel } from '@/types';

type RidingStyle = 'Freeride' | 'Powder' | 'Carving' | 'Park' | 'Backcountry';

const COUNTRIES = [
  { code: 'JP', name: '日本', flag: '🇯🇵' },
  { code: 'AU', name: 'オーストラリア', flag: '🇦🇺' },
  { code: 'NZ', name: 'ニュージーランド', flag: '🇳🇿' },
  { code: 'US', name: 'アメリカ', flag: '🇺🇸' },
  { code: 'CA', name: 'カナダ', flag: '🇨🇦' },
];

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

const RIDING_STYLES: RidingStyle[] = [
  'Freeride',
  'Powder',
  'Carving',
  'Park',
  'Backcountry',
];

export default function ProfileSetupScreen() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // セッションからユーザーIDを取得
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  // フォーム状態
  const [displayName, setDisplayName] = useState('');
  const [countryCode, setCountryCode] = useState('JP');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [ridingStyle, setRidingStyle] = useState<RidingStyle[]>([]);

  const toggleRidingStyle = (style: RidingStyle) => {
    if (ridingStyle.includes(style)) {
      setRidingStyle(ridingStyle.filter((s) => s !== style));
    } else {
      setRidingStyle([...ridingStyle, style]);
    }
  };

  const handleSubmit = async () => {
    // バリデーション
    if (!userId) {
      Alert.alert('エラー', 'ユーザー情報が取得できませんでした');
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    if (ridingStyle.length === 0) {
      Alert.alert('エラー', '少なくとも1つのライディングスタイルを選択してください');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('profiles').insert({
        user_id: userId,
        display_name: displayName.trim(),
        country_code: countryCode,
        level: skillLevel,
        styles: ridingStyle,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('エラー', 'プロフィールが既に存在します');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('完了', 'プロフィールを作成しました！', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/(tabs)/home');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      Alert.alert('エラー', 'プロフィールの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>プロフィール作成</Text>
          <Text style={styles.subtitle}>基本情報を登録しましょう</Text>
        </View>

        {/* 表示名 */}
        <View style={styles.section}>
          <Text style={styles.label}>表示名 *</Text>
          <TextInput
            style={styles.input}
            placeholder="雪山　太郎"
            placeholderTextColor="#9CA3AF"
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        {/* 国籍 */}
        <View style={styles.section}>
          <Text style={styles.label}>国籍 *</Text>
          <View style={styles.countryGrid}>
            {COUNTRIES.map((country) => (
              <TouchableOpacity
                key={country.code}
                style={[
                  styles.countryButton,
                  countryCode === country.code && styles.countryButtonActive,
                ]}
                onPress={() => setCountryCode(country.code)}
              >
                <Text style={styles.countryFlag}>{country.flag}</Text>
                <Text
                  style={[
                    styles.countryName,
                    countryCode === country.code && styles.countryNameActive,
                  ]}
                >
                  {country.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* スキルレベル */}
        <View style={styles.section}>
          <Text style={styles.label}>スキルレベル *</Text>
          <View style={styles.buttonGroup}>
            {SKILL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.skillButton,
                  skillLevel === level && styles.skillButtonActive,
                ]}
                onPress={() => setSkillLevel(level)}
              >
                <Text
                  style={[
                    styles.skillText,
                    skillLevel === level && styles.skillTextActive,
                  ]}
                >
                  {level === 'beginner' ? '初級' : level === 'intermediate' ? '中級' : '上級'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ライディングスタイル */}
        <View style={styles.section}>
          <Text style={styles.label}>ライディングスタイル * (複数選択可)</Text>
          <View style={styles.styleGrid}>
            {RIDING_STYLES.map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.styleButton,
                  ridingStyle.includes(style) && styles.styleButtonActive,
                ]}
                onPress={() => toggleRidingStyle(style)}
              >
                <Text
                  style={[
                    styles.styleText,
                    ridingStyle.includes(style) && styles.styleTextActive,
                  ]}
                >
                  {style}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>プロフィールを作成</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  countryButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  countryFlag: {
    fontSize: 20,
  },
  countryName: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  countryNameActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  skillButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  skillButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  skillText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  skillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  styleButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#334155',
  },
  styleButtonActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  styleText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  styleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
