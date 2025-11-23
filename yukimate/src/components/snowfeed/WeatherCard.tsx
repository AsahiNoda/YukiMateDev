import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from '@components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { spacing, fontSize, borderRadius, fontWeight } from '@/constants/spacing';
import { useColorScheme } from '@hooks/use-color-scheme';
import type { SnowfeedWeather } from '@types';

interface WeatherCardProps {
  resortName: string;
  weather: SnowfeedWeather;
}

export function WeatherCard({ resortName, weather }: WeatherCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // 天気状態を判定して絵文字を返す
  const getWeatherEmoji = () => {
    if (weather.newSnowCm && weather.newSnowCm > 20) {
      return '🌨️'; // 大雪
    } else if (weather.newSnowCm && weather.newSnowCm > 5) {
      return '🌨️'; // 雪
    } else if (weather.newSnowCm && weather.newSnowCm > 0) {
      return '☁️'; // 曇り（少し雪）
    } else if (weather.tempC && weather.tempC > 0) {
      return '🌧️'; // 雨
    } else if (weather.tempC && weather.tempC > -5) {
      return '⛅'; // 晴れ時々曇り
    }
    return '☀️'; // 快晴
  };

  // コンディションバッジを判定
  const getConditionBadge = () => {
    if (weather.newSnowCm && weather.newSnowCm >= 30) {
      return { text: '🎿 Powder Day!', color: '#10B981', emoji: '✨' }; // Green
    } else if (weather.newSnowCm && weather.newSnowCm >= 10) {
      return { text: '❄️ Fresh Snow', color: '#3B82F6', emoji: '🎉' }; // Blue
    } else if (weather.snowQuality === 'powder') {
      return { text: '⛷️ Good Powder', color: '#8B5CF6', emoji: '👍' }; // Purple
    } else if (weather.snowQuality === 'packed') {
      return { text: '🏂 Packed Snow', color: '#F59E0B', emoji: '⚡' }; // Orange
    } else if (weather.visibility === 'poor' || weather.snowQuality === 'icy') {
      return { text: '⚠️ Caution', color: '#EF4444', emoji: '🛑' }; // Red
    }
    return null;
  };

  // 天気状態のテキスト
  const getWeatherDescription = () => {
    if (weather.newSnowCm && weather.newSnowCm >= 30) {
      return 'Heavy Snowfall';
    } else if (weather.newSnowCm && weather.newSnowCm >= 10) {
      return 'Light Snowfall';
    } else if (weather.snowQuality === 'powder') {
      return 'Powder Snow';
    } else if (weather.snowQuality === 'packed') {
      return 'Packed Snow';
    } else if (weather.snowQuality === 'slushy') {
      return 'Slushy Snow';
    } else if (weather.snowQuality === 'icy') {
      return 'Icy Conditions';
    }
    return 'Clear';
  };

  const badge = getConditionBadge();
  const weatherEmoji = getWeatherEmoji();
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
            <Text style={styles.weatherEmoji}>{weatherEmoji}</Text>
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

        {/* Visibility */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <IconSymbol name="eye" size={20} color={colors.accent} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {weather.visibility ? weather.visibility.charAt(0).toUpperCase() + weather.visibility.slice(1) : 'N/A'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Visibility</Text>
        </View>
      </View>

      {/* Condition Badge */}
      {badge && (
        <View style={[styles.conditionBadge, { backgroundColor: badge.color }]}>
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>
      )}
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
  weatherEmoji: {
    fontSize: 64,
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
