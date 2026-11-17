/**
 * Weather API Service
 * Using Open-Meteo API for reliable weather data
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
  /** 観測（取得）時刻。Open-Meteo の current.time（現地時刻 "YYYY-MM-DDTHH:mm"） */
  observedAt?: string | null;
}

export interface DailyForecast {
  date: string;
  dayOfWeek: string;
  tempHigh: number;
  tempLow: number;
  snowfallCm: number;
  condition: string;
  /** WMO の天気コード（アイコン用） */
  weatherCode?: number | null;
}

/**
 * 都道府県ごとのデフォルト座標（主要スキーエリアの中心）
 * 日本語の県名と英語の県名の両方をサポート
 */
const PREFECTURE_DEFAULTS: Record<string, { lat: number; lon: number; areaCode: string; subAreaCode: string }> = {
  '北海道': { lat: 42.9, lon: 141.7, areaCode: '016000', subAreaCode: '016000' }, // ニセコ・札幌エリア
  'Hokkaido': { lat: 42.9, lon: 141.7, areaCode: '016000', subAreaCode: '016000' },
  '青森県': { lat: 40.6, lon: 140.5, areaCode: '020000', subAreaCode: '020010' },
  'Aomori': { lat: 40.6, lon: 140.5, areaCode: '020000', subAreaCode: '020010' },
  '岩手県': { lat: 39.7, lon: 140.9, areaCode: '030000', subAreaCode: '030010' },
  'Iwate': { lat: 39.7, lon: 140.9, areaCode: '030000', subAreaCode: '030010' },
  '宮城県': { lat: 38.3, lon: 140.6, areaCode: '040000', subAreaCode: '040010' },
  'Miyagi': { lat: 38.3, lon: 140.6, areaCode: '040000', subAreaCode: '040010' },
  '秋田県': { lat: 39.7, lon: 140.1, areaCode: '050000', subAreaCode: '050010' },
  'Akita': { lat: 39.7, lon: 140.1, areaCode: '050000', subAreaCode: '050010' },
  '山形県': { lat: 38.3, lon: 140.1, areaCode: '060000', subAreaCode: '060010' },
  'Yamagata': { lat: 38.3, lon: 140.1, areaCode: '060000', subAreaCode: '060010' },
  '福島県': { lat: 37.6, lon: 139.9, areaCode: '070000', subAreaCode: '070010' },
  'Fukushima': { lat: 37.6, lon: 139.9, areaCode: '070000', subAreaCode: '070010' },
  '群馬県': { lat: 36.7, lon: 138.8, areaCode: '100000', subAreaCode: '100020' }, // 水上・尾瀬エリア
  'Gunma': { lat: 36.7, lon: 138.8, areaCode: '100000', subAreaCode: '100020' },
  '栃木県': { lat: 36.9, lon: 139.7, areaCode: '090000', subAreaCode: '090010' },
  'Tochigi': { lat: 36.9, lon: 139.7, areaCode: '090000', subAreaCode: '090010' },
  '新潟県': { lat: 37.0, lon: 138.7, areaCode: '150000', subAreaCode: '150020' }, // 湯沢エリア
  'Niigata': { lat: 37.0, lon: 138.7, areaCode: '150000', subAreaCode: '150020' },
  '長野県': { lat: 36.7, lon: 137.85, areaCode: '200000', subAreaCode: '200010' }, // 白馬エリア
  'Nagano': { lat: 36.7, lon: 137.85, areaCode: '200000', subAreaCode: '200010' },
  '富山県': { lat: 36.7, lon: 137.2, areaCode: '160000', subAreaCode: '160010' },
  'Toyama': { lat: 36.7, lon: 137.2, areaCode: '160000', subAreaCode: '160010' },
  '岐阜県': { lat: 36.1, lon: 137.2, areaCode: '210000', subAreaCode: '210010' },
  'Gifu': { lat: 36.1, lon: 137.2, areaCode: '210000', subAreaCode: '210010' },
  '山梨県': { lat: 35.7, lon: 138.6, areaCode: '190000', subAreaCode: '190010' },
  'Yamanashi': { lat: 35.7, lon: 138.6, areaCode: '190000', subAreaCode: '190010' },
  '兵庫県': { lat: 35.4, lon: 134.5, areaCode: '280000', subAreaCode: '280010' },
  'Hyogo': { lat: 35.4, lon: 134.5, areaCode: '280000', subAreaCode: '280010' },
  '広島県': { lat: 35.0, lon: 132.8, areaCode: '340000', subAreaCode: '340010' },
  'Hiroshima': { lat: 35.0, lon: 132.8, areaCode: '340000', subAreaCode: '340010' },
  '島根県': { lat: 35.3, lon: 132.7, areaCode: '320000', subAreaCode: '320010' },
  'Shimane': { lat: 35.3, lon: 132.7, areaCode: '320000', subAreaCode: '320010' },
  '鳥取県': { lat: 35.4, lon: 133.3, areaCode: '310000', subAreaCode: '310010' },
  'Tottori': { lat: 35.4, lon: 133.3, areaCode: '310000', subAreaCode: '310010' },
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
 * 天気APIレスポンスのメモリキャッシュ（15分）
 * ホーム・Snowfeed・週間予報から同じ地点のデータを何度も取得するため、URL単位で共有する。
 * 取得中のリクエストも共有するので、同時に呼ばれても通信は1回になる。
 */
const WEATHER_CACHE_TTL_MS = 1000 * 60 * 15;
const weatherResponseCache = new Map<string, { expiresAt: number; promise: Promise<any | null> }>();

async function fetchJsonCached(url: string): Promise<any | null> {
  const now = Date.now();
  const hit = weatherResponseCache.get(url);
  if (hit && hit.expiresAt > now) {
    return hit.promise;
  }

  const promise = fetch(url).then(async (response) => {
    if (!response.ok) {
      console.warn(`[Weather API] HTTP Error: ${response.status}`);
      return null;
    }
    return response.json();
  });

  weatherResponseCache.set(url, { expiresAt: now + WEATHER_CACHE_TTL_MS, promise });
  // 失敗した結果はキャッシュしない
  promise
    .then((data) => {
      if (data === null) weatherResponseCache.delete(url);
    })
    .catch(() => weatherResponseCache.delete(url));

  return promise;
}

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
 * Open-Meteo APIから天気データを取得
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

    // Open-Meteo APIから全データ取得
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('current', 'temperature_2m,wind_speed_10m,weather_code');
    url.searchParams.append('daily', 'snowfall_sum');
    url.searchParams.append('hourly', 'snow_depth');
    url.searchParams.append('timezone', 'Asia/Tokyo');
    url.searchParams.append('forecast_days', '1');

    const data: any = await fetchJsonCached(url.toString());
    if (!data) {
      return null;
    }

    console.log(`[Weather API] Raw API response for ${resortIdOrName}:`, JSON.stringify(data.current, null, 2));

    // 現在気温
    const tempC = data.current?.temperature_2m ?? null;
    const tempCRounded = tempC !== null ? Math.round(tempC) : null;

    // 風速 (km/h → m/s)
    const windKmh = data.current?.wind_speed_10m ?? null;
    const windMs = windKmh !== null ? Math.round((windKmh / 3.6) * 10) / 10 : null;

    // 天気コード
    const weatherCode = data.current?.weather_code ?? 3;

    // 24時間降雪量
    const newSnowCm = data.daily?.snowfall_sum?.[0] ?? 0;
    const newSnowCmRounded = Math.round(newSnowCm * 10) / 10;

    // 積雪深度
    const baseDepthCm = data.hourly?.snow_depth?.[0] ?? 0;
    const baseDepthCmRounded = Math.round(baseDepthCm);

    console.log('[Weather API] Data:', {
      temp: tempCRounded,
      wind: windMs,
      code: weatherCode,
      newSnow: newSnowCmRounded,
      baseDepth: baseDepthCmRounded,
    });

    if (tempCRounded === null || windMs === null) {
      console.error('[Weather API] Missing essential data');
      return null;
    }

    const visibility = categorizeVisibility(windMs, newSnowCmRounded);
    const snowQuality = categorizeSnowQuality(tempCRounded, newSnowCmRounded);

    return {
      tempC: tempCRounded,
      newSnowCm: newSnowCmRounded,
      baseDepthCm: baseDepthCmRounded,
      windMs,
      visibility,
      snowQuality,
      weatherCode,
      observedAt: data.current?.time ?? null,
    };
  } catch (error) {
    // 通信できないとき（オフライン・API の障害など）は警告だけにして、画面側で「取得できません」を出す
    console.warn('[Weather API] Error:', error);
    return null;
  }
}

