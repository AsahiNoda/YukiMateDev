import { fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { HourColumn } from '@/utils/hourlyWeather';
import { weatherIconFor, weatherLabelKey } from '@/utils/weatherCode';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import HomeBgMountain from '../../../assets/images/home-bg-mountain.svg';

export interface HomeWeather {
  resortName: string;
  temperatureC: number;
  newSnowCm: number;
  windSpeedMs: number;
  visibility?: 'good' | 'moderate' | 'poor' | string | null;
  weatherCode?: number | null;
  /** Open-Meteo の current.time（"YYYY-MM-DDTHH:mm"） */
  observedAt?: string | null;
}

interface HomeWeatherCardProps {
  weather: HomeWeather;
  /** 今日の時間ごと（8〜16時）。取得できていなければ null（行ごと出さない） */
  columns: HourColumn[] | null;
  /** 「ゲレンデ情報・投稿を見る」→ ゲレンデページ（予報タブ）。省略するとリンクを出さない（ゲレンデページ自身） */
  onPressMore?: () => void;
  /** 上の行の見出し。省略時はゲレンデ名（ゲレンデページでは「現在のコンディション」） */
  title?: string;
}

const VISIBILITY_KEYS: Record<string, string> = {
  good: 'weather.visibilityGood',
  moderate: 'weather.visibilityModerate',
  poor: 'weather.visibilityPoor',
};

const CARD_RADIUS = 20;

/**
 * ホームの天気カード：案D「時間ごとの予報つき」（docs/ui-redesign/mockups/New-Home-Weather.html）。
 * 山の背景＋ガラス調のカードは引き継ぎ、赤い「LIVE」は「● 8:00 更新」に置き換えた。
 * TODO(ui-redesign 8章)：リフト運行の行は、データソースが決まったら時間ごとの行の下に足す。
 */
export function HomeWeatherCard({ weather, columns, onPressMore, title }: HomeWeatherCardProps) {
  const c = useAppColors();
  const scheme = useColorScheme();
  const { t } = useTranslation();
  const isDark = scheme === 'dark';

  const updatedAt = weather.observedAt?.slice(11, 16).replace(/^0/, '') ?? null;
  const condition = t(weatherLabelKey(weather.weatherCode));
  const visibilityKey = weather.visibility ? VISIBILITY_KEYS[weather.visibility] : undefined;
  const visibility = visibilityKey ? t(visibilityKey) : null;

  return (
    <View style={styles.wrapper}>
      {/* 山の背景（カードからはみ出す） */}
      <View style={styles.mountain} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <HomeBgMountain width={Dimensions.get('window').width} height={300} preserveAspectRatio="xMidYMid meet" style={{ opacity: 0.6 }} />
      </View>

      <View style={[styles.card, { borderColor: c.glassCardBorder }]}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassCardBackground }]} />

        <View style={styles.content}>
          {/* 上の行：ゲレンデ名と最終更新 */}
          <View style={styles.topRow}>
            <Text
              style={[styles.resortName, title ? { color: c.textMuted, fontSize: 13 } : { color: c.text }]}
              numberOfLines={1}
            >
              {title ?? weather.resortName}
            </Text>
            {updatedAt ? (
              <View style={styles.updated}>
                <View style={[styles.updatedDot, { backgroundColor: c.freshDot }]} />
                <Text style={[styles.updatedText, { color: c.textMuted }]}>{t('homeFeed.updatedAt', { time: updatedAt })}</Text>
              </View>
            ) : null}
          </View>

          {/* 今の状態（1行に圧縮） */}
          <View style={styles.nowRow}>
            <Text style={[styles.temp, { color: c.text }]}>{weather.temperatureC}°</Text>
            <View style={styles.nowText}>
              <Text style={[styles.condition, { color: c.text }]} numberOfLines={1}>
                {condition} ・ {t('homeFeed.newSnow', { cm: weather.newSnowCm })}
              </Text>
              <Text style={[styles.subCondition, { color: c.textMuted }]} numberOfLines={1}>
                {t('homeFeed.wind', { wind: weather.windSpeedMs })}
                {visibility ? ` ・ ${t('homeFeed.visibility', { visibility })}` : ''}
              </Text>
            </View>
          </View>

          {/* 今日の時間ごと */}
          {columns && columns.length > 0 ? (
            <>
              <Text style={[styles.hourlyTitle, { color: c.textLabel }]}>{t('homeFeed.hourlyTitle')}</Text>
              <View style={styles.hourlyRow}>
                {columns.map((col) => {
                  const Icon = weatherIconFor(col.weatherCode);
                  return (
                    <View
                      key={col.hour}
                      style={[
                        styles.hourCol,
                        col.highlighted && { backgroundColor: c.hourHighlightBackground },
                        col.isPast && styles.hourPast,
                      ]}
                      accessible
                      accessibilityLabel={[
                        t('homeFeed.hourLabel', { hour: col.hour }),
                        col.temperatureC !== null ? `${col.temperatureC}°` : '',
                        t('homeFeed.snowCm', { cm: col.snowfallCm }),
                        col.highlighted ? t('homeFeed.goodTime') : '',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    >
                      <Text
                        style={[
                          styles.hourLabel,
                          col.highlighted
                            ? { color: c.hourHighlightText, fontWeight: fontWeight.bold }
                            : { color: c.textMuted },
                        ]}
                      >
                        {t('homeFeed.hourLabel', { hour: col.hour })}
                      </Text>
                      <Icon width={22} height={22} color={c.text} />
                      <Text style={[styles.hourTemp, { color: c.text }]}>
                        {col.temperatureC !== null ? `${col.temperatureC}°` : '–'}
                      </Text>
                      <Text style={[styles.hourSnow, { color: c.textLabel }]}>{t('homeFeed.snowCm', { cm: col.snowfallCm })}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* ゲレンデページ（予報タブ）へ */}
          {onPressMore ? (
          <Pressable
            onPress={onPressMore}
            style={({ pressed }) => [styles.moreLink, { borderTopColor: c.glassDivider }, pressed && { opacity: 0.7 }]}
            accessibilityRole="link"
            testID="home-weather-more"
          >
            <Text style={[styles.moreText, { color: c.tintText }]}>{t('homeFeed.resortInfoLink')}</Text>
            <Ionicons name="chevron-forward" size={16} color={c.tintText} />
          </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  mountain: {
    position: 'absolute',
    top: -30,
    left: -spacing.md,
    right: -spacing.md,
    bottom: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  content: {
    padding: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resortName: {
    flex: 1,
    fontSize: 15,
    fontWeight: fontWeight.bold,
  },
  updated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updatedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  updatedText: {
    fontSize: 11,
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: spacing.sm,
  },
  temp: {
    fontSize: 52,
    fontWeight: '300',
    lineHeight: 56,
  },
  nowText: {
    flex: 1,
  },
  condition: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
  },
  subCondition: {
    fontSize: 13,
  },
  hourlyTitle: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    marginTop: 14,
    marginBottom: 6,
  },
  hourlyRow: {
    flexDirection: 'row',
    gap: 2,
  },
  hourCol: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  hourPast: {
    opacity: 0.5,
  },
  hourLabel: {
    fontSize: 12,
  },
  hourTemp: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  hourSnow: {
    fontSize: 11,
  },
  moreLink: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreText: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },
});

export default HomeWeatherCard;
