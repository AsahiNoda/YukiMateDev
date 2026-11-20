import { PillButton } from '@/components/ui/PillButton';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
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
  /**
   * カードの後ろに山の絵を出す（ゲレンデページ）。
   * ホームでは山の絵は画面の背景として HomeScreen 側で描く（横スライダーの中だと切れるため）ので false。
   */
  showMountain?: boolean;
  /** 明日の朝までの降雪予報が基準以上のときだけ渡す（パウダーアラート）。今の状態の下に1行で出す */
  powderCm?: number | null;
  /** forecast：明日の朝までの予報／today：今日の降雪（すでに降った分を含む） */
  powderKind?: 'forecast' | 'today';
  /** パウダーアラートの「朝イチ組を作る」 */
  onPowderAction?: () => void;
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
export function HomeWeatherCard({
  weather,
  columns,
  onPressMore,
  title,
  showMountain = true,
  powderCm = null,
  powderKind = 'forecast',
  onPowderAction,
}: HomeWeatherCardProps) {
  const c = useAppColors();
  const scheme = useColorScheme();
  const { t } = useTranslation();
  const isDark = scheme === 'dark';

  const updatedAt = weather.observedAt?.slice(11, 16).replace(/^0/, '') ?? null;
  const condition = t(weatherLabelKey(weather.weatherCode));
  const visibilityKey = weather.visibility ? VISIBILITY_KEYS[weather.visibility] : undefined;
  const visibility = visibilityKey ? t(visibilityKey) : null;
  // 右側の余白に、今の天気を表すイラスト（時間ごとの行と同じ絵柄を大きく）
  const NowIcon = weatherIconFor(weather.weatherCode);

  return (
    <View style={styles.wrapper}>
      {/* 山の背景（カードからはみ出す） */}
      {showMountain ? (
        <View style={styles.mountain} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <HomeBgMountain width={Dimensions.get('window').width} height={300} preserveAspectRatio="xMidYMid meet" style={{ opacity: 0.6 }} />
        </View>
      ) : null}

      <View style={[styles.card, { borderColor: c.glassCardBorder }]}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassCardBackground }]} />

        <View style={styles.content}>
          {/* 上の行：ゲレンデ名と最終更新 */}
          <View style={styles.topRow}>
            <Text
              style={[styles.resortName, title ? { color: c.textMuted, fontSize: fontSize.meta } : { color: c.text }]}
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
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <NowIcon width={60} height={60} color={c.text} />
            </View>
          </View>

          {/* パウダーアラート：細い線の下に1行。見出しは赤、右の「＋」で朝イチのイベントを作る */}
          {powderCm !== null ? (
            <View style={[styles.powderRow, { borderTopColor: c.glassDivider }]}>
              <Text style={[styles.powderText, { color: c.text }]} numberOfLines={2}>
                <Text style={{ color: c.danger, fontWeight: fontWeight.bold }}>{t('homeFeed.powderAlertTitle')}</Text>
                {'  '}
                {t(powderKind === 'today' ? 'homeFeed.powderAlertToday' : 'homeFeed.powderAlertMessage', { cm: powderCm })}
              </Text>
              {onPowderAction ? (
                // 「＋ 朝イチ組を作る」。文と並ばないときは折り返して右下に回る
                <PillButton
                  title={t('homeFeed.makeEarlyGroup')}
                  icon="add"
                  size="sm"
                  onPress={onPowderAction}
                  style={styles.powderAction}
                  testID="home-powder-action"
                />
              ) : null}
            </View>
          ) : null}

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
                      style={[styles.hourCol, col.isPast && styles.hourPast]}
                      accessible
                      accessibilityLabel={[
                        t('homeFeed.hourLabel', { hour: col.hour }),
                        col.temperatureC !== null ? `${col.temperatureC}°` : '',
                        t('homeFeed.snowCm', { cm: col.snowfallCm }),
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    >
                      <Text style={[styles.hourLabel, { color: c.textMuted }]}>
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
    fontSize: fontSize.body,
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
    borderRadius: borderRadius.round,
  },
  updatedText: {
    fontSize: fontSize.xxs,
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: spacing.sm,
  },
  temp: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.light,
    lineHeight: 56,
  },
  nowText: {
    flex: 1,
  },
  condition: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  subCondition: {
    fontSize: fontSize.meta,
  },
  powderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    rowGap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  powderText: {
    // 文の幅は中身に合わせて伸び縮みし、ボタンと並ばなくなったらボタンが次の行へ
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 150,
    fontSize: fontSize.meta,
  },
  powderAction: {
    marginLeft: 'auto',
  },
  hourlyTitle: {
    fontSize: fontSize.xs,
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
    borderRadius: borderRadius.md,
  },
  hourPast: {
    opacity: 0.5,
  },
  hourLabel: {
    fontSize: fontSize.xs,
  },
  hourTemp: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  hourSnow: {
    fontSize: fontSize.xxs,
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
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
  },
});

export default HomeWeatherCard;
