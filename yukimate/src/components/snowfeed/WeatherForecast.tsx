import { borderRadius, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { DailyForecast } from '@/services/weatherApi';
import { weatherIconFor } from '@/utils/weatherCode';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const WEEKDAY_KEYS = [
  'dateFormat.weekdaySun',
  'dateFormat.weekdayMon',
  'dateFormat.weekdayTue',
  'dateFormat.weekdayWed',
  'dateFormat.weekdayThu',
  'dateFormat.weekdayFri',
  'dateFormat.weekdaySat',
];

interface WeatherForecastProps {
  forecast: DailyForecast[];
}

/**
 * 7日間の予報。ホームの天気カード（案D）と同じガラス調のカードで、
 * 各日に 曜日・日付／天気アイコン／最高・最低気温（数字）／新雪（棒と cm）を並べる。
 * 棒の長さはその週で一番多く降る日を最大にした新雪の量（以前の気温の幅の棒は分かりにくかったのでやめた）。
 * 一番多く降る日は、時間ごとの予報のハイライトと同じ色で強調する。
 */
export function WeatherForecast({ forecast }: WeatherForecastProps) {
  const c = useAppColors();
  const scheme = useColorScheme();
  const { t } = useTranslation();
  const isDark = scheme === 'dark';

  if (forecast.length === 0) {
    return (
      <View style={[styles.unavailable, { backgroundColor: c.card }]}>
        <Ionicons name="cloud-offline-outline" size={24} color={c.textLabel} />
        <Text style={[styles.unavailableText, { color: c.chipText }]}>{t('homeFeed.weatherUnavailable')}</Text>
      </View>
    );
  }

  const maxSnow = Math.max(...forecast.map((d) => d.snowfallCm));

  return (
    <View style={[styles.card, { borderColor: c.glassCardBorder }]}>
      <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassCardBackground }]} />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.textMuted }]} accessibilityRole="header">
            {t('weather.forecast7day')}
          </Text>
          <Text style={[styles.unit, { color: c.textLabel }]}>{t('homeFeed.newSnowUnit')}</Text>
        </View>

        {forecast.map((day, i) => {
          const [y, m, d] = day.date.split('-').map(Number);
          const weekday = new Date(y, m - 1, d).getDay();
          const label = i === 0 ? t('dateFormat.today') : t(WEEKDAY_KEYS[weekday]);
          const isWeekend = weekday === 0 || weekday === 6;
          const isMax = maxSnow > 0 && day.snowfallCm === maxSnow;
          const Icon = weatherIconFor(day.weatherCode);
          const snow = Math.round(day.snowfallCm);
          const barWidth = maxSnow > 0 && day.snowfallCm > 0 ? Math.max(4, (day.snowfallCm / maxSnow) * 100) : 0;

          return (
            <View
              key={day.date}
              style={[styles.row, isMax && { backgroundColor: c.hourHighlightBackground }]}
              accessible
              accessibilityLabel={`${label} ${m}/${d}, ${day.tempHigh}° / ${day.tempLow}°, ${t('homeFeed.snowCm', { cm: snow })}`}
            >
              <View style={styles.dayCol}>
                <Text
                  style={[
                    styles.day,
                    isMax
                      ? { color: c.hourHighlightText, fontWeight: fontWeight.bold }
                      : { color: isWeekend ? c.tintText : c.text },
                  ]}
                >
                  {label}
                </Text>
                <Text style={[styles.date, { color: c.textLabel }]}>
                  {m}/{d}
                </Text>
              </View>
              <Icon width={24} height={24} color={c.text} />
              <Text style={[styles.temps, { color: c.text }]}>
                {day.tempHigh}°<Text style={{ color: c.textLabel }}> / {day.tempLow}°</Text>
              </Text>
              <View style={styles.snowCol}>
                <View style={[styles.snowTrack, { backgroundColor: c.chipBackground }]}>
                  {barWidth > 0 ? (
                    <View style={[styles.snowBar, { width: `${barWidth}%`, backgroundColor: isMax ? c.tintText : c.weeklyBar }]} />
                  ) : null}
                </View>
                <Text style={[styles.snow, isMax ? { color: c.tintText, fontWeight: '900' } : { color: c.textMuted }]}>
                  {snow > 0 ? snow : '–'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  content: {
    padding: 14,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },
  unit: {
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  dayCol: {
    width: 44,
  },
  day: {
    fontSize: 14,
  },
  date: {
    fontSize: 11,
  },
  temps: {
    width: 74,
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },
  snowCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  snowTrack: {
    flex: 1,
    height: 8,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  snowBar: {
    height: '100%',
    borderRadius: borderRadius.pill,
  },
  snow: {
    width: 26,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  unavailable: {
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  unavailableText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default WeatherForecast;
