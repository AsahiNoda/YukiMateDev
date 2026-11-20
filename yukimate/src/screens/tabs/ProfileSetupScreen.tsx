import { logHandled } from '@/lib/logHandled';
import { AuthNotice, AuthScaffold } from '@/components/auth/AuthScaffold';
import { CountryField, CountryPickerModal, FormLabel, LevelSelector, StyleSelector } from '@/components/profile/ProfileFormParts';
import { ResortSearch } from '@/components/snowfeed/ResortSearch';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { TextField } from '@/components/ui/TextField';
import { LANGUAGE_OPTIONS, type LanguageCode } from '@/constants/languages';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAuth } from '@/contexts/AuthContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { pickAndUploadImage } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabase';
import type { SkillLevel } from '@/types';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type RidingStyle = 'Freeride' | 'Powder' | 'Carving' | 'Park' | 'Backcountry';
const RIDING_STYLES: RidingStyle[] = ['Freeride', 'Powder', 'Carving', 'Park', 'Backcountry'];
const NAME_MAX = 50;

/**
 * 新規登録の3・4歩目：プロフィール作成。
 *   3. 自分のこと（写真・名前・レベル・スタイル・国籍・言語）
 *   4. ホームゲレンデ（あとでも設定できる）
 * 自己紹介・ヘッダー画像・ギア・SNS は最初は聞かない（プロフィール編集からいつでも足せる）。
 * HIG：最初に聞くのは使い始めるのに要るものだけ。ホームゲレンデを決めるとホームの天気・投稿がすぐ出る。
 */
