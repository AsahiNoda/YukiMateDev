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
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { SkillLevel } from '@/types';
import { pickAndUploadImage } from '@/lib/imageUpload';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRIES, getFlagSource } from '@/constants/countries';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

type RidingStyle = 'Freeride' | 'Powder' | 'Carving' | 'Park' | 'Backcountry';

const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

const RIDING_STYLES: RidingStyle[] = [
  'Freeride',
  'Powder',
  'Carving',
  'Park',
  'Backcountry',
];

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    input: {
      backgroundColor: colors.backgroundSecondary,
      color: colors.text,
      fontSize: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bioInput: {
      minHeight: 100,
      paddingTop: 16,
    },
    hint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
    },
    // ヘッダー画像スタイル
    headerImageContainer: {
      width: '100%',
      height: 180,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: colors.border,
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
      color: colors.textSecondary,
      marginTop: 8,
    },
    // アバター画像スタイル
    avatarContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      overflow: 'hidden',
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 3,
      borderColor: colors.border,
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
      backgroundColor: colors.backgroundSecondary,
    },
    avatarHint: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    // 国籍セレクタースタイル
    countrySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderWidth: 2,
      borderColor: colors.border,
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
      color: colors.text,
    },
    // ピッカーモーダルスタイル
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    pickerModal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      borderWidth: 2,
      borderColor: colors.border,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
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
      borderBottomColor: colors.borderLight,
    },
    pickerItemActive: {
      backgroundColor: colors.backgroundSecondary,
    },
    pickerFlag: {
      width: 32,
      height: 22,
      resizeMode: 'contain',
    },
    pickerItemText: {
      flex: 1,
      fontSize: 16,
      color: colors.textSecondary,
    },
    pickerItemTextActive: {
      color: colors.text,
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
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    languageButtonActive: {
      borderColor: colors.tint,
      backgroundColor: colors.tint,
    },
    languageText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    languageTextActive: {
      color: colors.text,
      fontWeight: 'bold',
    },
    // スキルレベルスタイル
    skillButton: {
      flex: 1,
      paddingVertical: 16,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    skillButtonActive: {
      borderColor: colors.tint,
      backgroundColor: colors.tint,
    },
    skillText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    skillTextActive: {
      color: colors.text,
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
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.border,
    },
    styleButtonActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    styleText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    styleTextActive: {
      color: colors.text,
      fontWeight: '600',
    },
    submitButton: {
      marginTop: 24,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.tint,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
  });
}

export default function ProfileSetupScreen() {
  const { user, refreshProfile } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const styles = React.useMemo(() => createStyles(colors), [colors]);
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

  // UI状態
  const [showCountryPicker, setShowCountryPicker] = useState(false);

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
                  <ActivityIndicator color={colors.tint} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={32} color={colors.icon} />
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
                  <ActivityIndicator color={colors.tint} />
                ) : (
                  <Ionicons name="person-outline" size={40} color={colors.icon} />
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
            placeholderTextColor={colors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
          />
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
            <Ionicons name="chevron-down" size={20} color={colors.icon} />
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
                      <Ionicons name="close" size={24} color={colors.text} />
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
                          <Ionicons name="checkmark" size={20} color={colors.tint} />
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
            placeholderTextColor={colors.textSecondary}
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
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.submitButtonText}>プロフィールを作成</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
}
