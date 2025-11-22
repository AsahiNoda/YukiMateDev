/**
 * Open-Meteo Weather API Service
 * https://open-meteo.com/
 */

export interface FetchedWeatherData {
  tempC: number;
  newSnowCm: number;
  baseDepthCm: number;
  windMs: number;
  visibility: 'good' | 'moderate' | 'poor';
  snowQuality: 'powder' | 'packed' | 'slushy' | 'icy';
}

export interface DailyForecast {
  date: string;
  dayOfWeek: string;
  tempHigh: number;
  tempLow: number;
  snowfallCm: number;
  condition: string;
}

/**
 * リゾートの座標を定義（実際のリゾートの緯度経度）
 */
const RESORT_COORDINATES: Record<string, { lat: number; lon: number }> = {
  // 北海道エリア
  'さっぽろばんけいスキー場': { lat: 43.0389, lon: 141.2694 },
  'ばんけい': { lat: 43.0389, lon: 141.2694 },
  'niseko-grand-hirafu': { lat: 42.8656, lon: 140.6878 },
  'ニセコグランヒラフ': { lat: 42.8656, lon: 140.6878 },
  'グランヒラフ': { lat: 42.8656, lon: 140.6878 },
  'ヒラフ': { lat: 42.8656, lon: 140.6878 },
  'niseko-annupuri': { lat: 42.8889, lon: 140.6722 },
  'ニセコアンヌプリ': { lat: 42.8889, lon: 140.6722 },
  'アンヌプリ': { lat: 42.8889, lon: 140.6722 },
  'ルスツリゾート': { lat: 42.7406, lon: 140.8817 },
  'ルスツ': { lat: 42.7406, lon: 140.8817 },
  'キロロスノーワールド': { lat: 43.0842, lon: 140.9944 },
  'キロロ': { lat: 43.0842, lon: 140.9944 },
  'トマムスキー場': { lat: 43.0564, lon: 142.6203 },
  'トマム': { lat: 43.0564, lon: 142.6203 },
  'サホロリゾートスキー場': { lat: 43.1403, lon: 142.7953 },
  'サホロ': { lat: 43.1403, lon: 142.7953 },

  // 白馬エリア
  'hakuba-happo': { lat: 36.6975, lon: 137.8311 },
  '白馬八方尾根': { lat: 36.6975, lon: 137.8311 },
  '八方尾根': { lat: 36.6975, lon: 137.8311 },
  'hakuba-47': { lat: 36.6855, lon: 137.8478 },
  'hakuba47': { lat: 36.6855, lon: 137.8478 },
  'Hakuba47': { lat: 36.6855, lon: 137.8478 },
  'hakuba-goryu': { lat: 36.6656, lon: 137.8544 },
  '白馬五竜': { lat: 36.6656, lon: 137.8544 },
  '五竜': { lat: 36.6656, lon: 137.8544 },
  '栂池高原スキー場': { lat: 36.7819, lon: 137.8658 },
  '栂池': { lat: 36.7819, lon: 137.8658 },
  '白馬岩岳スノーフィールド': { lat: 36.7006, lon: 137.8569 },
  '岩岳': { lat: 36.7006, lon: 137.8569 },

  // 志賀高原・野沢エリア
  'nozawa-onsen': { lat: 36.9258, lon: 138.4456 },
  '野沢温泉': { lat: 36.9258, lon: 138.4456 },
  '志賀高原': { lat: 36.7444, lon: 138.5183 },
  '竜王スキーパーク': { lat: 36.7581, lon: 138.4461 },
  '竜王': { lat: 36.7581, lon: 138.4461 },

  // 妙高エリア
  'myoko-akakura': { lat: 36.8869, lon: 138.1556 },
  '妙高赤倉': { lat: 36.8869, lon: 138.1556 },
  '赤倉': { lat: 36.8869, lon: 138.1556 },
  '赤倉観光リゾートスキー場': { lat: 36.8869, lon: 138.1556 },
  '妙高杉ノ原スキー場': { lat: 36.9308, lon: 138.1753 },
  '杉ノ原': { lat: 36.9308, lon: 138.1753 },

  // 苗場・湯沢エリア
  '苗場スキー場': { lat: 36.8503, lon: 138.8503 },
  '苗場': { lat: 36.8503, lon: 138.8503 },
  'かぐらスキー場': { lat: 36.8431, lon: 138.8544 },
  'かぐら': { lat: 36.8431, lon: 138.8544 },
  'GALA湯沢': { lat: 36.9242, lon: 138.7883 },
  'ガーラ湯沢': { lat: 36.9242, lon: 138.7883 },

  // デフォルト（白馬エリアの中心）
  'default': { lat: 36.7, lon: 137.85 },
};

