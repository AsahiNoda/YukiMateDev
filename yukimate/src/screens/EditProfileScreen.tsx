import {
  CountryField,
  CountryPickerModal,
  FormInput,
  FormSection,
  GearFields,
  LevelSelector,
  PhotoFields,
  SocialFields,
  StyleSelector,
} from '@/components/profile/ProfileFormParts';
import { PillButton } from '@/components/ui/PillButton';
import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import type { SkillLevel } from '@/types/common';
import type { SocialLinks } from '@/types';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useAuth } from '@contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { updateGear, updateProfile, useProfile } from '@hooks/useProfile';
import { useResorts } from '@hooks/useResorts';
import { pickAndUploadImage } from '@lib/imageUpload';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const profileState = useProfile(undefined, refreshKey);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [countryCode, setCountryCode] = useState('JP');
  // const [languages, setLanguages] = useState<string[]>([]); // Language selection removed
  const [ridingStyle, setRidingStyle] = useState<RidingStyle[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // お気に入りスキー場（複数）
  const [favoriteResortIds, setFavoriteResortIds] = useState<string[]>([]);
  const [showResortPicker, setShowResortPicker] = useState(false);
  const resortsState = useResorts();

  // ギア
  const [board, setBoard] = useState('');
  const [binding, setBinding] = useState('');
  const [boots, setBoots] = useState('');

  // SNSリンク（ハンドル/URL）
  const [instagram, setInstagram] = useState('');
  const [twitterX, setTwitterX] = useState('');
  const [youtube, setYoutube] = useState('');
  const [tiktok, setTiktok] = useState('');

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
      // setLanguages(profile.languages || []); // Language selection removed
      setRidingStyle((profile.styles as RidingStyle[]) || []);
      setFavoriteResortIds(profile.favoriteResorts.map((r) => r.id));
      setBoard(profile.gear?.board || '');
      setBinding(profile.gear?.binding || '');
      setBoots(profile.gear?.boots || '');
      setInstagram(profile.socialLinks.instagram || '');
      setTwitterX(profile.socialLinks.x || '');
      setYoutube(profile.socialLinks.youtube || '');
      setTiktok(profile.socialLinks.tiktok || '');

      // 画像URLは、既にローカルステートに最新のものがある場合はそれを維持
      // （アップロード直後の場合、ローカルステートの方が新しいため）
      setAvatarUrl(prev => {
        // 既に値がセットされている場合（アップロード直後）はそれを維持
        if (prev && prev.includes('?t=')) return prev;
        // そうでない場合はプロフィールから取得
        // URLはアップロード時に ?t=<更新時刻> 付きで保存されているのでそのまま使う（画像キャッシュを効かせる）
        return profile.avatarUrl;
      });
      setHeaderUrl(prev => {
        // 既に値がセットされている場合（アップロード直後）はそれを維持
        if (prev && prev.includes('?t=')) return prev;
        // そうでない場合はプロフィールから取得
        // URLはアップロード時に ?t=<更新時刻> 付きで保存されているのでそのまま使う（画像キャッシュを効かせる）
        return profile.headerUrl;
      });
    }
  }, [profileState]);

  const toggleRidingStyle = (style: RidingStyle) => {
    if (ridingStyle.includes(style)) {
      setRidingStyle(ridingStyle.filter((s) => s !== style));
    } else {
      setRidingStyle([...ridingStyle, style]);
    }
  };

  const toggleFavoriteResort = (resortId: string) => {
    setFavoriteResortIds((prev) =>
      prev.includes(resortId) ? prev.filter((id) => id !== resortId) : [...prev, resortId]
    );
  };

  // ハンドルから余計な記号/URLを除去（@や末尾スラッシュなど）
  const cleanHandle = (value: string) =>
    value.trim().replace(/^@/, '').replace(/\/+$/, '');

  const { t, locale } = useTranslation();

  // const toggleLanguage = (language: string) => { ... } // Language selection removed

  // アバター画像をアップロード
  const handleAvatarUpload = async () => {
    if (!user?.id) return;

    setUploadingAvatar(true);
    const url = await pickAndUploadImage(user.id, 'avatar');
    if (url) {
      // キャッシュバスターを除去してベースURLのみを取得
      const baseUrl = url.split('?')[0];

      setAvatarUrl(url); // 表示用には最新のキャッシュバスター付きURL
      // 画像アップロード直後にDBに保存（ベースURLのみ）
      const result = await updateProfile({ avatarUrl: baseUrl });
      if (result.success) {
        // プロフィールを再読み込みして最新のデータを取得
        setRefreshKey(prev => prev + 1);
      } else {
        Alert.alert(t('common.error'), t('editProfileScreen.avatarSaveError'));
      }
    }
    setUploadingAvatar(false);
  };

  // ヘッダー画像をアップロード
  const handleHeaderUpload = async () => {
    if (!user?.id) return;

    setUploadingHeader(true);
    const url = await pickAndUploadImage(user.id, 'header');
    if (url) {
      // キャッシュバスターを除去してベースURLのみを取得
      const baseUrl = url.split('?')[0];

      setHeaderUrl(url); // 表示用には最新のキャッシュバスター付きURL
      // 画像アップロード直後にDBに保存（ベースURLのみ）
      const result = await updateProfile({ headerUrl: baseUrl });
      if (result.success) {
        // プロフィールを再読み込みして最新のデータを取得
        setRefreshKey(prev => prev + 1);
      } else {
        Alert.alert(t('common.error'), t('editProfileScreen.headerSaveError'));
      }
    }
    setUploadingHeader(false);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert(t('common.error'), t('editProfileScreen.displayNameRequired'));
      return;
    }

    // Language check removed
    /*
    if (languages.length === 0) {
      Alert.alert('エラー', '少なくとも1つの言語を選択してください');
      return;
    }
    */

    setIsSaving(true);
    try {
      // キャッシュバスターを除去してベースURLのみを保存
      const cleanAvatarUrl = avatarUrl ? avatarUrl.split('?')[0] : undefined;
      const cleanHeaderUrl = headerUrl ? headerUrl.split('?')[0] : undefined;

      // SNSリンク（入力があるものだけ保存）
      const socialLinks: SocialLinks = {};
      const ig = cleanHandle(instagram);
      const xh = cleanHandle(twitterX);
      const yt = youtube.trim();
      const tt = cleanHandle(tiktok);
      if (ig) socialLinks.instagram = ig;
      if (xh) socialLinks.x = xh;
      if (yt) socialLinks.youtube = yt;
      if (tt) socialLinks.tiktok = tt;

      // プロフィール本体・ギアを並行更新（お気に入りスキー場はゲレンデページの ♡ で管理するのでここでは保存しない）
      const [result, gearResult] = await Promise.all([
        updateProfile({
          displayName: displayName.trim(),
          bio: bio.trim() || undefined,
          level: level || undefined,
          countryCode,
          languages: [],
          styles: ridingStyle,
          avatarUrl: cleanAvatarUrl,
          headerUrl: cleanHeaderUrl,
          socialLinks,
        }),
        updateGear({
          board: board.trim(),
          binding: binding.trim(),
          boots: boots.trim(),
        }),
      ]);

      const firstError = !result.success
        ? result.error
        : !gearResult.success
          ? gearResult.error
          : null;

      if (!firstError) {
        Alert.alert(t('editProfileScreen.updateSuccessTitle'), t('editProfileScreen.updateSuccessMessage'), [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert(t('editProfileScreen.updateErrorTitle'), firstError || t('editProfileScreen.updateErrorMessage'));
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert(t('editProfileScreen.updateErrorTitle'), t('editProfileScreen.updateErrorMessage'));
    } finally {
      setIsSaving(false);
    }
  };

  if (profileState.status === 'loading') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (profileState.status === 'error') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{profileState.error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* ヘッダー：戻る／プロフィールを編集／保存 */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('editProfileScreen.title')}</Text>
        <PillButton title={t('editProfileScreen.save')} size="sm" onPress={handleSave} loading={isSaving} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <PhotoFields
          headerUrl={headerUrl}
          avatarUrl={avatarUrl}
          role={profileState.status === 'success' ? profileState.data.role : 'user'}
          uploadingHeader={uploadingHeader}
          uploadingAvatar={uploadingAvatar}
          onPickHeader={handleHeaderUpload}
          onPickAvatar={handleAvatarUpload}
        />

        <FormSection title={t('profileForm.basic')}>
          <FormInput
            label={t('editProfileScreen.displayNameLabel')}
            required
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('editProfileScreen.displayNamePlaceholder')}
            maxLength={50}
          />
          <CountryField code={countryCode} onPress={() => setShowCountryPicker(true)} label={t('editProfileScreen.nationalityLabel')} />
          <FormInput
            label={t('editProfileScreen.bioLabel')}
            value={bio}
            onChangeText={setBio}
            placeholder={t('editProfileScreen.bioPlaceholder')}
            multiline
            maxLength={500}
            showCounter
          />
        </FormSection>

        <FormSection title={t('profileForm.riding')}>
          <LevelSelector value={level} onChange={setLevel} label={t('editProfileScreen.skillLevelLabel')} />
          <StyleSelector options={RIDING_STYLES} values={ridingStyle} onToggle={toggleRidingStyle} label={t('editProfileScreen.ridingStyleLabel')} />
        </FormSection>

        {/* ギアは名前だけ */}
        <FormSection title={t('profileForm.gear')}>
          <GearFields
            board={board}
            binding={binding}
            boots={boots}
            onChange={(key, value) => (key === 'board' ? setBoard(value) : key === 'binding' ? setBinding(value) : setBoots(value))}
          />
        </FormSection>

        <FormSection title={t('profileForm.social')}>
          <SocialFields
            values={{ instagram, x: twitterX, youtube, tiktok }}
            onChange={(key, value) =>
              key === 'instagram' ? setInstagram(value) : key === 'x' ? setTwitterX(value) : key === 'youtube' ? setYoutube(value) : setTiktok(value)
            }
          />
        </FormSection>
        {/* 保存はヘッダー右上のボタンだけ（スクロールしても常に見える） */}
      </ScrollView>

      <CountryPickerModal
        visible={showCountryPicker}
        selected={countryCode}
        onSelect={(code) => {
          setCountryCode(code);
          setShowCountryPicker(false);
        }}
        onClose={() => setShowCountryPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is set dynamically
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor is set dynamically
  },
  errorText: {
    // color is set dynamically
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    // borderBottomColor is set dynamically
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
    // color is set dynamically
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    // color is set dynamically
  },
  saveButtonTextDisabled: {
    // color is set dynamically
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
    // color is set dynamically
    marginBottom: 8,
  },
  input: {
    // backgroundColor, borderColor, color are set dynamically
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    // color is set dynamically
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
    // color is set dynamically
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
    // color is set dynamically
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
    height: 500,
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
    // maxHeight removed to fill available space
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
  snsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  snsIcon: {
    width: 24,
    textAlign: 'center',
  },
  snsInput: {
    flex: 1,
  },
  styleButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 20,
  },
  styleButtonActive: {
    backgroundColor: '#0e7490',
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
