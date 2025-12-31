import { COUNTRIES, getFlagSource } from '@/constants/countries';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { pickAndUploadImage } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabase';
import type { SkillLevel } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
      height: 500,
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
      // maxHeight removed to fill available space
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
      alignItems: 'center',
    },
    languageButtonActive: {
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
      alignItems: 'center',
    },
    skillButtonActive: {
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
    },
    styleButtonActive: {
      backgroundColor: colors.tint,
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
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);

  // フォーム状態
  const [displayName, setDisplayName] = useState('');
  const [countryCode, setCountryCode] = useState('JP');
  const [language, setLanguage] = useState<'ja' | 'en'>('ja'); // デフォルトは日本語
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
      Alert.alert(t('common.error'), t('profileSetup.errorUserNotFound'));
      return;
    }

    if (!displayName.trim()) {
      Alert.alert(t('common.error'), t('profileSetup.errorDisplayNameRequired'));
      return;
    }

    if (!countryCode) {
      Alert.alert(t('common.error'), t('profileSetup.errorNationalityRequired'));
      return;
    }

    // 言語は必須でデフォルト値があるため、バリデーション不要

    try {
      setLoading(true);

      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        header_url: headerUrl,
        country_code: countryCode,
        languages: [language], // 単一言語を配列として保存
        level: skillLevel,
        styles: ridingStyle,
        bio: bio.trim() || null,
        home_resort_id: homeResortId,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert(t('common.error'), t('profileSetup.errorProfileExists'));
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
      Alert.alert(t('common.error'), t('profileSetup.errorCreateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profileSetup.title')}</Text>
          <Text style={styles.subtitle}>{t('profileSetup.subtitle')}</Text>
        </View>

        {/* ヘッダー画像 */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('profileSetup.header')}</Text>
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
                    <Text style={styles.placeholderText}>{t('profileSetup.headerPlaceholder')}</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* アバター画像 */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('profileSetup.avatar')}</Text>
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
          <Text style={styles.avatarHint}>{t('profileSetup.avatarHint')}</Text>
        </View>

        {/* 表示名 */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('profileSetup.displayName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('profileSetup.displayNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        {/* 国籍 */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('profileSetup.nationality')}</Text>
          <TouchableOpacity
            style={styles.countrySelector}
            onPress={() => setShowCountryPicker(true)}
          >
            <Image source={getFlagSource(countryCode)} style={styles.selectedFlag} />
            <Text style={styles.selectedCountryText}>
              {(() => {
                const country = COUNTRIES.find(c => c.code === countryCode);
                if (!country) return t('profileSetup.selectCountry');
                return locale === 'en' ? country.nameEn : country.nameJa;
              })()}
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
              <View style={[styles.pickerModal, { paddingBottom: insets.bottom }]}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>{t('profileSetup.selectNationality')}</Text>
                  <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={COUNTRIES}
                  style={{ flex: 1 }}
                  keyExtractor={(item) => item.code}
                  initialNumToRender={20}
                  getItemLayout={(data, index) => ({ length: 55, offset: 55 * index, index })}
                  renderItem={({ item: country }) => (
                      <TouchableOpacity
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
                          {locale === 'en' ? country.nameEn : country.nameJa}
                        </Text>
                        {countryCode === country.code && (
                          <Ionicons name="checkmark" size={20} color={colors.tint} />
                        )}
                      </TouchableOpacity>
                    )}
                  />
              </View>
            </TouchableOpacity>
          </Modal>
        </View>

        {/* 言語 */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('profileSetup.language')}</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                language === 'ja' && styles.languageButtonActive,
              ]}
              onPress={() => setLanguage('ja')}
            >
              <Text
                style={[
                  styles.languageText,
                  language === 'ja' && styles.languageTextActive,
                ]}
              >
                {t('profileSetup.japanese')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                language === 'en' && styles.languageButtonActive,
              ]}
              onPress={() => setLanguage('en')}
            >
              <Text
                style={[
                  styles.languageText,
                  language === 'en' && styles.languageTextActive,
                ]}
              >
                {t('profileSetup.english')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* スキルレベル */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('profileSetup.skillLevel')}</Text>
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
                  {level === 'beginner' ? t('profileSetup.beginner') : level === 'intermediate' ? t('profileSetup.intermediate') : t('profileSetup.advanced')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ライディングスタイル */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('profileSetup.ridingStyle')}</Text>
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
          <Text style={styles.label}>{t('profileSetup.bio')}</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder={t('profileSetup.bioPlaceholder')}
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
            <Text style={styles.submitButtonText}>{t('profileSetup.createProfile')}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </View>
    </ScrollView>
  );
}
