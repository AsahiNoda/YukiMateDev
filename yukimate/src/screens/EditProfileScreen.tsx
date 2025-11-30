import type { SkillLevel } from '@/types/common';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useAuth } from '@contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { updateProfile, useProfile } from '@hooks/useProfile';
import { pickAndUploadImage } from '@lib/imageUpload';
import { supabase } from '@lib/supabase';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COUNTRIES, getFlagSource } from '@/constants/countries';

type RidingStyle = 'Freeride' | 'Powder' | 'Carving' | 'Park' | 'Backcountry';

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

const RIDING_STYLES: RidingStyle[] = [
  'Freeride',
  'Powder',
  'Carving',
  'Park',
  'Backcountry',
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const profileState = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [countryCode, setCountryCode] = useState('JP');
  const [languages, setLanguages] = useState<string[]>([]);
  const [ridingStyle, setRidingStyle] = useState<RidingStyle[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 画像関連の状態
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [headerUrl, setHeaderUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);

  // UI状態
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Load current profile data
  useEffect(() => {
    if (profileState.status === 'success') {
      const profile = profileState.data;
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setLevel(profile.level);
      setCountryCode(profile.countryCode || 'JP');
      setLanguages(profile.languages || []);
      setRidingStyle((profile.styles as RidingStyle[]) || []);
      setAvatarUrl(profile.avatarUrl);
      setHeaderUrl(profile.headerUrl);
    }
  }, [profileState]);

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

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名を入力してください');
      return;
    }

    if (languages.length === 0) {
      Alert.alert('エラー', '少なくとも1つの言語を選択してください');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        level: level || undefined,
        countryCode,
        languages,
        styles: ridingStyle,
      });

      if (result.success) {
        // Update avatar and header URLs if changed
        if (avatarUrl || headerUrl) {
          const updates: any = {};
          if (avatarUrl) updates.avatar_url = avatarUrl;
          if (headerUrl) updates.header_url = headerUrl;

          await supabase
            .from('profiles')
            .update(updates)
            .eq('user_id', user?.id);
        }

        Alert.alert('成功', 'プロフィールを更新しました', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('エラー', result.error || 'プロフィールの更新に失敗しました');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('エラー', 'プロフィールの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (profileState.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  if (profileState.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{profileState.error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プロフィール編集</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={[styles.saveButtonText, isSaving && styles.saveButtonTextDisabled]}>
            {isSaving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
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
                  <ActivityIndicator color="#06b6d4" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={32} color="#64748b" />
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
                  <ActivityIndicator color="#06b6d4" />
                ) : (
                  <Ionicons name="person-outline" size={40} color="#64748b" />
                )}
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>タップしてアイコン画像を選択</Text>
        </View>

        {/* Display Name */}
        <View style={styles.section}>
          <Text style={styles.label}>表示名 *</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="表示名を入力"
            placeholderTextColor="#6B7280"
            maxLength={50}
          />
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>自己紹介</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="自己紹介を入力"
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </View>

        {/* 国籍 */}
        <View style={styles.section}>
          <Text style={styles.label}>国籍 *</Text>
          <TouchableOpacity
            style={styles.countrySelector}
            onPress={() => setShowCountryPicker(true)}
          >
            <Image source={getFlagSource(countryCode)} style={styles.selectedFlag} />
            <Text style={styles.selectedCountryText}>
              {COUNTRIES.find(c => c.code === countryCode)?.nameJa || '選択してください'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Country Picker Modal */}
          <Modal
            visible={showCountryPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowCountryPicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowCountryPicker(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.pickerModal}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>国籍を選択</Text>
                    <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.pickerList}>
                    {COUNTRIES.map((country) => (
                      <TouchableOpacity
                        key={country.code}
                        style={[
                          styles.pickerItem,
                          countryCode === country.code && styles.pickerItemActive,
                        ]}
                        onPress={() => {
                          setCountryCode(country.code);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Image source={getFlagSource(country.code)} style={styles.pickerFlag} />
                        <Text
                          style={[
                            styles.pickerItemText,
                            countryCode === country.code && styles.pickerItemTextActive,
                          ]}
                        >
                          {country.nameJa}
                        </Text>
                        {countryCode === country.code && (
                          <Ionicons name="checkmark" size={20} color="#06b6d4" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
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

        {/* Skill Level */}
        <View style={styles.section}>
          <Text style={styles.label}>スキルレベル</Text>
          <View style={styles.buttonGroup}>
            {SKILL_LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.levelButton,
                  level === lvl && styles.levelButtonActive,
                ]}
                onPress={() => setLevel(lvl)}
              >
                <Text style={[
                  styles.levelButtonText,
                  level === lvl && styles.levelButtonTextActive,
                ]}>
                  {lvl === 'beginner' ? '初心者' : lvl === 'intermediate' ? '中級者' : '上級者'}
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#06b6d4',
  },
  saveButtonTextDisabled: {
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  // ヘッダー画像スタイル
  headerImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
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
    color: '#64748b',
    marginTop: 8,
  },
  // アバター画像スタイル
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
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
    backgroundColor: '#1e293b',
  },
  avatarHint: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  // 国籍セレクタースタイル
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  selectedFlag: {
    width: 32,
    height: 22,
    resizeMode: 'contain',
  },
  selectedCountryText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  // ピッカーモーダルスタイル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  pickerItemActive: {
    backgroundColor: '#1e293b',
  },
  pickerFlag: {
    width: 32,
    height: 22,
    resizeMode: 'contain',
  },
  pickerItemText: {
    flex: 1,
    fontSize: 16,
    color: '#cbd5e1',
  },
  pickerItemTextActive: {
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
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  languageButtonActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#0e7490',
  },
  languageText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  languageTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  levelButtonTextActive: {
    color: '#FFFFFF',
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  styleButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#334155',
  },
  styleButtonActive: {
    backgroundColor: '#0e7490',
    borderColor: '#06b6d4',
  },
  styleText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  styleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
