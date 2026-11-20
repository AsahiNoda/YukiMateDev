import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeBgMountain from '../../assets/images/home-bg-mountain.svg';

/** 内容を大きく変えたら版を上げる（もう一度全員に見せる） */
const STORAGE_KEY = 'tutorial.v1.done';

const SLIDES: { key: string }[] = [{ key: 'home' }, { key: 'search' }, { key: 'create' }, { key: 'chat' }, { key: 'safety' }];

// 設定の「使い方をもう一度見る」から開き直すための仕組み
const listeners = new Set<() => void>();
export async function showTutorialAgain() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
  listeners.forEach((fn) => fn());
}

/**
 * はじめて使うときのチュートリアル（ログイン後のタブの上に1回だけ出す）。
 * 5枚：ホーム／さがす（スワイプ）／作成／チャット／安全（通報・ブロック）。
 */
export function AppTutorial() {
  const c = useAppColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (mounted && !v) setVisible(true);
      })
      .catch(() => {});
    const open = () => {
      setIndex(0);
      setVisible(true);
    };
    listeners.add(open);
    return () => {
      mounted = false;
      listeners.delete(open);
    };
  }, []);

  const finish = () => {
    setVisible(false);
    AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString()).catch(() => {});
  };

  const goTo = (i: number) => {
    setIndex(i);
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={finish} statusBarTranslucent>
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }]}>
        {/* ログイン画面・ホームと同じ山の背景 */}
        <View style={styles.mountain} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <HomeBgMountain width={width * 1.4} height={360} preserveAspectRatio="xMidYMid meet" style={{ opacity: 0.45 }} />
        </View>
        <View style={styles.topRow}>
          {!isLast ? (
            <Pressable onPress={finish} style={styles.skip} accessibilityRole="button" testID="tutorial-skip">
              <Text style={[styles.skipText, { color: c.chipText }]}>{t('tutorial.skip')}</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          style={styles.flex}
        >
          {SLIDES.map((s) => (
            <View key={s.key} style={[styles.slide, { width }]} accessible accessibilityLabel={`${t(`tutorial.${s.key}.title`)}。${t(`tutorial.${s.key}.body`)}`}>
              {/* アイコンの丸はやめ、何枚目かを小さく出して文字を主役にする */}
              <Text style={[styles.kicker, { color: c.tintText }]}>
                {t('tutorial.progress', { current: SLIDES.findIndex((x) => x.key === s.key) + 1, total: SLIDES.length })}
              </Text>
              <Text style={[styles.title, { color: c.text }]}>{t(`tutorial.${s.key}.title`)}</Text>
              <Text style={[styles.body, { color: c.textMuted }]}>{t(`tutorial.${s.key}.body`)}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots} accessibilityLabel={t('tutorial.progress', { current: index + 1, total: SLIDES.length })}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, { backgroundColor: i === index ? c.tintText : c.divider, width: i === index ? 20 : 8 }]} />
          ))}
        </View>

        <View style={styles.footer}>
          <PillButton
            title={isLast ? t('tutorial.start') : t('tutorial.next')}
            icon={isLast ? 'checkmark' : 'arrow-forward'}
            onPress={() => (isLast ? finish() : goTo(index + 1))}
            testID="tutorial-next"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  topRow: { height: touchTarget.min, alignItems: 'flex-end', paddingHorizontal: spacing.sm },
  skip: { minWidth: touchTarget.min, height: touchTarget.min, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  skipText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  mountain: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  slide: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.sm },
  kicker: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  title: { fontSize: fontSize.title, fontWeight: fontWeight.bold, lineHeight: 36 },
  body: { fontSize: fontSize.md, lineHeight: 25 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.lg },
  dot: { height: 8, borderRadius: borderRadius.sm },
  footer: { paddingHorizontal: spacing.lg },
});

export default AppTutorial;
