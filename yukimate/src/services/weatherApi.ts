/**
 * 気象庁 (Japan Meteorological Agency) Weather API Service
 * https://www.jma.go.jp/bosai/
 *
 * データソース優先順位:
 * 1. 気象庁アメダス（最も正確な観測データ）
 * 2. Open-Meteo（フォールバック）
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
 * 都道府県ごとのデフォルト座標（主要スキーエリアの中心）
 */
const PREFECTURE_DEFAULTS: Record<string, { lat: number; lon: number; areaCode: string; subAreaCode: string }> = {
  '北海道': { lat: 42.9, lon: 141.7, areaCode: '016000', subAreaCode: '016000' }, // ニセコ・札幌エリア
  '青森県': { lat: 40.6, lon: 140.5, areaCode: '020000', subAreaCode: '020010' },
  '岩手県': { lat: 39.7, lon: 140.9, areaCode: '030000', subAreaCode: '030010' },
  '宮城県': { lat: 38.3, lon: 140.6, areaCode: '040000', subAreaCode: '040010' },
  '秋田県': { lat: 39.7, lon: 140.1, areaCode: '050000', subAreaCode: '050010' },
  '山形県': { lat: 38.3, lon: 140.1, areaCode: '060000', subAreaCode: '060010' },
  '福島県': { lat: 37.6, lon: 139.9, areaCode: '070000', subAreaCode: '070010' },
  '群馬県': { lat: 36.7, lon: 138.8, areaCode: '100000', subAreaCode: '100020' }, // 水上・尾瀬エリア
  '栃木県': { lat: 36.9, lon: 139.7, areaCode: '090000', subAreaCode: '090010' },
  '新潟県': { lat: 37.0, lon: 138.7, areaCode: '150000', subAreaCode: '150020' }, // 湯沢エリア
  '長野県': { lat: 36.7, lon: 137.85, areaCode: '200000', subAreaCode: '200010' }, // 白馬エリア
  '富山県': { lat: 36.7, lon: 137.2, areaCode: '160000', subAreaCode: '160010' },
  '岐阜県': { lat: 36.1, lon: 137.2, areaCode: '210000', subAreaCode: '210010' },
  '山梨県': { lat: 35.7, lon: 138.6, areaCode: '190000', subAreaCode: '190010' },
  '兵庫県': { lat: 35.4, lon: 134.5, areaCode: '280000', subAreaCode: '280010' },
  '広島県': { lat: 35.0, lon: 132.8, areaCode: '340000', subAreaCode: '340010' },
  '島根県': { lat: 35.3, lon: 132.7, areaCode: '320000', subAreaCode: '320010' },
  '鳥取県': { lat: 35.4, lon: 133.3, areaCode: '310000', subAreaCode: '310010' },
};

/**
 * デフォルト座標（フォールバック用）
 * データベースに座標がない場合にのみ使用
 */
const DEFAULT_COORDINATES = {
  areaCode: '200000',
  subAreaCode: '200010',
  lat: 36.7,
  lon: 137.85
}; // 長野県白馬エリアの中心

/**
 * フォールバック座標を取得（データベースに座標がない場合のみ使用）
 * @param prefecture 都道府県名（オプション）
 * @returns フォールバック座標
 */
