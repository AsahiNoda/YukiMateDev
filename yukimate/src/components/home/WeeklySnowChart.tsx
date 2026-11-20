import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { DailySnowfall } from '@/services/weatherApi';
import { Ionicons } from '@expo/vector-icons';
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

const BAR_MAX_HEIGHT = 44;

interface WeeklySnowChartProps {
  days: DailySnowfall[];
}

type DayInfo = DailySnowfall & { weekday: number; isMax: boolean; isToday: boolean };

/**
 * 週間の雪予報：7日分の新雪（cm）の棒グラフ。週末（土日）を枠で囲み、最大降雪日をティント色にする。
 * 見た目の仕様：docs/ui-redesign/mockups/New-Home-Snow.html
 */
export function WeeklySnowChart({ days }: WeeklySnowChartProps) {
  const c = useAppColors();
  const { t } = useTranslation();
  if (days.length === 0) return null;

  const max = Math.max(...days.map((d) => d.snowfallCm));
  const info: DayInfo[] = days.map((d, i) => {
    const [y, m, dd] = d.date.split('-').map(Number);
    return { ...d, weekday: new Date(y, m - 1, dd).getDay(), isMax: max > 0 && d.snowfallCm === max, isToday: i === 0 };
  });

  // 連続する土日を1つの枠にまとめる
  const groups: { weekend: boolean; days: DayInfo[] }[] = [];
  for (const d of info) {
    const weekend = d.weekday === 0 || d.weekday === 6;
    const last = groups[groups.length - 1];
    if (weekend && last?.weekend && last.days[last.days.length - 1].weekday === 6 && d.weekday === 0) {
      last.days.push(d);
    } else {
      groups.push({ weekend, days: [d] });
    }
  }

  const renderDay = (d: DayInfo) => {
    const [, m, dd] = d.date.split('-').map(Number);
    const label = d.isToday ? t('dateFormat.today') : t(WEEKDAY_KEYS[d.weekday]);
    const height = max > 0 ? Math.max(4, Math.round((d.snowfallCm / max) * BAR_MAX_HEIGHT)) : 0;
    const value = Math.round(d.snowfallCm);
    return (
      <View
        key={d.date}
        style={styles.day}
        accessible
        accessibilityLabel={`${label} ${m}/${dd}, ${t('homeFeed.snowCm', { cm: value })}`}
      >
        <Text style={[styles.dayLabel, d.isMax ? { color: c.tintText, fontWeight: fontWeight.bold } : { color: c.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.date, { color: c.textLabel }]}>
          {m}/{dd}
        </Text>
        <View style={styles.barArea}>
          {d.snowfallCm > 0 ? (
            <View style={[styles.bar, { height, backgroundColor: d.isMax ? c.tintText : c.weeklyBar }]} />
          ) : (
            <Ionicons name="remove" size={14} color={c.textLabel} />
          )}
        </View>
        <Text style={[styles.value, d.isMax ? { color: c.tintText, fontWeight: fontWeight.heavy } : { color: c.text }]}>{value}</Text>
      </View>
    );
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
          {t('homeFeed.weeklySnowForecast')}
        </Text>
        <Text style={[styles.unit, { color: c.textLabel }]}>{t('homeFeed.newSnowUnit')}</Text>
      </View>
      <View style={[styles.chart, { backgroundColor: c.card }]}>
        {groups.map((g, i) =>
          g.weekend ? (
            <View key={`w${i}`} style={[styles.weekend, { flex: g.days.length, backgroundColor: c.weekendFrame }]}>
              <View style={styles.weekendBadgeWrap} pointerEvents="none">
                <View style={[styles.weekendBadge, { backgroundColor: c.primaryButton }]}>
                  <Text style={[styles.weekendText, { color: c.primaryButtonText }]}>{t('chips.weekend')}</Text>
                </View>
              </View>
              {g.days.map(renderDay)}
            </View>
          ) : (
            g.days.map(renderDay)
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  unit: {
    fontSize: fontSize.xs,
  },
  chart: {
    flexDirection: 'row',
    borderRadius: borderRadius.card,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 6,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekend: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    marginVertical: -6,
    marginHorizontal: 2,
    paddingTop: 6,
    paddingBottom: 4,
  },
  weekendBadgeWrap: {
    position: 'absolute',
    top: -9,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  weekendBadge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  weekendText: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  dayLabel: {
    fontSize: fontSize.xxs,
  },
  date: {
    fontSize: fontSize.xxs,
  },
  barArea: {
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 14,
    borderRadius: borderRadius.sm,
  },
  value: {
    fontSize: fontSize.meta,
    fontWeight: fontWeight.bold,
  },
});

export default WeeklySnowChart;
