import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useLocale } from '@/contexts/LocaleContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeBgMountain from '../../../assets/images/home-bg-mountain.svg';

interface AuthScaffoldProps {
  title: string;
  subtitle?: string;
  /** 新規登録〜プロフィール作成の何歩目か（1始まり）。無ければ出さない */
  step?: { current: number; total: number };
  /** 左上の戻る。無ければ出さない */
  onBack?: () => void;
  /** ロゴとアプリ名（ログイン画面だけ大きく出す） */
  showBrand?: boolean;
  children: React.ReactNode;
  /** カードの下（「アカウントをお持ちでない方」など） */
  footer?: React.ReactNode;
  /** カードで包まずに中身を広く使う（プロフィール作成など） */
  plain?: boolean;
}

/**
 * ログイン・新規登録・パスワード・プロフィール作成の共通の枠。
 * ホームと同じ山の背景＋ガラス調のカード。言語の切り替えは右上（文字だけ、絵文字なし）。
 * HIG / Material：1画面1つの目的、主ボタンは1つ、進み具合（ステップ）を見せる。
 */
export function AuthScaffold({ title, subtitle, step, onBack, showBrand, children, footer, plain }: AuthScaffoldProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* ホームと同じ山の背景（飾りなので読み上げない） */}
      <View style={styles.mountain} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <HomeBgMountain width={width * 1.4} height={360} preserveAspectRatio="xMidYMid meet" style={{ opacity: 0.32 }} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </Pressable>
        ) : (
          <View style={styles.iconButton} />
        )}
        <View style={styles.flex} />
        <Pressable
          onPress={() => setLocale(locale === 'ja' ? 'en' : 'ja').catch(() => {})}
          style={({ pressed }) => [styles.langButton, { borderColor: c.glassCardBorder }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.switchLanguage')}
          testID="auth-language"
        >
          <Text style={[styles.langText, { color: c.text }]}>{locale === 'ja' ? 'English' : '日本語'}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showBrand ? (
            <View style={styles.brand}>
              <Image source={require('../../../assets/images/app_logo.png')} style={styles.logo} contentFit="cover" accessibilityIgnoresInvertColors />
              <Text style={[styles.wordmark, { color: c.text }]} accessibilityRole="header">
                Slope Link
              </Text>
              <Text style={[styles.tagline, { color: c.textMuted }]}>{t('onboarding.tagline')}</Text>
            </View>
          ) : null}

          {step ? (
            <View style={styles.stepBlock} accessible accessibilityLabel={t('onboarding.stepA11y', step)}>
              <Text style={[styles.stepText, { color: c.tintText }]}>{t('onboarding.step', step)}</Text>
              <View style={styles.stepBars}>
                {Array.from({ length: step.total }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.stepBar, { backgroundColor: i < step.current ? c.tintText : c.glassDivider }]}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Text
            style={[styles.title, { color: c.text }, showBrand && styles.centered]}
            accessibilityRole={showBrand ? undefined : 'header'}
          >
            {title}
          </Text>
          {subtitle ? <Text style={[styles.subtitle, { color: c.textMuted }, showBrand && styles.centered]}>{subtitle}</Text> : null}

          {plain ? (
            <View style={styles.plainBody}>{children}</View>
          ) : (
            <View style={[styles.card, { borderColor: c.glassCardBorder }]}>
              <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassCardBackground }]} />
              <View style={styles.cardBody}>{children}</View>
            </View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** カードの中のエラー・お知らせの帯（アラートの代わり） */
export function AuthNotice({ text, tone = 'error' }: { text: string; tone?: 'error' | 'info' }) {
  const c = useAppColors();
  return (
    <View
      style={[
        styles.notice,
        tone === 'error'
          ? { backgroundColor: c.backgroundSecondary, borderColor: c.danger }
          : { backgroundColor: c.hourHighlightBackground, borderColor: 'transparent' },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={[styles.noticeText, { color: tone === 'error' ? c.text : c.hourHighlightText }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 背景の山は画面より広いので、はみ出しで横幅が広がらないように切る（Web でも崩れないように）
  container: { flex: 1, overflow: 'hidden' },
  flex: { flex: 1 },
  mountain: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  iconButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  langText: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg - 4,
    paddingTop: spacing.sm,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: 6,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xs,
  },
  wordmark: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.heavy,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.sm,
  },
  stepBlock: {
    gap: 8,
    marginBottom: spacing.md,
  },
  stepText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  stepBars: {
    flexDirection: 'row',
    gap: 4,
  },
  stepBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  centered: {
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 21,
    marginTop: 6,
  },
  card: {
    marginTop: spacing.lg - 4,
    borderRadius: borderRadius.glass,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cardBody: {
    padding: spacing.md + 2,
    gap: spacing.md,
  },
  plainBody: {
    marginTop: spacing.lg - 4,
    gap: spacing.md,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  notice: {
    borderRadius: borderRadius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeText: {
    fontSize: fontSize.meta,
    lineHeight: 19,
  },
});

export default AuthScaffold;