export default function ProfileSetupScreen() {
  const c = useAppColors();
  const { t, locale } = useTranslation();
  const { user, refreshProfile, signOut } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [headerUrl, setHeaderUrl] = useState<string | null>(null);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [ridingStyles, setRidingStyles] = useState<RidingStyle[]>([]);
  const [countryCode, setCountryCode] = useState(locale === 'en' ? '' : 'JP');
  // 話せる言語（いくつでも）。先頭はアプリの表示言語にも使われるので、今の表示言語から始める
  const [languages, setLanguages] = useState<LanguageCode[]>([locale === 'en' ? 'en' : 'ja']);
  const [homeResort, setHomeResort] = useState<{ id: string; name: string } | null>(null);

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showResortPicker, setShowResortPicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; country?: string; form?: string }>({});

  // プロフィールがもうある人はホームへ
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) router.replace('/(tabs)/home');
      });
  }, [user?.id]);

  const handleAvatar = async () => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    const url = await pickAndUploadImage(user.id, 'avatar');
    if (url) setAvatarUrl(url);
    setUploadingAvatar(false);
  };

  const handleHeader = async () => {
    if (!user?.id) return;
    setUploadingHeader(true);
    const url = await pickAndUploadImage(user.id, 'header');
    if (url) setHeaderUrl(url);
    setUploadingHeader(false);
  };

  // 最低1つは残す（全部外すと、アプリの表示言語を決められなくなる）
  const toggleLanguage = (code: LanguageCode) =>
    setLanguages((prev) =>
      prev.includes(code) ? (prev.length > 1 ? prev.filter((x) => x !== code) : prev) : [...prev, code]
    );

  const toggleStyle = (s: RidingStyle) =>
    setRidingStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const goNext = () => {
    const nameError = displayName.trim() ? undefined : t('onboarding.nameRequired');
    const countryError = countryCode ? undefined : t('onboarding.countryRequired');
    setErrors({ name: nameError, country: countryError });
    if (nameError || countryError) return;
    setStep(2);
  };

  const finish = async (resortId: string | null) => {
    if (!user?.id) {
      setErrors({ form: t('onboarding.genericError') });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
        header_url: headerUrl,
        country_code: countryCode,
        languages,
        level: skillLevel,
        styles: ridingStyles,
        bio: null,
        home_resort_id: resortId,
        social_links: {},
      });
      // 23505 = もう作られている（二重送信など）→ そのままホームへ
      if (error && error.code !== '23505') throw error;
      await refreshProfile();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      logHandled('ProfileSetup', error);
      setErrors({ form: t('onboarding.profileSaveFailed') });
    } finally {
      setSaving(false);
    }
  };

  // ---------- 4歩目：ホームゲレンデ ----------
  if (step === 2) {
    return (
      <>
        <AuthScaffold
          title={t('onboarding.homeResortTitle')}
          subtitle={t('onboarding.homeResortSubtitle')}
          step={{ current: 4, total: 4 }}
          onBack={() => setStep(1)}
          footer={
            <Pressable
              onPress={() => finish(null)}
              disabled={saving}
              style={styles.textButton}
              accessibilityRole="button"
              testID="setup-skip-resort"
            >
              <Text style={[styles.textButtonLabel, { color: c.tintText }]}>{t('onboarding.setLater')}</Text>
            </Pressable>
          }
        >
          {errors.form ? <AuthNotice text={errors.form} /> : null}
          <Pressable
            onPress={() => setShowResortPicker(true)}
            style={({ pressed }) => [
              styles.resortRow,
              { backgroundColor: c.backgroundSecondary, borderColor: homeResort ? c.tintText : c.glassCardBorder },
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={homeResort ? homeResort.name : t('onboarding.chooseResort')}
            testID="setup-choose-resort"
          >
            <View style={styles.flex}>
              <Text style={[styles.resortLabel, { color: c.textMuted }]}>{t('onboarding.homeResortLabel')}</Text>
              <Text style={[styles.resortName, { color: homeResort ? c.text : c.textLabel }]} numberOfLines={1}>
                {homeResort ? homeResort.name : t('onboarding.chooseResort')}
              </Text>
            </View>
            <Text style={[styles.change, { color: c.tintText }]}>{homeResort ? t('onboarding.change') : t('onboarding.choose')}</Text>
          </Pressable>
          {/* まだ選んでいないときは押すと一覧を開く（ボタンを無効にして理由が分からない状態にしない） */}
          <PillButton
            title={homeResort ? t('onboarding.startUsing') : t('onboarding.chooseResort')}
            onPress={() => (homeResort ? finish(homeResort.id) : setShowResortPicker(true))}
            loading={saving}
            testID="setup-finish"
          />
        </AuthScaffold>

        <Modal
          visible={showResortPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowResortPicker(false)}
        >
          <ResortSearch
            title={t('onboarding.homeResortLabel')}
            selectedId={homeResort?.id ?? null}
            onSelectResort={(id, name) => {
              setHomeResort({ id, name });
              setShowResortPicker(false);
            }}
            onClose={() => setShowResortPicker(false)}
          />
        </Modal>
      </>
    );
  }

  // ---------- 3歩目：自分のこと ----------
  return (
    <>
      <AuthScaffold
        title={t('onboarding.profileTitle')}
        subtitle={t('onboarding.profileSubtitle')}
        step={{ current: 3, total: 4 }}
        footer={
          <Pressable
            onPress={async () => {
              await signOut().catch(() => {});
              router.replace('/(auth)/sign-in');
            }}
            style={styles.textButton}
            accessibilityRole="button"
          >
            <Text style={[styles.textButtonLabel, { color: c.textMuted }]}>{t('onboarding.signOutInstead')}</Text>
          </Pressable>
        }
      >
        {/* 写真（任意）：横長のヘッダーと、その左下に重ねた丸いアイコン。どちらも押すと写真を選ぶ */}
        <View style={styles.photos}>
          <Pressable
            onPress={handleHeader}
            disabled={uploadingHeader}
            style={[styles.header, { backgroundColor: c.backgroundSecondary, borderColor: c.glassCardBorder }]}
            accessibilityRole="button"
            accessibilityLabel={headerUrl ? t('onboarding.changeHeader') : t('onboarding.addHeader')}
            testID="setup-header"
          >
            {uploadingHeader ? (
              <ActivityIndicator color={c.tintText} />
            ) : headerUrl ? (
              <Image source={{ uri: headerUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <PlusBadge size={32} />
            )}
          </Pressable>
          <Pressable
            onPress={handleAvatar}
            disabled={uploadingAvatar}
            style={[styles.avatar, { backgroundColor: c.softTintChipBackground, borderColor: c.background }]}
            accessibilityRole="button"
            accessibilityLabel={avatarUrl ? t('onboarding.changePhoto') : t('onboarding.addPhoto')}
            testID="setup-avatar"
          >
            {uploadingAvatar ? (
              <ActivityIndicator color={c.tintText} />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <PlusBadge size={28} />
            )}
          </Pressable>
        </View>

        <TextField
          label={t('onboarding.nameLabel')}
          value={displayName}
          onChangeText={setDisplayName}
          error={errors.name}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          textContentType="nickname"
          returnKeyType="done"
          testID="setup-name"
        />

        <LevelSelector value={skillLevel} onChange={setSkillLevel} label={t('onboarding.levelLabel')} />
        <StyleSelector options={RIDING_STYLES} values={ridingStyles} onToggle={toggleStyle} label={t('onboarding.stylesLabel')} />

        <View style={styles.field}>
          <CountryField code={countryCode} onPress={() => setShowCountryPicker(true)} label={t('onboarding.countryLabel')} />
          {errors.country ? <Text style={[styles.inlineError, { color: c.danger }]}>{errors.country}</Text> : null}
        </View>

        <View style={styles.field}>
          <FormLabel label={t('onboarding.languageLabel')} />
          <View style={styles.chips}>
            {LANGUAGE_OPTIONS.map((option) => (
              <Chip
                key={option.code}
                label={option.label}
                selected={languages.includes(option.code)}
                onPress={() => toggleLanguage(option.code)}
                testID={`setup-language-${option.code}`}
              />
            ))}
          </View>
        </View>

        <Text style={[styles.later, { color: c.textLabel }]}>{t('onboarding.moreLater')}</Text>
        <PillButton title={t('onboarding.next')} onPress={goNext} testID="setup-next" />
      </AuthScaffold>

      <CountryPickerModal
        visible={showCountryPicker}
        selected={countryCode}
        onSelect={(code) => {
          setCountryCode(code);
          setShowCountryPicker(false);
        }}
        onClose={() => setShowCountryPicker(false)}
      />
    </>
  );
}

/** 写真を足す場所の「＋」（丸に＋） */
function PlusBadge({ size }: { size: number }) {
  const c = useAppColors();
  return (
    <View style={[styles.plus, { width: size, height: size, backgroundColor: c.primaryButton }]}>
      <Ionicons name="add" size={Math.round(size * 0.7)} color={c.primaryButtonText} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photos: {
    // アイコンがヘッダーの下に半分はみ出すので、その分の高さを取る
    paddingBottom: 40,
  },
  header: {
    height: 112,
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    position: 'absolute',
    left: spacing.md,
    bottom: 0,
    width: 80,
    height: 80,
    borderRadius: borderRadius.round,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  later: {
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
  textButton: {
    minHeight: touchTarget.min,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  textButtonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  inlineError: {
    fontSize: fontSize.xs,
  },
  resortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.min + 16,
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 10,
  },
  resortLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  resortName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  change: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
  },
});