function resolveCoordinates(
  coordinates?: { latitude: number; longitude: number } | null,
  prefecture?: string
): { lat: number; lon: number } {
  if (coordinates && coordinates.latitude && coordinates.longitude) {
    return { lat: coordinates.latitude, lon: coordinates.longitude };
  }
  return getFallbackCoordinates(prefecture);
}

/**
 * 時間ごとの予報（前日0時〜明日24時）。ホームの天気カード（案D）の「今日の時間ごと」と
 * パウダーアラートに使う。取得できなければ null（ダミーは返さない）。
 */
export async function fetchHourlyWeather(
  coordinates?: { latitude: number; longitude: number } | null,
  prefecture?: string
): Promise<import('@/utils/hourlyWeather').HourlyWeather | null> {
  try {
    const { lat, lon } = resolveCoordinates(coordinates, prefecture);
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('hourly', 'temperature_2m,snowfall,weather_code');
    url.searchParams.append('timezone', 'Asia/Tokyo');
    url.searchParams.append('past_days', '1');
    url.searchParams.append('forecast_days', '2');

    const data: any = await fetchJsonCached(url.toString());
    if (!data?.hourly?.time) return null;
    return {
      time: data.hourly.time,
      temperature: data.hourly.temperature_2m ?? [],
      snowfall: data.hourly.snowfall ?? [],
      weatherCode: data.hourly.weather_code ?? [],
    };
  } catch (error) {
    console.warn('[Open-Meteo] Error fetching hourly forecast:', error);
    return null;
  }
}

