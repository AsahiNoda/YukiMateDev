import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/spacing';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@hooks/use-color-scheme';
import { useTranslation } from '@/hooks/useTranslation';
import type { SnowfeedWeather } from '@types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// Weather icons
import CloudIcon from '../../../assets/images/icons/weather/cloud.svg';
import CloudyIcon from '../../../assets/images/icons/weather/cloudy.svg';
import DayCloudyIcon from '../../../assets/images/icons/weather/day-cloudy.svg';
import DayRainIcon from '../../../assets/images/icons/weather/day-rain.svg';
import DaySnowIcon from '../../../assets/images/icons/weather/day-snow.svg';
import DaySunnyOvercastIcon from '../../../assets/images/icons/weather/day-sunny-overcast.svg';
import DaySunnyIcon from '../../../assets/images/icons/weather/day-sunny.svg';
import DayWindyIcon from '../../../assets/images/icons/weather/day-windy.svg';
import FogIcon from '../../../assets/images/icons/weather/fog.svg';
import RainIcon from '../../../assets/images/icons/weather/rain.svg';
import ShowersIcon from '../../../assets/images/icons/weather/showers.svg';
import SnowIcon from '../../../assets/images/icons/weather/snow.svg';
import StormShowersIcon from '../../../assets/images/icons/weather/storm-showers.svg';

interface WeatherCardProps {
  resortName: string;
  weather: SnowfeedWeather;
  isHomeResort?: boolean;
}

export function WeatherCard({ resortName, weather, isHomeResort = false }: WeatherCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useTranslation();

  // デバッグ: weatherデータを確認
  console.log('[WeatherCard] Weather data:', weather);

  // WMO Weather interpretation codes から天気アイコンコンポーネントを返す
  const getWeatherIcon = () => {
    const code = weather.weatherCode ?? 0;
    console.log('[WeatherCard] Weather code:', code);

    // 0: Clear sky → 快晴
    if (code === 0) return DaySunnyIcon;

    // 1: Mainly clear → 晴れ
    if (code === 1) return DaySunnyOvercastIcon;

    // 2: Partly cloudy → 晴れ時々曇り
    if (code === 2) return DayCloudyIcon;

    // 3: Overcast → 曇り
    if (code === 3) return CloudyIcon;

    // 45, 48: Fog → 霧
    if (code === 45 || code === 48) return FogIcon;

    // 51-57: Drizzle → 小雨
    if (code >= 51 && code <= 57) return DayRainIcon;

    // 61-67: Rain → 雨
    if (code >= 61 && code <= 67) return RainIcon;

    // 71-77: Snow fall → 雪
    if (code >= 71 && code <= 77) return SnowIcon;

    // 80-82: Rain showers → にわか雨
    if (code >= 80 && code <= 82) return ShowersIcon;

    // 85, 86: Snow showers → にわか雪
    if (code === 85 || code === 86) return DaySnowIcon;

    // 95-99: Thunderstorm → 雷雨
    if (code >= 95) return StormShowersIcon;

    // Default → 曇り
    return CloudIcon;
  };

  // 天気状態のテキスト（WMOコードベース）
  const getWeatherDescription = () => {
    const code = weather.weatherCode ?? 0;

    if (code === 0) return t('weather.clear');
    if (code === 1) return t('weather.sunny');
    if (code === 2) return t('weather.partlyCloudy');
    if (code === 3) return t('weather.cloudy');
    if (code === 45 || code === 48) return t('weather.fog');
    if (code >= 51 && code <= 57) return t('weather.lightRain');
    if (code >= 61 && code <= 67) return t('weather.rain');
    if (code >= 71 && code <= 77) return t('weather.snow');
    if (code >= 80 && code <= 82) return t('weather.showers');
    if (code === 85 || code === 86) return t('weather.lightSnow');
    if (code >= 95) return t('weather.thunderstorm');

    return t('weather.unknown');
  };

  const WeatherIcon = getWeatherIcon();
  const weatherDesc = getWeatherDescription();

  // 視界のテキスト変換
  const getVisibilityText = () => {
    if (!weather.visibility) return '--';
    switch (weather.visibility) {
      case 'good': return t('weather.visibilityGood');
      case 'moderate': return t('weather.visibilityModerate');
      case 'poor': return t('weather.visibilityPoor');
      default: return '--';
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Resort Name */}
      <View style={styles.resortNameContainer}>
        <Text style={[styles.resortName, { color: colors.textSecondary }]}>{resortName}</Text>
        {isHomeResort && (
          <Text style={[styles.homeLabel, { color: colors.accent }]}>{t('weather.homeResort')}</Text>
        )}
      </View>

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
            <WeatherIcon width={100} height={100} color={colors.text} />
          </View>
          <Text style={[styles.weatherDescription, { color: colors.text }]}>{weatherDesc}</Text>
        </View>
      </View>

      {/* Weather Stats Row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        {/* Wind Speed */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <DayWindyIcon width={24} height={24} color={colors.icon} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {weather.windMs ?? '--'} m/s
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('weather.windSpeed')}</Text>
        </View>

        {/* Visibility */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <FogIcon width={24} height={24} color={colors.icon} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {getVisibilityText()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('weather.visibility')}</Text>
        </View>

        {/* New Snow */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <SnowIcon width={24} height={24} color={colors.icon} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {weather.newSnowCm ?? '--'} cm
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('weather.newSnow')}</Text>
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
  resortNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  resortName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  homeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
  weatherIcon: {
    width: 74,
    height: 74,
  },
  weatherDescription: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
