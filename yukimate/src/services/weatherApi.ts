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
  weatherCode: number; // WMO Weather interpretation codes
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
  'ニュー・グリーンピア津南スキー場': { lat: 37.0328, lon: 138.6528 },
  'ニューグリーンピア津南': { lat: 37.0328, lon: 138.6528 },
  'グリーンピア津南': { lat: 37.0328, lon: 138.6528 },

  // 群馬エリア
  'ホワイトワールド尾瀬岩鞍': { lat: 36.7806, lon: 139.2553 },
  '尾瀬岩鞍': { lat: 36.7806, lon: 139.2553 },

  // デフォルト（白馬エリアの中心）
  'default': { lat: 36.7, lon: 137.85 },
};

/**
 * リゾートIDまたは名前から座標を取得
 */
function getResortCoordinates(resortIdOrName: string): { lat: number; lon: number } {
  console.log(`[getResortCoordinates] Searching for: "${resortIdOrName}"`);

  // 入力を正規化（全角→半角、スペース除去、小文字化）
  const normalize = (str: string) =>
    str
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/\s+/g, '')
      .toLowerCase();

  const normalizedInput = normalize(resortIdOrName);

  // 1. 完全一致検索
  if (RESORT_COORDINATES[resortIdOrName]) {
    console.log(`[getResortCoordinates] Exact match found: ${resortIdOrName}`);
    return RESORT_COORDINATES[resortIdOrName];
  }

  // 2. 正規化して完全一致検索
  for (const [key, coords] of Object.entries(RESORT_COORDINATES)) {
    if (key === 'default') continue;
    const normalizedKey = normalize(key);

    if (normalizedInput === normalizedKey) {
      console.log(`[getResortCoordinates] Normalized exact match found: ${key} for ${resortIdOrName}`);
      return coords;
    }
  }

  // 3. 部分一致検索（正規化済み）
  for (const [key, coords] of Object.entries(RESORT_COORDINATES)) {
    if (key === 'default') continue;
    const normalizedKey = normalize(key);

    // より柔軟な部分一致（順序を変えて両方向チェック）
    if (normalizedInput.includes(normalizedKey) || normalizedKey.includes(normalizedInput)) {
      console.log(`[getResortCoordinates] Partial match found: ${key} for ${resortIdOrName}`);
      return coords;
    }
  }

  // 4. キーワード抽出して検索（例: "ニセコグランヒラフスキー場" → "ニセコ", "ヒラフ"）
  const keywords = [
    'ニセコ', 'ヒラフ', 'アンヌプリ', 'ルスツ', 'キロロ', 'トマム', 'サホロ',
    '白馬', '八方', 'hakuba', '五竜', '栂池', '岩岳',
    '野沢', '志賀', '竜王',
    '妙高', '赤倉', '杉ノ原',
    '苗場', 'かぐら', 'gala', 'ガーラ', 'ばんけい',
    '津南', 'グリーンピア',
    '尾瀬', '岩鞍', 'ホワイトワールド'
  ];

  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);
    if (normalizedInput.includes(normalizedKeyword)) {
      // キーワードに一致するリゾートを探す
      for (const [key, coords] of Object.entries(RESORT_COORDINATES)) {
        if (key === 'default') continue;
        const normalizedKey = normalize(key);
        if (normalizedKey.includes(normalizedKeyword)) {
          console.log(`[getResortCoordinates] Keyword match found: ${key} (keyword: ${keyword}) for ${resortIdOrName}`);
          return coords;
        }
      }
    }
  }

  // 5. マッチしない場合はデフォルト
  console.warn(`[getResortCoordinates] No match found for "${resortIdOrName}", using default coordinates`);
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
 * 視界を判定（風速と降雪から推測）
 */
function categorizeVisibility(windMs: number, newSnowCm: number): 'good' | 'moderate' | 'poor' {
  // 強風 + 降雪 → 視界不良
  if (windMs > 10 && newSnowCm > 5) return 'poor';
  if (windMs > 15) return 'poor'; // 強風のみでも視界不良
  if (windMs > 8 || newSnowCm > 10) return 'moderate'; // 中程度の風または大雪
  return 'good'; // それ以外は良好
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
    url.searchParams.append('current', 'temperature_2m,wind_speed_10m,weather_code');
    url.searchParams.append('daily', 'snowfall_sum');
    url.searchParams.append('hourly', 'snow_depth');
    url.searchParams.append('timezone', 'Asia/Tokyo');
    url.searchParams.append('forecast_days', '3'); // 3日分取得して精度向上

    console.log('Weather API URL:', url.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Weather API error response:', errorText);
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: any = await response.json();

    // デバッグ用：重要なデータのみログ出力
    console.log('[Weather API] Current:', {
      temp: data.current?.temperature_2m,
      wind: data.current?.wind_speed_10m,
      weather_code: data.current?.weather_code,
    });
    console.log('[Weather API] Daily snowfall:', data.daily?.snowfall_sum);
    console.log('[Weather API] Hourly snow_depth (first 5):', data.hourly?.snow_depth?.slice(0, 5));

    // データを変換（APIデータがない場合はnullを返す）
    const tempC = data.current?.temperature_2m ?? null;
    const tempCRounded = tempC !== null ? Math.round(tempC) : null;

    // 降雪量（過去24時間の合計）- Open-Meteo APIはcm単位で返す
    const newSnowCm = data.daily?.snowfall_sum?.[0] ?? null;
    const newSnowCmRounded = newSnowCm !== null ? Math.round(newSnowCm * 10) / 10 : null;

    // 積雪深度（最新の時間データ）- Open-Meteo APIはcm単位
    // 注意: 日本のスキー場ではsnow_depthデータがnullの場合が多い
    const snowDepthArray = data.hourly?.snow_depth || [];
    const baseDepthCm = snowDepthArray.length > 0 ? snowDepthArray[0] ?? null : null;
    const baseDepthCmRounded = baseDepthCm !== null ? Math.round(baseDepthCm) : null;

    console.log('[Weather API] Parsed values:', {
      tempC: tempCRounded,
      newSnowCm: newSnowCmRounded,
      baseDepthCm: baseDepthCmRounded,
    });

    // 風速 - Open-Meteoはkm/h単位なのでm/sに変換
    const windKmh = data.current?.wind_speed_10m ?? null;
    const windMs = windKmh !== null ? Math.round((windKmh / 3.6) * 10) / 10 : null;

    // 天気コード（WMO Weather interpretation codes）
    const weatherCode = data.current?.weather_code ?? null;

    // データが不足している場合はnullを返す
    if (tempCRounded === null || windMs === null || weatherCode === null) {
      console.warn('Weather data incomplete, returning null');
      return null;
    }

    // 視界を風速と降雪量から推測
    const visibility = categorizeVisibility(windMs, newSnowCmRounded ?? 0);

    const snowQuality = categorizeSnowQuality(tempCRounded, newSnowCmRounded ?? 0);

    return {
      tempC: tempCRounded,
      newSnowCm: newSnowCmRounded ?? 0,
      baseDepthCm: baseDepthCmRounded ?? 0,
      windMs: windMs,
      visibility,
      snowQuality,
      weatherCode,
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    // エラーの場合はnullを返す（ダミーデータは返さない）
    return null;
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
