import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { IconSymbol } from '@components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { spacing, fontSize, borderRadius, fontWeight } from '@/constants/spacing';
import { useColorScheme } from '@hooks/use-color-scheme';

interface DailyForecast {
  date: string;
  dayOfWeek: string;
  tempHigh: number;
  tempLow: number;
  snowfallCm: number;
  condition: string;
}

interface WeatherForecastProps {
  forecast: DailyForecast[];
}

export function WeatherForecast({ forecast }: WeatherForecastProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getWeatherEmoji = (condition: string, snowfall: number) => {
    if (snowfall > 20) return '🌨️'; // Heavy snow
    if (snowfall > 5) return '🌨️'; // Snow
    if (snowfall > 0) return '☁️'; // Light snow/cloudy
    if (condition.includes('rain')) return '🌧️'; // Rain
    if (condition.includes('cloud')) return '⛅'; // Partly cloudy
    return '☀️'; // Clear
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <IconSymbol name="calendar" size={20} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]}>7日間天気予報</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.forecastContainer}>
        {forecast.map((day, index) => (
          <View
            key={day.date}
            style={[
              styles.dayCard,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              }
            ]}>
            {/* Date */}
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {index === 0 ? '今日' : formatDate(day.date)}
            </Text>
            <Text style={[styles.dayOfWeek, { color: colors.textSecondary }]}>
              {day.dayOfWeek}
            </Text>

            {/* Weather Icon */}
            <Text style={styles.weatherIcon}>
              {getWeatherEmoji(day.condition, day.snowfallCm)}
            </Text>

            {/* Temperature */}
            <View style={styles.tempContainer}>
              <Text style={[styles.tempHigh, { color: colors.text }]}>
                {day.tempHigh}°
              </Text>
              <Text style={[styles.tempLow, { color: colors.textSecondary }]}>
                {day.tempLow}°
              </Text>
            </View>

            {/* Snowfall */}
            {day.snowfallCm > 0 && (
              <View style={[styles.snowBadge, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.snowText, { color: colors.accent }]}>
                  ❄️ {day.snowfallCm}cm
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  forecastContainer: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  dayCard: {
    width: 90,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  date: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  dayOfWeek: {
    fontSize: fontSize.xs,
  },
  weatherIcon: {
    fontSize: 32,
    marginVertical: spacing.xs,
  },
  tempContainer: {
    alignItems: 'center',
    gap: 2,
  },
  tempHigh: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  tempLow: {
    fontSize: fontSize.sm,
  },
  snowBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  snowText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
