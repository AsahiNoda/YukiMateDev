import { borderRadius, fontSize, fontWeight } from '@/constants/spacing';
import {
  CountryField,
  CountryPickerModal,
  FormInput,
  FormLabel,
  FormSection,
  GearFields,
  LevelSelector,
  PhotoFields,
  SocialFields,
  StyleSelector,
  type SocialKey,
} from '@/components/profile/ProfileFormParts';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { COUNTRIES, getFlagSource } from '@/constants/countries';
import { useAppColors } from '@/hooks/useAppColors';
import { updateGear } from '@/hooks/useProfile';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResorts } from '@/hooks/useResorts';
import { useTranslation } from '@/hooks/useTranslation';
import { pickAndUploadImage } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabase';
import type { SkillLevel } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
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
      fontSize: fontSize.xxxl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    label: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      marginBottom: 12,
    },
    input: {
      backgroundColor: colors.backgroundSecondary,
      color: colors.text,
      fontSize: fontSize.md,
      padding: 16,
      borderRadius: borderRadius.card,
    },
    bioInput: {
      minHeight: 100,
      paddingTop: 16,
    },
    hint: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
      marginTop: 8,
    },
    // ヘッダー画像スタイル
    headerImageContainer: {
      width: '100%',
      height: 180,
      borderRadius: borderRadius.card,
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
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: 8,
    },
    // アバター画像スタイル
    avatarContainer: {
      width: 120,
      height: 120,
      borderRadius: borderRadius.round,
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
      fontSize: fontSize.xs,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    // 国籍セレクタースタイル
    countrySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.card,
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
      fontSize: fontSize.md,
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
      borderTopLeftRadius: borderRadius.glass,
      borderTopRightRadius: borderRadius.glass,
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
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
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
      fontSize: fontSize.md,
      color: colors.textSecondary,
    },
    pickerItemTextActive: {
      color: colors.text,
      fontWeight: fontWeight.semibold,
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
      borderRadius: borderRadius.card,
      alignItems: 'center',
    },
    languageButtonActive: {
      backgroundColor: colors.tint,
    },
    languageText: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
    },
    languageTextActive: {
      color: colors.text,
      fontWeight: fontWeight.bold,
    },
    // スキルレベルスタイル
    skillButton: {
      flex: 1,
      paddingVertical: 16,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.card,
      alignItems: 'center',
    },
    skillButtonActive: {
      backgroundColor: colors.tint,
    },
    skillText: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
    },
    skillTextActive: {
      color: colors.text,
      fontWeight: fontWeight.bold,
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
      borderRadius: borderRadius.glass,
    },
    styleButtonActive: {
      backgroundColor: colors.tint,
    },
    styleText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    styleTextActive: {
      color: colors.text,
      fontWeight: fontWeight.semibold,
    },
    submitButton: {
      marginTop: 24,
      paddingVertical: 16,
      borderRadius: borderRadius.card,
      backgroundColor: colors.tint,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
    },
  });
}