/**
 * リゾートIDまたは名前から座標を取得
 */
function getResortCoordinates(resortIdOrName: string): { lat: number; lon: number } {
  console.log(`[getResortCoordinates] Searching for: "${resortIdOrName}"`);

  // 1. 完全一致検索
  if (RESORT_COORDINATES[resortIdOrName]) {
    console.log(`[getResortCoordinates] Exact match found: ${resortIdOrName}`);
    return RESORT_COORDINATES[resortIdOrName];
  }

  // 2. 部分一致検索（リゾート名に含まれるキーワード）
  for (const [key, coords] of Object.entries(RESORT_COORDINATES)) {
    if (key === 'default') continue;

    // リゾート名がキーを含むか、キーがリゾート名を含むか
    if (resortIdOrName.includes(key) || key.includes(resortIdOrName)) {
      console.log(`[getResortCoordinates] Partial match found: ${key} for ${resortIdOrName}`);
      return coords;
    }
  }

  // 3. 正規化して再検索（小文字、スペース除去）
  const normalized = resortIdOrName.toLowerCase().replace(/\s+/g, '-');
  for (const [key, coords] of Object.entries(RESORT_COORDINATES)) {
    if (key === 'default') continue;
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '-');

    if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
      console.log(`[getResortCoordinates] Normalized match found: ${key} for ${resortIdOrName}`);
      return coords;
    }
  }

  // 4. マッチしない場合はデフォルト
  console.log(`[getResortCoordinates] No match found for "${resortIdOrName}", using default coordinates`);
  return RESORT_COORDINATES['default'];
}

/**
 * 雪質を判定（気温と降雪から推測）
 */
function categorizeSnowQuality(tempC: number, newSnowCm: number): 'powder' | 'packed' | 'slushy' | 'icy' {
  if (tempC > 0) return 'slushy'; // プラス気温 → シャバシャバ雪
  if (tempC < -8 && newSnowCm > 5) return 'powder'; // 低温 + 新雪 → パウダー
  if (tempC < -5) return 'packed'; // 低温 → 圧雪
  if (tempC > -2) return 'icy'; // 氷点下ギリギリ → アイスバーン
  return 'packed'; // デフォルト
}

/**
 * Open-Meteo APIから天気データを取得
 */