function getFallbackCoordinates(prefecture?: string): { lat: number; lon: number } {
  // 都道府県デフォルトを使用
  if (prefecture && PREFECTURE_DEFAULTS[prefecture]) {
    console.log(`[Weather API] Using prefecture default coordinates for ${prefecture}`);
    return PREFECTURE_DEFAULTS[prefecture];
  }

  // 最終フォールバック
  console.warn(`[Weather API] No coordinates available, using default fallback`);
  return DEFAULT_COORDINATES;
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
 * 度分表記を十進法に変換
 */
function degreesMinutesToDecimal(degrees: number, minutes: number): number {
  return degrees + minutes / 60;
}

/**
 * 最寄りのアメダス観測点を検索
 * @param lat 緯度（十進法）
 * @param lon 経度（十進法）
 * @param stationTable アメダス観測点テーブル
 * @returns 最寄りの観測点ID
 */
function findNearestAmedasStation(
  lat: number,
  lon: number,
  stationTable: any
): string | null {
  let nearestId: string | null = null;
  let minDistance = Infinity;

  for (const [stationId, station] of Object.entries<any>(stationTable)) {
    // 座標を十進法に変換
    const stationLat = degreesMinutesToDecimal(station.lat[0], station.lat[1]);
    const stationLon = degreesMinutesToDecimal(station.lon[0], station.lon[1]);

    // 距離を計算（簡易版：平面近似）
    const distance = Math.sqrt(
      Math.pow(lat - stationLat, 2) + Math.pow(lon - stationLon, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestId = stationId;
    }
  }

  console.log(`[JMA API] Nearest station: ${nearestId}, distance: ${minDistance.toFixed(4)}°`);
  return nearestId;
}

/**
 * 気象庁アメダスAPIから観測データを取得
 * @param lat 緯度（十進法）
 * @param lon 経度（十進法）
 * @returns 観測データ（気温、風速、積雪、降水量）
 */
async function fetchJMAData(
  lat: number,
  lon: number
): Promise<{
  tempC: number | null;
  windMs: number | null;
  snowDepthCm: number | null;
  precipitation24h: number | null;
  weatherCode: number | null;
} | null> {
  try {
    // Step 1: アメダス観測点テーブルを取得
    console.log('[JMA API] Fetching station table...');
    const stationResponse = await fetch('https://www.jma.go.jp/bosai/amedas/const/amedastable.json');
    if (!stationResponse.ok) {
      console.error('[JMA API] Failed to fetch station table');
      return null;
    }
    const stationTable = await stationResponse.json();

    // Step 2: 最寄りの観測点を検索
    const nearestStationId = findNearestAmedasStation(lat, lon, stationTable);
    if (!nearestStationId) {
      console.error('[JMA API] No nearby station found');
      return null;
    }

    const station = stationTable[nearestStationId];
    console.log(`[JMA API] Using station: ${station.kjName} (${nearestStationId})`);

    // Step 3: 最新の観測時刻を取得
    const timeResponse = await fetch('https://www.jma.go.jp/bosai/amedas/data/latest_time.txt');
    if (!timeResponse.ok) {
      console.error('[JMA API] Failed to fetch latest time');
      return null;
    }
    const latestTime = (await timeResponse.text()).trim();
    const timestamp = latestTime.replace(/[-:T+]/g, '').substring(0, 12) + '00';
    console.log(`[JMA API] Latest observation time: ${latestTime} -> ${timestamp}`);

    // Step 4: 観測データを取得
    const dataUrl = `https://www.jma.go.jp/bosai/amedas/data/map/${timestamp}.json`;
    console.log(`[JMA API] Fetching data from: ${dataUrl}`);
    const dataResponse = await fetch(dataUrl);
    if (!dataResponse.ok) {
      console.error('[JMA API] Failed to fetch observation data');
      return null;
    }
    const allData = await dataResponse.json();

    // Step 5: 対象観測点のデータを抽出
    const observationData = allData[nearestStationId];
    if (!observationData) {
      console.error(`[JMA API] No data for station ${nearestStationId}`);
      return null;
    }

    console.log(`[JMA API] Raw observation data:`, observationData);

    // データ抽出（[値, 品質フラグ]の配列形式）
    const tempC = observationData.temp?.[0] ?? null;
    const windMs = observationData.wind?.[0] ?? null;
    const snowDepthCm = observationData.snow?.[0] ?? null;
    const precipitation24h = observationData.precipitation24h?.[0] ?? null;

    console.log('[JMA API] Extracted data:', {
      tempC,
      windMs,
      snowDepthCm,
      precipitation24h,
    });

    // 天気コードは取得できないのでnull
    return {
      tempC,
      windMs,
      snowDepthCm,
      precipitation24h,
      weatherCode: null,
    };
  } catch (error) {
    console.error('[JMA API] Error:', error);
    return null;
  }
}

/**
 * 気象庁の天気コードをWMOコードに変換
 */
function jmaWeatherCodeToWMO(jmaCode: number): number {
  // 気象庁の天気コード → WMO Weather interpretation codes
  if (jmaCode >= 100 && jmaCode <= 102) return 0;  // 晴れ → Clear sky
  if (jmaCode >= 110 && jmaCode <= 112) return 1;  // 晴れのち曇り
  if (jmaCode >= 200 && jmaCode <= 202) return 3;  // 曇り → Overcast
  if (jmaCode >= 210 && jmaCode <= 212) return 3;  // 曇りのち晴れ
  if (jmaCode >= 300 && jmaCode <= 302) return 61; // 雨 → Rain
  if (jmaCode >= 313 && jmaCode <= 322) return 63; // 雨強い
  if (jmaCode >= 340 && jmaCode <= 350) return 80; // にわか雨
  if (jmaCode >= 400 && jmaCode <= 402) return 71; // 雪 → Snow
  if (jmaCode >= 413 && jmaCode <= 425) return 73; // 雪強い
  if (jmaCode >= 450 && jmaCode <= 452) return 85; // にわか雪

  return 3; // デフォルトは曇り
}

/**
 * 天気データを取得（気象庁API優先、Open-Meteoフォールバック）
 * @param resortIdOrName スキー場名またはID
 * @param coordinates オプション: 直接座標を指定（データベースから取得した座標など）
 * @param prefecture オプション: 都道府県名（座標がない場合のフォールバック）
 */
export async function fetchWeatherData(
  resortIdOrName: string,
  coordinates?: { latitude: number; longitude: number },
  prefecture?: string
): Promise<FetchedWeatherData | null> {
  try {
    // 座標が直接渡された場合はそれを使用、なければフォールバックを取得
    let lat: number, lon: number;
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      lat = coordinates.latitude;
      lon = coordinates.longitude;
      console.log(`[Weather API] Using database coordinates for ${resortIdOrName}: (${lat}, ${lon})`);
    } else {
      // データベースに座標がない場合はフォールバック
      const fallback = getFallbackCoordinates(prefecture);
      lat = fallback.lat;
      lon = fallback.lon;
      console.warn(`[Weather API] No database coordinates for ${resortIdOrName}, using fallback: (${lat}, ${lon})`);
    }

    console.log(`[Weather API] Fetching weather data for: ${resortIdOrName} at (${lat}, ${lon})`);

    // 優先度1: 気象庁アメダスAPIから観測データを取得
    console.log('[Weather API] Attempting JMA API first...');
    const jmaData = await fetchJMAData(lat, lon);

    // 優先度2: Open-Meteo APIから予測データを取得（フォールバック）
    console.log('[Weather API] Fetching Open-Meteo data...');
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('current', 'temperature_2m,wind_speed_10m,weather_code');
    url.searchParams.append('daily', 'snowfall_sum');
    url.searchParams.append('hourly', 'snow_depth');
    url.searchParams.append('timezone', 'Asia/Tokyo');
    url.searchParams.append('forecast_days', '1');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`[Open-Meteo] HTTP Error: ${response.status}`);
      return null;
    }

    const openMeteoData: any = await response.json();

    console.log(`[Open-Meteo] Raw API response for ${resortIdOrName}:`, JSON.stringify(openMeteoData.current, null, 2));

    // データマージ: 気象庁データを優先、なければOpen-Meteo
    let tempC: number | null = null;
    let windMs: number | null = null;
    let baseDepthCm: number | null = null;
    let newSnowCm: number = 0;
    let weatherCode: number = 3;

    // 気温: 気象庁 > Open-Meteo
    if (jmaData?.tempC !== null && jmaData?.tempC !== undefined) {
      tempC = Math.round(jmaData.tempC);
      console.log(`[Weather API] Using JMA temperature: ${tempC}°C`);
    } else if (openMeteoData.current?.temperature_2m !== null) {
      tempC = Math.round(openMeteoData.current.temperature_2m);
      console.log(`[Weather API] Using Open-Meteo temperature: ${tempC}°C`);
    }

    // 風速: 気象庁 > Open-Meteo
    if (jmaData?.windMs !== null && jmaData?.windMs !== undefined) {
      windMs = Math.round(jmaData.windMs * 10) / 10;
      console.log(`[Weather API] Using JMA wind speed: ${windMs} m/s`);
    } else {
      const windKmh = openMeteoData.current?.wind_speed_10m ?? null;
      windMs = windKmh !== null ? Math.round((windKmh / 3.6) * 10) / 10 : null;
      console.log(`[Weather API] Using Open-Meteo wind speed: ${windMs} m/s`);
    }

    // 積雪深度: 気象庁 > Open-Meteo
    if (jmaData?.snowDepthCm !== null && jmaData?.snowDepthCm !== undefined) {
      baseDepthCm = Math.round(jmaData.snowDepthCm);
      console.log(`[Weather API] Using JMA snow depth: ${baseDepthCm} cm`);
    } else {
      baseDepthCm = Math.round(openMeteoData.hourly?.snow_depth?.[0] ?? 0);
      console.log(`[Weather API] Using Open-Meteo snow depth: ${baseDepthCm} cm`);
    }

    // 24時間降雪量: 気象庁の降水量から推定、なければOpen-Meteo
    if (jmaData?.precipitation24h !== null && jmaData?.precipitation24h !== undefined && tempC !== null && tempC < 0) {
      // 気温が0度未満なら降水量≒降雪量と仮定（簡易推定）
      newSnowCm = Math.round(jmaData.precipitation24h * 10) / 10;
      console.log(`[Weather API] Estimated snow from JMA precipitation: ${newSnowCm} cm`);
    } else {
      newSnowCm = Math.round((openMeteoData.daily?.snowfall_sum?.[0] ?? 0) * 10) / 10;
      console.log(`[Weather API] Using Open-Meteo snowfall: ${newSnowCm} cm`);
    }

    // 天気コード: Open-Meteoのみ（気象庁アメダスには天気コードがない）
    weatherCode = openMeteoData.current?.weather_code ?? 3;
    console.log(`[Weather API] Using Open-Meteo weather code: ${weatherCode}`);

    console.log('[Weather API] Final merged data:', {
      temp: tempC,
      wind: windMs,
      code: weatherCode,
      newSnow: newSnowCm,
      baseDepth: baseDepthCm,
    });

    if (tempC === null || windMs === null) {
      console.error('[Weather API] Missing essential data');
      return null;
    }

    const visibility = categorizeVisibility(windMs, newSnowCm);
    const snowQuality = categorizeSnowQuality(tempC, newSnowCm);

    return {
      tempC,
      newSnowCm,
      baseDepthCm: baseDepthCm ?? 0,
      windMs,
      visibility,
      snowQuality,
      weatherCode,
    };
  } catch (error) {
    console.error('[Weather API] Error:', error);
    return null;
  }
}

