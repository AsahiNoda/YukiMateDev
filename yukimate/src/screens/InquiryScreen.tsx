import { FormInput, FormLabel, FormSection } from '@/components/profile/ProfileFormParts';
import { Chip } from '@/components/ui/Chip';
import { PillButton } from '@/components/ui/PillButton';
import { fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAuth } from '@/contexts/AuthContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** inquiries.category の値（DB の CHECK 制約と同じ） */
const CATEGORIES = ['bug_report', 'feature_request', 'account_issue', 'other'] as const;
type Category = (typeof CATEGORIES)[number];
const MAX_LENGTH = 1000;

/**
 * お問い合わせ（ホーム右上から開く）。inquiries テーブルに保存する。
 * 種類（不具合の報告／機能の要望／アカウントについて／その他）と本文（1000文字まで）。
 */
export default function InquiryScreen() {
  const insets = useSafeAreaInsets();
  const c = useAppColors();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const canSend = !!category && body.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend || sendingRef.current || !category) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const { error } = await supabase.from('inquiries').insert({
        user_id: user?.id ?? null,
        category,
        body: body.trim(),
      });
      if (error) {
        console.warn('[inquiry] failed', error.code, error.message);
        Alert.alert(t('inquiry.failed'));
        return;
      }
      Alert.alert(t('inquiry.sentTitle'), t('inquiry.sentMessage'), [
        { text: t('common.ok'), onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home')) },
      ]);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.divider }]}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]} accessibilityRole="header">
          {t('inquiry.title')}
        </Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.lead, { color: c.chipText }]}>{t('inquiry.lead')}</Text>

          <FormSection title={t('inquiry.formTitle')}>
            <View style={{ gap: 6 }}>
              <FormLabel label={t('inquiry.category')} required />
              <View style={styles.chips}>
                {CATEGORIES.map((key) => (
                  <Chip key={key} label={t(`inquiry.categories.${key}`)} selected={category === key} onPress={() => setCategory(key)} />
                ))}
              </View>
            </View>
            <FormInput
              label={t('inquiry.body')}
              required
              value={body}
              onChangeText={setBody}
              placeholder={t('inquiry.bodyPlaceholder')}
              multiline
              maxLength={MAX_LENGTH}
              showCounter
            />
          </FormSection>

          <PillButton title={t('inquiry.send')} icon="send" onPress={handleSend} loading={sending} disabled={!canSend} fill />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
  },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
