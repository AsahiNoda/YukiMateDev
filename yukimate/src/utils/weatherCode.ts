/**
 * WMO の天気コード（Open-Meteo の weather_code）→ 天気アイコンと表示名の翻訳キー。
 * ホームの天気カード（案D）と Snowfeed の天気カードで共通に使う。
 */
import CloudIcon from '../../assets/images/icons/weather/cloud.svg';
import CloudyIcon from '../../assets/images/icons/weather/cloudy.svg';
import DayCloudyIcon from '../../assets/images/icons/weather/day-cloudy.svg';
import DayRainIcon from '../../assets/images/icons/weather/day-rain.svg';
import DaySnowIcon from '../../assets/images/icons/weather/day-snow.svg';
import DaySunnyOvercastIcon from '../../assets/images/icons/weather/day-sunny-overcast.svg';
import DaySunnyIcon from '../../assets/images/icons/weather/day-sunny.svg';
import FogIcon from '../../assets/images/icons/weather/fog.svg';
import RainIcon from '../../assets/images/icons/weather/rain.svg';
import ShowersIcon from '../../assets/images/icons/weather/showers.svg';
import SnowIcon from '../../assets/images/icons/weather/snow.svg';
import StormShowersIcon from '../../assets/images/icons/weather/storm-showers.svg';

export function weatherIconFor(code: number | null | undefined) {
  const c = code ?? 3;
  if (c === 0) return DaySunnyIcon;
  if (c === 1) return DaySunnyOvercastIcon;
  if (c === 2) return DayCloudyIcon;
  if (c === 3) return CloudyIcon;
  if (c === 45 || c === 48) return FogIcon;
  if (c >= 51 && c <= 57) return DayRainIcon;
  if (c >= 61 && c <= 67) return RainIcon;
  if (c >= 71 && c <= 77) return SnowIcon;
  if (c >= 80 && c <= 82) return ShowersIcon;
  if (c === 85 || c === 86) return DaySnowIcon;
  if (c >= 95) return StormShowersIcon;
  return CloudIcon;
}

export function weatherLabelKey(code: number | null | undefined): string {
  const c = code ?? -1;
  if (c === 0) return 'weather.clear';
  if (c === 1) return 'weather.sunny';
  if (c === 2) return 'weather.partlyCloudy';
  if (c === 3) return 'weather.cloudy';
  if (c === 45 || c === 48) return 'weather.fog';
  if (c >= 51 && c <= 57) return 'weather.lightRain';
  if (c >= 61 && c <= 67) return 'weather.rain';
  if (c >= 71 && c <= 77) return 'weather.snow';
  if (c >= 80 && c <= 82) return 'weather.showers';
  if (c === 85 || c === 86) return 'weather.lightSnow';
  if (c >= 95) return 'weather.thunderstorm';
  return 'weather.unknown';
}
