import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@components/ui/icon-symbol';
import { useColorScheme } from '@hooks/use-color-scheme';
import type { SnowfeedWeather } from '@types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WeatherCardProps {
  resortName: string;
  weather: SnowfeedWeather;
}

export function WeatherCard({ resortName, weather }: WeatherCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // WMO Weather interpretation codes から天気アイコンを返す
  const getWeatherIcon = () => {
    const code = weather.weatherCode ?? 0;

    // 0: Clear sky
    if (code === 0) return 'sun.max.fill';

    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    if (code <= 3) return 'cloud.sun.fill';

    // 45, 48: Fog
    if (code === 45 || code === 48) return 'cloud.fog.fill';

    // 51-57: Drizzle
    if (code >= 51 && code <= 57) return 'cloud.drizzle.fill';

    // 61-67: Rain
    if (code >= 61 && code <= 67) return 'cloud.rain.fill';

    // 71-77: Snow fall
    if (code >= 71 && code <= 77) return 'snowflake';

    // 80-82: Rain showers
    if (code >= 80 && code <= 82) return 'cloud.heavyrain.fill';

    // 85, 86: Snow showers
    if (code === 85 || code === 86) return 'cloud.snow.fill';

    // 95-99: Thunderstorm
    if (code >= 95) return 'cloud.bolt.rain.fill';

    return 'cloud.fill';
  };

  // 天気状態のテキスト（WMOコードベース）
  const getWeatherDescription = () => {
    const code = weather.weatherCode ?? 0;

    if (code === 0) return 'Clear';
    if (code === 1) return 'Mainly Clear';
    if (code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Foggy';
    if (code >= 51 && code <= 57) return 'Drizzle';
    if (code >= 61 && code <= 67) return 'Rainy';
    if (code >= 71 && code <= 77) return 'Snowy';
    if (code >= 80 && code <= 82) return 'Rain Showers';
    if (code === 85 || code === 86) return 'Snow Showers';
    if (code >= 95) return 'Thunderstorm';

    return 'Unknown';
  };

  const weatherIcon = getWeatherIcon();
  const weatherDesc = getWeatherDescription();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Resort Name */}
      <Text style={[styles.resortName, { color: colors.textSecondary }]}>{resortName}</Text>

      {/* Main Weather Display */}
      <View style={styles.mainWeather}>
        {/* Temperature - Large Display */}
        <View style={styles.tempContainer}>
          <Text style={[styles.temperature, { color: colors.text }]}>
            {weather.tempC ?? '--'}°
          </Text>
          <Text style={[styles.tempUnit, { color: colors.textSecondary }]}>C</Text>
        </View>

        {/* Weather Icon & Description */}
        <View style={styles.weatherInfo}>
          <View style={styles.iconContainer}>
            <IconSymbol name={weatherIcon as any} size={64} color={colors.accent} />
          </View>
          <Text style={[styles.weatherDescription, { color: colors.text }]}>{weatherDesc}</Text>
        </View>
      </View>

      {/* Snow Depth Display */}
      {weather.baseDepthCm !== null && (
        <View style={[styles.snowDepthContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <IconSymbol name="snow" size={24} color={colors.accent} />
          <Text style={[styles.snowDepthValue, { color: colors.text }]}>
            {weather.baseDepthCm}
          </Text>
          <Text style={[styles.snowDepthLabel, { color: colors.textSecondary }]}>
            cm Current Snow Depth
          </Text>
        </View>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* New Snow */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <IconSymbol name="snow" size={20} color={colors.accent} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {weather.newSnowCm ?? '--'}cm
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>New Snow</Text>
        </View>

        {/* Wind Speed */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <IconSymbol name="wind" size={20} color={colors.accent} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {weather.windMs ?? '--'}m/s
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Wind</Text>
        </View>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resortName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainWeather: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  tempContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  temperature: {
    fontSize: 72,
    fontWeight: fontWeight.bold,
    lineHeight: 72,
  },
  tempUnit: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  weatherInfo: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherDescription: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  snowDepthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  snowDepthValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  snowDepthLabel: {
    fontSize: fontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  statLabel: {
    fontSize: fontSize.xs,
  },
  conditionBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    marginTop: spacing.md,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
});
