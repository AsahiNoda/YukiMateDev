import { borderRadius, fontSize, fontWeight, spacing, touchTarget } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import React, { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface HomeSlide {
  key: string;
  /** ドットの横のラベル（「天気」「次の予定・あと3日」） */
  label: string;
  render: (height: number | undefined) => React.ReactNode;
}

interface HomeTopSliderProps {
  slides: HomeSlide[];
  /** 1枚分の幅（画面幅 − 左右の余白） */
  width: number;
}

const GAP = 10;

/**
 * ホーム上部の横スライド（1枚目＝天気、2枚目＝次の予定）。下にラベル付きのドット。
 * 2枚目のカードの高さは、1枚目（天気カード）に合わせる。
 * 1枚だけのときはドットを出さない。
 */
export function HomeTopSlider({ slides, width }: HomeTopSliderProps) {
  const c = useAppColors();
  const [index, setIndex] = useState(0);
  const [firstHeight, setFirstHeight] = useState<number | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  if (slides.length === 1) {
    return <View>{slides[0].render(undefined)}</View>;
  }

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (width + GAP));
    setIndex(Math.max(0, Math.min(slides.length - 1, i)));
  };

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * (width + GAP), animated: true });
    setIndex(i);
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + GAP}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ gap: GAP }}
        // カードからはみ出す山の背景が切れないように
        style={styles.overflowVisible}
      >
        {slides.map((slide, i) => (
          <View
            key={slide.key}
            style={[{ width }, i > 0 && firstHeight ? { height: firstHeight } : null]}
            onLayout={i === 0 ? (e) => setFirstHeight(e.nativeEvent.layout.height) : undefined}
          >
            {slide.render(i > 0 ? firstHeight : undefined)}
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} accessibilityRole="tablist">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <Pressable
              key={slide.key}
              onPress={() => goTo(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={slide.label}
              hitSlop={6}
              style={styles.dotButton}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: active ? c.tintText : c.secondaryButtonBorder, width: active ? 18 : 6 },
                ]}
              />
              <Text
                style={[
                  styles.dotLabel,
                  { color: active ? c.text : c.textLabel, fontWeight: active ? fontWeight.bold : fontWeight.normal },
                ]}
              >
                {slide.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overflowVisible: {
    overflow: 'visible',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm + 4,
    marginTop: 6,
  },
  dotButton: {
    minHeight: touchTarget.min - 12,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: borderRadius.pill,
  },
  dotLabel: {
    fontSize: fontSize.xs,
  },
});

export default HomeTopSlider;
