import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import type { SkillLevel } from '@/types/common';
import type { SocialLinks } from '@/types';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useAuth } from '@contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { updateFavoriteResorts, updateGear, updateProfile, useProfile } from '@hooks/useProfile';
import { useResorts } from '@hooks/useResorts';
import { pickAndUploadImage } from '@lib/imageUpload';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  View
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
        // そうでない場合はプロフィールから取得し、キャッシュバスターを追加
        if (profile.avatarUrl) {
          // 既にキャッシュバスターが含まれている場合はそのまま、なければ追加
          return profile.avatarUrl.includes('?t=')
            ? profile.avatarUrl
            : `${profile.avatarUrl}?t=${Date.now()}`;
        }
        return profile.avatarUrl;
      });
      setHeaderUrl(prev => {
        // 既に値がセットされている場合（アップロード直後）はそれを維持
        if (prev && prev.includes('?t=')) return prev;
        // そうでない場合はプロフィールから取得し、キャッシュバスターを追加
        if (profile.headerUrl) {
          // 既にキャッシュバスターが含まれている場合はそのまま、なければ追加
          return profile.headerUrl.includes('?t=')
            ? profile.headerUrl
            : `${profile.headerUrl}?t=${Date.now()}`;
        }
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

      // プロフィール本体・ギア・お気に入りを並行更新
      const [result, gearResult, favResult] = await Promise.all([
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
        updateFavoriteResorts(favoriteResortIds),
      ]);

      const firstError = !result.success
        ? result.error
        : !gearResult.success
          ? gearResult.error
          : !favResult.success
            ? favResult.error
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('editProfileScreen.title')}</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={[styles.saveButtonText, { color: colors.tint }, isSaving && { color: colors.icon }]}>
            {isSaving ? t('editProfileScreen.saving') : t('editProfileScreen.save')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* ヘッダー画像 */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.headerLabel')}</Text>
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
                    <Text style={[styles.placeholderText, { color: colors.icon }]}>{t('editProfileScreen.headerPlaceholder')}</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* アバター画像 */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.avatarLabel')}</Text>
          <TouchableOpacity
            onPress={handleAvatarUpload}
            disabled={uploadingAvatar}
            style={{ alignSelf: 'center', marginBottom: 8 }}
          >
            <RoleBasedAvatar
              avatarUrl={avatarUrl}
              role={profileState.status === 'success' ? profileState.data.role : 'user'}
              size={120}
              showBadge={true}
            />
            {uploadingAvatar && (
              <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 60 }]}>
                <ActivityIndicator color={colors.tint} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.icon }]}>{t('editProfileScreen.avatarHint')}</Text>
        </View>

        {/* Display Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.displayNameLabel')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('editProfileScreen.displayNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            maxLength={50}
          />
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.bioLabel')}</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
            value={bio}
            onChangeText={setBio}
            placeholder={t('editProfileScreen.bioPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.icon }]}>{bio.length}/500</Text>
        </View>

        {/* 国籍 */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.nationalityLabel')}</Text>
          <TouchableOpacity
            style={[styles.countrySelector, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
            onPress={() => setShowCountryPicker(true)}
          >
            <Image source={getFlagSource(countryCode)} style={styles.selectedFlag} />
            <Text style={[styles.selectedCountryText, { color: colors.text }]}>
              {(() => {
                const country = COUNTRIES.find(c => c.code === countryCode);
                if (!country) return t('common.notSpecified');
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
              <View style={[styles.pickerModal, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, paddingBottom: insets.bottom }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('editProfileScreen.selectNationality')}</Text>
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
                          { borderBottomColor: colors.border },
                          countryCode === country.code && { backgroundColor: colors.backgroundSecondary },
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
                            { color: colors.textSecondary },
                            countryCode === country.code && { color: colors.text, fontWeight: '600' },
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

        {/* Language Selection Removed */}
        {/* 
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>言語 * (複数選択可)</Text>
          ...
        </View> 
        */}

        {/* Skill Level */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.skillLevelLabel')}</Text>
          <View style={styles.buttonGroup}>
            {SKILL_LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.levelButton,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                  level === lvl && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                onPress={() => setLevel(lvl)}
              >
                <Text style={[
                  styles.levelButtonText,
                  { color: colors.icon },
                  level === lvl && { color: colors.text },
                ]}>
                  {lvl === 'beginner' ? t('profileSetup.beginner') : lvl === 'intermediate' ? t('profileSetup.intermediate') : t('profileSetup.advanced')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ライディングスタイル */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.ridingStyleLabel')}</Text>
          <View style={styles.styleGrid}>
            {RIDING_STYLES.map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.styleButton,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                  ridingStyle.includes(style) && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                onPress={() => toggleRidingStyle(style)}
              >
                <Text
                  style={[
                    styles.styleText,
                    { color: colors.icon },
                    ridingStyle.includes(style) && { color: colors.text, fontWeight: '600' },
                  ]}
                >
                  {style}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* お気に入りスキー場（複数選択） */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.favoriteResortsLabel')}</Text>
          <TouchableOpacity
            style={[styles.countrySelector, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
            onPress={() => setShowResortPicker(true)}
          >
            <Ionicons name="snow-outline" size={20} color={colors.icon} />
            <Text style={[styles.selectedCountryText, { color: colors.text }]}>
              {favoriteResortIds.length > 0
                ? `${favoriteResortIds.length} ${t('editProfileScreen.favoriteResortsSelected')}`
                : t('editProfileScreen.favoriteResortsPlaceholder')}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.icon} />
          </TouchableOpacity>

          {/* 選択中のチップ */}
          {resortsState.status === 'success' && favoriteResortIds.length > 0 && (
            <View style={[styles.styleGrid, { marginTop: 12 }]}>
              {favoriteResortIds.map((id) => {
                const resort = resortsState.resorts.find((r) => r.id === id);
                if (!resort) return null;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.styleButton, { backgroundColor: colors.tint }]}
                    onPress={() => toggleFavoriteResort(id)}
                  >
                    <Text style={[styles.styleText, { color: '#fff', fontWeight: '600' }]}>
                      {resort.name}  ✕
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Resort Picker Modal（複数選択） */}
          <Modal
            visible={showResortPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowResortPicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowResortPicker(false)}
            >
              <View style={[styles.pickerModal, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, paddingBottom: insets.bottom }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>{t('editProfileScreen.favoriteResortsLabel')}</Text>
                  <TouchableOpacity onPress={() => setShowResortPicker(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                {resortsState.status === 'success' ? (
                  <FlatList
                    data={resortsState.resorts}
                    style={{ flex: 1 }}
                    keyExtractor={(item) => item.id}
                    initialNumToRender={20}
                    renderItem={({ item: resort }) => {
                      const selected = favoriteResortIds.includes(resort.id);
                      return (
                        <TouchableOpacity
                          style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                          onPress={() => toggleFavoriteResort(resort.id)}
                        >
                          <Text style={[styles.pickerItemText, { color: selected ? colors.text : colors.textSecondary, fontWeight: selected ? '600' : '400' }]}>
                            {resort.name}
                          </Text>
                          {selected && <Ionicons name="checkmark" size={20} color={colors.tint} />}
                        </TouchableOpacity>
                      );
                    }}
                  />
                ) : (
                  <ActivityIndicator color={colors.tint} style={{ marginTop: 24 }} />
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>

        {/* ギア */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.gearLabel')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text, marginBottom: 8 }]}
            value={board}
            onChangeText={setBoard}
            placeholder={t('editProfileScreen.gearBoardPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            maxLength={60}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text, marginBottom: 8 }]}
            value={binding}
            onChangeText={setBinding}
            placeholder={t('editProfileScreen.gearBindingPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            maxLength={60}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
            value={boots}
            onChangeText={setBoots}
            placeholder={t('editProfileScreen.gearBootsPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            maxLength={60}
          />
        </View>

        {/* SNSリンク */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('editProfileScreen.socialLinksLabel')}</Text>
          <View style={styles.snsRow}>
            <Ionicons name="logo-instagram" size={22} color={colors.icon} style={styles.snsIcon} />
            <TextInput
              style={[styles.input, styles.snsInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              value={instagram}
              onChangeText={setInstagram}
              placeholder="instagram (@なし)"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              maxLength={60}
            />
          </View>
          <View style={styles.snsRow}>
            <Ionicons name="logo-twitter" size={22} color={colors.icon} style={styles.snsIcon} />
            <TextInput
              style={[styles.input, styles.snsInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              value={twitterX}
              onChangeText={setTwitterX}
              placeholder="X / Twitter (@なし)"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              maxLength={60}
            />
          </View>
          <View style={styles.snsRow}>
            <Ionicons name="logo-youtube" size={22} color={colors.icon} style={styles.snsIcon} />
            <TextInput
              style={[styles.input, styles.snsInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              value={youtube}
              onChangeText={setYoutube}
              placeholder="YouTube (URL)"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              maxLength={120}
            />
          </View>
          <View style={styles.snsRow}>
            <Ionicons name="musical-notes" size={22} color={colors.icon} style={styles.snsIcon} />
            <TextInput
              style={[styles.input, styles.snsInput, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              value={tiktok}
              onChangeText={setTiktok}
              placeholder="TikTok (@なし)"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              maxLength={60}
            />
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
