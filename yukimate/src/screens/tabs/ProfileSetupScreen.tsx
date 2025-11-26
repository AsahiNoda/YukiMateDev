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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { SkillLevel } from '@/types';
import { pickAndUploadImage } from '@/lib/imageUpload';
import { Ionicons } from '@expo/vector-icons';

type RidingStyle = 'Freeride' | 'Powder' | 'Carving' | 'Park' | 'Backcountry';

const COUNTRIES = [
  { code: 'JP', name: '日本', flag: require('../../../assets/images/flags/jp.png') },
  { code: 'AU', name: 'オーストラリア', flag: require('../../../assets/images/flags/au.png') },
  { code: 'NZ', name: 'ニュージーランド', flag: require('../../../assets/images/flags/nz.png') },
  { code: 'US', name: 'アメリカ', flag: require('../../../assets/images/flags/us.png') },
  { code: 'CA', name: 'カナダ', flag: require('../../../assets/images/flags/ca.png') },
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
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  // フォーム状態
  const [displayName, setDisplayName] = useState('');
  const [countryCode, setCountryCode] = useState('JP');
  const [languages, setLanguages] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [ridingStyle, setRidingStyle] = useState<RidingStyle[]>([]);
  const [bio, setBio] = useState('');
  const homeResortId = null; // 将来的にホームゲレンデ選択機能を追加予定

  // 画像関連の状態
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [headerUrl, setHeaderUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);

  const toggleRidingStyle = (style: RidingStyle) => {
    if (ridingStyle.includes(style)) {
      setRidingStyle(ridingStyle.filter((s) => s !== style));
    } else {
      setRidingStyle([...ridingStyle, style]);
    }
  };

  const toggleLanguage = (language: string) => {
    if (languages.includes(language)) {
      setLanguages(languages.filter((l) => l !== language));
    } else {
      setLanguages([...languages, language]);
    }
  };

  // アバター画像をアップロード
  const handleAvatarUpload = async () => {
    if (!user?.id) return;

    setUploadingAvatar(true);
    const url = await pickAndUploadImage(user.id, 'avatar');
    if (url) {
      setAvatarUrl(url);
    }
    setUploadingAvatar(false);
  };

  // ヘッダー画像をアップロード
  const handleHeaderUpload = async () => {
    if (!user?.id) return;

    setUploadingHeader(true);
    const url = await pickAndUploadImage(user.id, 'header');
    if (url) {
      setHeaderUrl(url);
    }
    setUploadingHeader(false);
  };

  const handleSubmit = async () => {
    // バリデーション
    if (!user?.id) {
      Alert.alert('エラー', 'ユーザー情報が取得できませんでした');
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    if (!countryCode) {
      Alert.alert('エラー', '国籍を選択してください');
      return;
    }

    if (languages.length === 0) {
      Alert.alert('エラー', '少なくとも1つの言語を選択してください');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        header_url: headerUrl,
        country_code: countryCode,
        languages: languages,
        level: skillLevel,
        styles: ridingStyle,
        bio: bio.trim() || null,
        home_resort_id: homeResortId,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('エラー', 'プロフィールが既に存在します');
        } else {
          throw error;
        }
        return;
      }

      // プロフィール作成成功
      console.log('✅ Profile created successfully');

      // AuthContextを更新してプロフィール情報を取得
      console.log('🔄 Refreshing profile...');
      await refreshProfile();
      console.log('✅ Profile refreshed');

      // プロフィール情報が更新されたことを確認してからホーム画面に遷移
      console.log('➡️  Navigating to home...');
      router.replace('/(tabs)/home');
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

        {/* ヘッダー画像 */}
        <View style={styles.section}>
          <Text style={styles.label}>ヘッダー</Text>
          <TouchableOpacity
            style={styles.headerImageContainer}
            onPress={handleHeaderUpload}
            disabled={uploadingHeader}
          >
            {headerUrl ? (
              <Image source={{ uri: headerUrl }} style={styles.headerImage} />
            ) : (
              <View style={styles.headerImagePlaceholder}>
                {uploadingHeader ? (
                  <ActivityIndicator color="#5A7D9A" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.placeholderText}>タップしてヘッダー画像を選択</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* アバター画像 */}
        <View style={styles.section}>
          <Text style={styles.label}>アイコン</Text>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarUpload}
            disabled={uploadingAvatar}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#5A7D9A" />
                ) : (
                  <Ionicons name="person-outline" size={40} color="#9CA3AF" />
                )}
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>タップしてアイコン画像を選択</Text>
        </View>

        {/* 表示名 */}
        <View style={styles.section}>
          <Text style={styles.label}>ユーザー名 *</Text>
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
                <Image source={country.flag} style={styles.countryFlag} />
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

        {/* 言語 */}
        <View style={styles.section}>
          <Text style={styles.label}>言語 * (複数選択可)</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                languages.includes('Japanese') && styles.languageButtonActive,
              ]}
              onPress={() => toggleLanguage('Japanese')}
            >
              <Text
                style={[
                  styles.languageText,
                  languages.includes('Japanese') && styles.languageTextActive,
                ]}
              >
                日本語
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                languages.includes('English') && styles.languageButtonActive,
              ]}
              onPress={() => toggleLanguage('English')}
            >
              <Text
                style={[
                  styles.languageText,
                  languages.includes('English') && styles.languageTextActive,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
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
          <Text style={styles.label}>ライディングスタイル (複数選択可)</Text>
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

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>自己紹介</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="スノーボードについて、自分について..."
            placeholderTextColor="#9CA3AF"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
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

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
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
    backgroundColor: '#2D3748',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 16,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // ヘッダー画像スタイル
  headerImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2D3748',
    borderWidth: 2,
    borderColor: '#334155',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // アバター画像スタイル
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#2D3748',
    borderWidth: 3,
    borderColor: '#334155',
    alignSelf: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D3748',
  },
  avatarHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  // 国旗スタイル
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
    backgroundColor: '#2D3748',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  countryButtonActive: {
    borderColor: '#5A7D9A',
    backgroundColor: '#1E3A8A',
  },
  countryFlag: {
    width: 24,
    height: 16,
    resizeMode: 'contain',
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
  // 言語スタイル
  languageButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#2D3748',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  languageButtonActive: {
    borderColor: '#5A7D9A',
    backgroundColor: '#1E3A8A',
  },
  languageText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  languageTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // スキルレベルスタイル
  skillButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#2D3748',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  skillButtonActive: {
    borderColor: '#5A7D9A',
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
    backgroundColor: '#2D3748',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#334155',
  },
  styleButtonActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#5A7D9A',
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
    backgroundColor: '#5A7D9A',
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