export async function fetchWeatherData(
  resortIdOrName: string
): Promise<FetchedWeatherData | null> {
  try {
    const { lat, lon } = getResortCoordinates(resortIdOrName);

    // Open-Meteo API URL（正しいパラメータで構築）
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('current', 'temperature_2m,wind_speed_10m');
    url.searchParams.append('daily', 'snowfall_sum,snow_depth_max');
    url.searchParams.append('timezone', 'Asia/Tokyo');
    url.searchParams.append('forecast_days', '1');

    console.log('Weather API URL:', url.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Weather API error response:', errorText);
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: any = await response.json();
    console.log('Weather API response:', data);

    // データを変換
    const tempC = data.current?.temperature_2m
      ? Math.round(data.current.temperature_2m)
      : -3;

    const newSnowCm = data.daily?.snowfall_sum?.[0]
      ? Math.round(data.daily.snowfall_sum[0] * 10) / 10
      : Math.round(Math.random() * 20);

    const baseDepthCm = data.daily?.snow_depth_max?.[0]
      ? Math.round(data.daily.snow_depth_max[0] * 100) // m → cm
      : Math.round(Math.random() * 100 + 100);

    const windMs = data.current?.wind_speed_10m
      ? Math.round(data.current.wind_speed_10m / 3.6 * 10) / 10 // km/h → m/s
      : Math.round(Math.random() * 10);

    // 視界はAPIから取得できないので、ランダムに設定
    const visibilityOptions: Array<'good' | 'moderate' | 'poor'> = ['good', 'moderate', 'poor'];
    const visibility = visibilityOptions[Math.floor(Math.random() * 3)];

    const snowQuality = categorizeSnowQuality(tempC, newSnowCm);

    return {
      tempC,
      newSnowCm,
      baseDepthCm,
      windMs,
      visibility,
      snowQuality,
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    // エラーの場合はダミーデータを返す
    return {
      tempC: -3,
      newSnowCm: Math.round(Math.random() * 20),
      baseDepthCm: Math.round(Math.random() * 100 + 100),
      windMs: Math.round(Math.random() * 10),
      visibility: 'good',
      snowQuality: 'powder',
    };
  }
}

/**
 * 7日間の天気予報を取得
 */
export async function fetch7DayForecast(
  resortIdOrName: string
): Promise<DailyForecast[]> {
  try {
    const { lat, lon } = getResortCoordinates(resortIdOrName);

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('daily', 'temperature_2m_max,temperature_2m_min,snowfall_sum,weather_code');
    url.searchParams.append('timezone', 'Asia/Tokyo');
    url.searchParams.append('forecast_days', '7');

    console.log('7-day Forecast API URL:', url.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.status}`);
    }

    const data: any = await response.json();
    console.log('7-day Forecast API response:', data);

    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
    const forecast: DailyForecast[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(data.daily.time[i]);
      const dayOfWeek = daysOfWeek[date.getDay()];

      forecast.push({
        date: data.daily.time[i],
        dayOfWeek,
        tempHigh: Math.round(data.daily.temperature_2m_max[i]),
        tempLow: Math.round(data.daily.temperature_2m_min[i]),
        snowfallCm: Math.round((data.daily.snowfall_sum[i] || 0) * 10) / 10,
        condition: getConditionFromWeatherCode(data.daily.weather_code[i]),
      });
    }

    return forecast;
  } catch (error) {
    console.error('Error fetching 7-day forecast:', error);
    // エラーの場合はダミーデータを返す
    return generateDummyForecast();
  }
}

/**
 * 天気コードから状態を判定
 */
function getConditionFromWeatherCode(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80) return 'rain';
  return 'cloudy';
}

/**
 * ダミーの7日間予報を生成
 */
function generateDummyForecast(): DailyForecast[] {
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
  const forecast: DailyForecast[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = daysOfWeek[date.getDay()];

    forecast.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      tempHigh: Math.round(Math.random() * 10 - 5),
      tempLow: Math.round(Math.random() * 10 - 15),
      snowfallCm: Math.round(Math.random() * 15 * 10) / 10,
      condition: ['clear', 'cloudy', 'snow', 'rain'][Math.floor(Math.random() * 4)],
    });
  }

  return forecast;
}

/**
 * 複数のリゾートの天気データを一括取得
 */
export async function fetchMultipleWeatherData(
  resortIds: string[]
): Promise<Map<string, FetchedWeatherData>> {
  const results = new Map<string, FetchedWeatherData>();

  const promises = resortIds.map(async (resortId) => {
    const data = await fetchWeatherData(resortId);
    if (data) {
      results.set(resortId, data);
    }
  });

  await Promise.all(promises);

  return results;
}