export default function ProfileSetupScreen() {
  const { user, refreshProfile } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);

  // フォーム状態
  const [displayName, setDisplayName] = useState('');
  const [countryCode, setCountryCode] = useState('JP');
  const [language, setLanguage] = useState<'ja' | 'en'>('ja'); // デフォルトは日本語
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [ridingStyle, setRidingStyle] = useState<RidingStyle[]>([]);
  const [bio, setBio] = useState('');

  // ギア（名前だけ）・SNS（任意）
  const [gear, setGear] = useState({ board: '', binding: '', boots: '' });
  const [socials, setSocials] = useState<Record<SocialKey, string>>({ instagram: '', x: '', youtube: '', tiktok: '' });

  // お気に入りスキー場（複数）
  const [favoriteResortIds, setFavoriteResortIds] = useState<string[]>([]);
  const [showResortPicker, setShowResortPicker] = useState(false);
  const resortsState = useResorts();

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

  const toggleFavoriteResort = (resortId: string) => {
    setFavoriteResortIds((prev) =>
      prev.includes(resortId) ? prev.filter((id) => id !== resortId) : [...prev, resortId]
    );
  };
  // プロフィールが既に存在するか確認
  useEffect(() => {
    const checkProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .single();

        if (data) {
          console.log('✅ Profile already exists, redirecting to home...');
          router.replace('/(tabs)/home');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }
    };

    checkProfile();
  }, [user]);



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
        home_resort_id: null,
        social_links: (() => {
          const clean = (v: string) => v.trim().replace(/^@/, '').replace(/\/+$/, '');
          const links: Record<string, string> = {};
          if (clean(socials.instagram)) links.instagram = clean(socials.instagram);
          if (clean(socials.x)) links.x = clean(socials.x);
          if (socials.youtube.trim()) links.youtube = socials.youtube.trim();
          if (clean(socials.tiktok)) links.tiktok = clean(socials.tiktok);
          return links;
        })(),
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

      // ギア（入力があれば。失敗してもプロフィール作成は続ける）
      if (gear.board.trim() || gear.binding.trim() || gear.boots.trim()) {
        const gearResult = await updateGear({
          board: gear.board.trim(),
          binding: gear.binding.trim(),
          boots: gear.boots.trim(),
        });
        if (!gearResult.success) console.warn('Gear save failed:', gearResult.error);
      }

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
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: Math.max(insets.top, 16) + 8, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
          {t('profileSetup.title')}
        </Text>
        <Text style={[styles.subtitle, { color: c.chipText, marginBottom: 20 }]}>{t('profileSetup.subtitle')}</Text>

        <PhotoFields
          headerUrl={headerUrl}
          avatarUrl={avatarUrl}
          uploadingHeader={uploadingHeader}
          uploadingAvatar={uploadingAvatar}
          onPickHeader={handleHeaderUpload}
          onPickAvatar={handleAvatarUpload}
        />

        <FormSection title={t('profileForm.basic')}>
          <FormInput
            label={t('profileSetup.displayName')}
            required
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t('profileSetup.displayNamePlaceholder')}
            maxLength={50}
          />
          <CountryField code={countryCode} onPress={() => setShowCountryPicker(true)} label={t('profileSetup.nationality')} />
          <View style={{ gap: 6 }}>
            <FormLabel label={t('profileSetup.language')} required />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label={t('profileSetup.japanese')} selected={language === 'ja'} onPress={() => setLanguage('ja')} />
              <Chip label={t('profileSetup.english')} selected={language === 'en'} onPress={() => setLanguage('en')} />
            </View>
          </View>
          <FormInput
            label={t('profileSetup.bio')}
            value={bio}
            onChangeText={setBio}
            placeholder={t('profileSetup.bioPlaceholder')}
            multiline
            maxLength={500}
            showCounter
          />
        </FormSection>

        <FormSection title={t('profileForm.riding')}>
          <LevelSelector value={skillLevel} onChange={setSkillLevel} label={t('profileSetup.skillLevel')} />
          <StyleSelector options={RIDING_STYLES} values={ridingStyle} onToggle={toggleRidingStyle} label={t('profileSetup.ridingStyle')} />
        </FormSection>

        {/* ギアは名前だけ（任意） */}
        <FormSection title={t('profileForm.gear')}>
          <GearFields
            board={gear.board}
            binding={gear.binding}
            boots={gear.boots}
            onChange={(key, value) => setGear((g) => ({ ...g, [key]: value }))}
          />
        </FormSection>

        <FormSection title={t('profileForm.social')}>
          <SocialFields values={socials} onChange={(key, value) => setSocials((v) => ({ ...v, [key]: value }))} />
        </FormSection>

        <PillButton title={t('profileSetup.createProfile')} onPress={handleSubmit} loading={loading} fill />
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