/**
 * 7日間の天気予報を取得（Open-Meteo）
 * @param resortIdOrName スキー場名またはID
 * @param coordinates オプション: 直接座標を指定
 * @param prefecture オプション: 都道府県名（フォールバック用）
 */
export async function fetch7DayForecast(
  resortIdOrName: string,
  coordinates?: { latitude: number; longitude: number },
  prefecture?: string
): Promise<DailyForecast[]> {
  try {
    // 座標が直接渡された場合はそれを使用、なければフォールバックを取得
    let lat: number, lon: number;
    if (coordinates && coordinates.latitude && coordinates.longitude) {
      lat = coordinates.latitude;
      lon = coordinates.longitude;
    } else {
      const fallback = getFallbackCoordinates(prefecture);
      lat = fallback.lat;
      lon = fallback.lon;
    }

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('daily', 'temperature_2m_max,temperature_2m_min,snowfall_sum,weather_code');
    url.searchParams.append('timezone', 'Asia/Tokyo');
    url.searchParams.append('forecast_days', '7');

    const response = await fetch(url.toString());
    if (!response.ok) return generateDummyForecast();

    const data: any = await response.json();
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
    console.error('[Open-Meteo] Error fetching forecast:', error);
    return generateDummyForecast();
  }
}

/**
 * Open-Meteoから7日間の降雪データのみ取得
 */
async function fetch7DaySnowDataFromOpenMeteo(
  lat: number,
  lon: number
): Promise<number[]> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('daily', 'snowfall_sum');
    url.searchParams.append('timezone', 'Asia/Tokyo');
    url.searchParams.append('forecast_days', '7');

    const response = await fetch(url.toString());
    if (!response.ok) return Array(7).fill(0);

    const data: any = await response.json();
    return (data.daily?.snowfall_sum || []).map((v: number) => Math.round(v * 10) / 10);
  } catch (error) {
    return Array(7).fill(0);
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