export interface DailySnowfall {
  /** "YYYY-MM-DD"（現地日付） */
  date: string;
  snowfallCm: number;
}

/**
 * 今日から7日分の日別降雪量（ホームの「週間の雪予報」）。取得できなければ null（ダミーは返さない）。
 */
export async function fetchDailySnowfall(
  coordinates?: { latitude: number; longitude: number } | null,
  prefecture?: string
): Promise<DailySnowfall[] | null> {
  try {
    const { lat, lon } = resolveCoordinates(coordinates, prefecture);
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('daily', 'snowfall_sum');
    url.searchParams.append('timezone', 'Asia/Tokyo');
    url.searchParams.append('forecast_days', '7');

    const data: any = await fetchJsonCached(url.toString());
    if (!data?.daily?.time) return null;
    return (data.daily.time as string[]).map((date, i) => ({
      date,
      snowfallCm: Math.round((data.daily.snowfall_sum?.[i] || 0) * 10) / 10,
    }));
  } catch (error) {
    console.warn('[Open-Meteo] Error fetching daily snowfall:', error);
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

    const data: any = await fetchJsonCached(url.toString());
    // 取得できないときはダミーの予報を出さず、空にする（画面側で「取得できませんでした」を出す）
    if (!data?.daily?.time) return [];
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
        weatherCode: data.daily.weather_code?.[i] ?? null,
      });
    }

    return forecast;
  } catch (error) {
    console.warn('[Open-Meteo] Error fetching forecast:', error);
    return [];
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

    const data: any = await fetchJsonCached(url.toString());
    if (!data) return Array(7).fill(0);
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
