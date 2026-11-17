import { RoleBasedAvatar } from '@/components/RoleBasedAvatar';
import { Chip } from '@/components/ui/Chip';
import { COUNTRIES, getFlagSource } from '@/constants/countries';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * プロフィール作成・編集で共通に使うフォームの部品（リデザイン後の見た目）。
 * 写真／基本情報／滑り方／ギア（名前だけ）／SNS をカードに分けて並べる。
 */

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useAppColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.textLabel }]} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.card, { backgroundColor: c.card }]}>{children}</View>
    </View>
  );
}

export function FormLabel({ label, required }: { label: string; required?: boolean }) {
  const c = useAppColors();
  const { t } = useTranslation();
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: c.text }]}>{label.replace(/\s*\*\s*$/, '')}</Text>
      {required ? <Text style={[styles.required, { color: c.tintText }]}>{t('common.required')}</Text> : null}
    </View>
  );
}

interface FormInputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  showCounter?: boolean;
}

export function FormInput({ label, required, icon, showCounter, style, value, maxLength, multiline, ...rest }: FormInputProps) {
  const c = useAppColors();
  return (
    <View style={styles.field}>
      {label ? <FormLabel label={label} required={required} /> : null}
      <View style={[styles.inputWrap, { backgroundColor: c.chipBackground }, multiline && styles.inputWrapMultiline]}>
        {icon ? <Ionicons name={icon} size={20} color={c.textLabel} /> : null}
        <TextInput
          style={[styles.input, { color: c.text }, multiline && styles.inputMultiline, style]}
          placeholderTextColor={c.textLabel}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={label}
          {...rest}
        />
      </View>
      {showCounter && maxLength ? (
        <Text style={[styles.counter, { color: c.textLabel }]}>
          {(value ?? '').length}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

/** ヘッダー画像とアイコンを1つにまとめた写真の欄（プロフィール画面と同じ重なり方） */
export function PhotoFields({
  headerUrl,
  avatarUrl,
  role,
  uploadingHeader,
  uploadingAvatar,
  onPickHeader,
  onPickAvatar,
}: {
  headerUrl: string | null;
  avatarUrl: string | null;
  role?: string;
  uploadingHeader: boolean;
  uploadingAvatar: boolean;
  onPickHeader: () => void;
  onPickAvatar: () => void;
}) {
  const c = useAppColors();
  const { t } = useTranslation();
  return (
    <View style={styles.photos}>
      <Pressable
        onPress={onPickHeader}
        disabled={uploadingHeader}
        style={[styles.headerImage, { backgroundColor: c.chipBackground }]}
        accessibilityRole="button"
        accessibilityLabel={t('editProfileScreen.headerLabel')}
      >
        {headerUrl ? <Image source={{ uri: headerUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <View style={[styles.photoBadge, { backgroundColor: c.photoOverlayBackground }]}>
          {uploadingHeader ? (
            <ActivityIndicator color={c.photoOverlayText} size="small" />
          ) : (
            <Ionicons name="camera" size={16} color={c.photoOverlayText} />
          )}
          <Text style={[styles.photoBadgeText, { color: c.photoOverlayText }]}>{t('profileForm.changeHeader')}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onPickAvatar}
        disabled={uploadingAvatar}
        style={styles.avatar}
        accessibilityRole="button"
        accessibilityLabel={t('editProfileScreen.avatarLabel')}
      >
        <RoleBasedAvatar avatarUrl={avatarUrl} role={role ?? 'user'} size={96} showBadge={false} />
        <View style={[styles.avatarCamera, { backgroundColor: c.primaryButton, borderColor: c.background }]}>
          {uploadingAvatar ? (
            <ActivityIndicator color={c.primaryButtonText} size="small" />
          ) : (
            <Ionicons name="camera" size={14} color={c.primaryButtonText} />
          )}
        </View>
      </Pressable>
    </View>
  );
}

export function CountryField({ code, onPress, label }: { code: string; onPress: () => void; label: string }) {
  const c = useAppColors();
  const { t, locale } = useTranslation();
  const country = COUNTRIES.find((x) => x.code === code);
  return (
    <View style={styles.field}>
      <FormLabel label={label} required />
      <Pressable
        onPress={onPress}
        style={[styles.inputWrap, { backgroundColor: c.chipBackground }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {code ? <Image source={getFlagSource(code)} style={styles.flag} contentFit="contain" /> : null}
        <Text style={[styles.input, styles.selectText, { color: country ? c.text : c.textLabel }]}>
          {country ? (locale === 'en' ? country.nameEn : country.nameJa) : t('profileSetup.selectCountry')}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.textLabel} />
      </Pressable>
    </View>
  );
}

export function CountryPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.sheetBackground, paddingBottom: insets.bottom }]}>
        <View style={[styles.sheetHeader, { borderBottomColor: c.divider }]}>
          <Text style={[styles.sheetTitle, { color: c.text }]}>{t('editProfileScreen.selectNationality')}</Text>
          <Pressable onPress={onClose} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
            <Ionicons name="close" size={24} color={c.text} />
          </Pressable>
        </View>
        <FlatList
          data={COUNTRIES}
          keyExtractor={(item) => item.code}
          initialNumToRender={20}
          getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
          renderItem={({ item }) => {
            const active = item.code === selected;
            return (
              <Pressable
                onPress={() => onSelect(item.code)}
                style={[styles.countryRow, { borderBottomColor: c.divider }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Image source={getFlagSource(item.code)} style={styles.flag} contentFit="contain" />
                <Text style={[styles.countryName, { color: c.text, fontWeight: active ? fontWeight.bold : fontWeight.normal }]}>
                  {locale === 'en' ? item.nameEn : item.nameJa}
                </Text>
                {active ? <Ionicons name="checkmark" size={20} color={c.tintText} /> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export function LevelSelector({ value, onChange, label }: { value: string | null | undefined; onChange: (v: (typeof LEVELS)[number]) => void; label: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.field}>
      <FormLabel label={label} />
      <View style={styles.chips}>
        {LEVELS.map((lv) => (
          <Chip key={lv} label={t(`levels.${lv}`)} selected={value === lv} onPress={() => onChange(lv)} />
        ))}
      </View>
    </View>
  );
}

export function StyleSelector<T extends string>({
  options,
  values,
  onToggle,
  label,
}: {
  options: readonly T[];
  values: T[];
  onToggle: (v: T) => void;
  label: string;
}) {
  const { t } = useTranslation();
  const labelFor = (s: string) => {
    const l = t(`ridingStyles.${s}`);
    return l === `ridingStyles.${s}` ? s : l;
  };
  return (
    <View style={styles.field}>
      <FormLabel label={label} />
      <View style={styles.chips}>
        {options.map((s) => (
          <Chip
            key={s}
            label={labelFor(s)}
            selected={values.includes(s)}
            icon={values.includes(s) ? 'checkmark' : undefined}
            onPress={() => onToggle(s)}
          />
        ))}
      </View>
    </View>
  );
}

/** ギアは名前だけ（板・バインディング・ブーツ） */
export function GearFields({
  board,
  binding,
  boots,
  onChange,
}: {
  board: string;
  binding: string;
  boots: string;
  onChange: (key: 'board' | 'binding' | 'boots', value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <FormInput label={t('profileForm.gearBoard')} value={board} onChangeText={(v) => onChange('board', v)} placeholder={t('editProfileScreen.gearBoardPlaceholder')} maxLength={60} />
      <FormInput label={t('profileForm.gearBinding')} value={binding} onChangeText={(v) => onChange('binding', v)} placeholder={t('editProfileScreen.gearBindingPlaceholder')} maxLength={60} />
      <FormInput label={t('profileForm.gearBoots')} value={boots} onChangeText={(v) => onChange('boots', v)} placeholder={t('editProfileScreen.gearBootsPlaceholder')} maxLength={60} />
    </>
  );
}

export type SocialKey = 'instagram' | 'x' | 'youtube' | 'tiktok';

const SOCIALS: { key: SocialKey; icon: keyof typeof Ionicons.glyphMap; placeholderKey: string; maxLength: number }[] = [
  { key: 'instagram', icon: 'logo-instagram', placeholderKey: 'profileForm.instagramPlaceholder', maxLength: 60 },
  { key: 'x', icon: 'logo-twitter', placeholderKey: 'profileForm.xPlaceholder', maxLength: 60 },
  { key: 'youtube', icon: 'logo-youtube', placeholderKey: 'profileForm.youtubePlaceholder', maxLength: 120 },
  { key: 'tiktok', icon: 'logo-tiktok', placeholderKey: 'profileForm.tiktokPlaceholder', maxLength: 60 },
];

/** SNS（ユーザー名か URL） */
export function SocialFields({ values, onChange }: { values: Record<SocialKey, string>; onChange: (key: SocialKey, value: string) => void }) {
  const { t } = useTranslation();
  const c = useAppColors();
  return (
    <>
      {SOCIALS.map((s) => (
        <FormInput
          key={s.key}
          icon={s.icon}
          value={values[s.key]}
          onChangeText={(v) => onChange(s.key, v)}
          placeholder={t(s.placeholderKey)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={s.key === 'youtube' ? 'url' : 'default'}
          maxLength={s.maxLength}
          accessibilityLabel={t(s.placeholderKey)}
        />
      ))}
      <Text style={[styles.hint, { color: c.textLabel }]}>{t('profileForm.socialHint')}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    marginLeft: 4,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  required: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.min + 4,
    borderRadius: borderRadius.card,
    paddingHorizontal: 12,
  },
  inputWrapMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 8,
  },
  inputMultiline: {
    minHeight: 96,
    paddingVertical: 0,
  },
  selectText: {
    paddingVertical: 12,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photos: {
    marginBottom: 56,
  },
  headerImage: {
    height: 150,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: spacing.sm,
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoBadgeText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  avatar: {
    position: 'absolute',
    left: spacing.md,
    bottom: -48,
  },
  avatarCamera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: {
    width: 24,
    height: 16,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
    borderTopLeftRadius: borderRadius.photoCard,
    borderTopRightRadius: borderRadius.photoCard,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
  iconButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
  },
});
