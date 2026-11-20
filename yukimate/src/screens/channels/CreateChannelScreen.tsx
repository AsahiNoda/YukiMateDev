import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import {
  channelErrorKey,
  channelKindLabelKey,
  CHANNEL_DESCRIPTION_MAX,
  CHANNEL_KINDS,
  CHANNEL_NAME_MAX,
  CHANNEL_OWN_LIMIT,
  useChannelActions,
  type ChannelKind,
} from '@/hooks/useChannels';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** ホームの天気カードと同じ角の丸み */
const CARD_RADIUS = 20;

/** チャンネルを作る：名前・説明・参加のしかた（オープン／プライベート）・種類（種類はあとから変えられない） */
export default function CreateChannelScreen() {
  const c = useAppColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const actions = useChannelActions();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<ChannelKind>('chat');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(t('channels.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const id = await actions.createChannel({ name, description, kind, isPublic });
      router.replace({ pathname: '/channel/[channelId]', params: { channelId: id } } as any);
    } catch (error) {
      Alert.alert(t('common.error'), t(channelErrorKey(error), { count: CHANNEL_OWN_LIMIT }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]} accessibilityRole="header">
          {t('channels.createTitle')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.intro, { color: c.textMuted }]}>{t('channels.about')}</Text>

        <Text style={[styles.label, { color: c.textLabel }]}>{t('channels.nameLabel')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={CHANNEL_NAME_MAX}
          placeholder={t('channels.namePlaceholder')}
          placeholderTextColor={c.textLabel}
          style={[styles.input, { backgroundColor: c.glassCardBackground, borderColor: c.glassCardBorder, color: c.text }]}
          accessibilityLabel={t('channels.nameLabel')}
          testID="channel-name"
        />
        <Text style={[styles.counter, { color: c.textLabel }]}>
          {name.length}/{CHANNEL_NAME_MAX}
        </Text>

        <Text style={[styles.label, { color: c.textLabel }]}>{t('channels.descriptionLabel')}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          maxLength={CHANNEL_DESCRIPTION_MAX}
          placeholder={t('channels.descriptionPlaceholder')}
          placeholderTextColor={c.textLabel}
          multiline
          style={[
            styles.input,
            styles.multiline,
            { backgroundColor: c.glassCardBackground, borderColor: c.glassCardBorder, color: c.text },
          ]}
          accessibilityLabel={t('channels.descriptionLabel')}
        />
        <Text style={[styles.counter, { color: c.textLabel }]}>
          {description.length}/{CHANNEL_DESCRIPTION_MAX}
        </Text>

        <Text style={[styles.label, { color: c.textLabel }]}>{t('channels.visibilityLabel')}</Text>
        <ChoiceList
          selected={isPublic ? 'open' : 'private'}
          onSelect={(value) => setIsPublic(value === 'open')}
          options={[
            { value: 'open', title: t('channels.visibilityOpen'), description: t('channels.visibilityOpenDesc') },
            { value: 'private', title: t('channels.visibilityPrivate'), description: t('channels.visibilityPrivateDesc') },
          ]}
          testIDPrefix="channel-visibility"
        />

        <Text style={[styles.label, { color: c.textLabel }]}>{t('channels.kindLabel')}</Text>
        <ChoiceList
          selected={kind}
          onSelect={setKind}
          options={CHANNEL_KINDS.map((value) => ({
            value,
            title: t(channelKindLabelKey(value)),
          }))}
          testIDPrefix="channel-kind"
        />


        <PillButton
          title={t('channels.createButton')}
          onPress={handleCreate}
          loading={saving}
          disabled={saving || !name.trim()}
          style={styles.submit}
          testID="channel-create-submit"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * 選択肢の一覧：ホームの天気カードと同じガラス調のカード1枚に、細い線で区切った行を並べる。
 * 選んでいる行は時間ごとの予報の「おすすめの時間」と同じ淡い面で示す（丸いラジオや枠線は使わない）。
 */
function ChoiceList<T extends string>({
  options,
  selected,
  onSelect,
  testIDPrefix,
}: {
  options: { value: T; title: string; description?: string }[];
  selected: T;
  onSelect: (value: T) => void;
  testIDPrefix: string;
}) {
  const c = useAppColors();
  return (
    <View
      style={[styles.choiceCard, { backgroundColor: c.glassCardBackground, borderColor: c.glassCardBorder }]}
      accessibilityRole="radiogroup"
    >
      {options.map((option, i) => {
        const active = option.value === selected;
        return (
          <View key={option.value}>
            {i > 0 ? <View style={[styles.choiceDivider, { backgroundColor: c.glassDivider }]} /> : null}
            <Pressable
              onPress={() => onSelect(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.title}
              accessibilityHint={option.description}
              style={({ pressed }) => [
                styles.choice,
                active && { backgroundColor: c.hourHighlightBackground },
                pressed && !active && { opacity: 0.7 },
              ]}
              testID={`${testIDPrefix}-${option.value}`}
            >
              <View style={styles.choiceBody}>
                <Text
                  style={[
                    styles.choiceTitle,
                    active ? { color: c.hourHighlightText, fontWeight: fontWeight.bold } : { color: c.text },
                  ]}
                >
                  {option.title}
                </Text>
                {option.description ? (
                  <Text style={[styles.choiceDesc, { color: c.textMuted }]}>{option.description}</Text>
                ) : null}
              </View>
              {active ? <View style={[styles.choiceDot, { backgroundColor: c.hourHighlightText }]} /> : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  content: {
    padding: spacing.md,
  },
  intro: {
    fontSize: fontSize.sm,
    lineHeight: 21,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginTop: 18,
    marginBottom: 6,
  },
  input: {
    minHeight: touchTarget.min + 4,
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: fontSize.md,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: fontSize.xxs,
    textAlign: 'right',
    marginTop: 4,
  },
  choiceCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    padding: 6,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.min,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.card,
  },
  choiceDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  choiceBody: {
    flex: 1,
    gap: 2,
  },
  choiceTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  choiceDesc: {
    fontSize: fontSize.xs,
  },
  choiceDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.round,
  },
  submit: {
    marginTop: spacing.lg,
  },
});
