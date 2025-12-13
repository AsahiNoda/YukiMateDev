import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * キャッシュストレージのユーティリティ
 * オフライン時のデータ永続化とキャッシュ管理を提供
 */

const CACHE_PREFIX = '@yukimate_cache_';
const CACHE_EXPIRY_PREFIX = '@yukimate_expiry_';

export interface CacheOptions {
  /** キャッシュの有効期限（ミリ秒） */
  expiryMs?: number;
  /** キャッシュが存在しても強制的に更新するか */
  forceRefresh?: boolean;
}

/**
 * データをキャッシュに保存
 */
export async function setCache<T>(key: string, data: T, expiryMs?: number): Promise<void> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const value = JSON.stringify(data);

    await AsyncStorage.setItem(cacheKey, value);

    // 有効期限が指定されている場合、有効期限も保存
    if (expiryMs) {
      const expiryTime = Date.now() + expiryMs;
      const expiryKey = CACHE_EXPIRY_PREFIX + key;
      await AsyncStorage.setItem(expiryKey, expiryTime.toString());
    }

    console.log(`✅ Cache saved: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to save cache: ${key}`, error);
  }
}

/**
 * キャッシュからデータを取得
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const expiryKey = CACHE_EXPIRY_PREFIX + key;

    // 有効期限をチェック
    const expiryTimeStr = await AsyncStorage.getItem(expiryKey);
    if (expiryTimeStr) {
      const expiryTime = parseInt(expiryTimeStr, 10);
      const now = Date.now();

      // 有効期限が切れている場合、キャッシュを削除
      if (now > expiryTime) {
        console.log(`⚠️  Cache expired: ${key}`);
        await removeCache(key);
        return null;
      }
    }

    // キャッシュデータを取得
    const value = await AsyncStorage.getItem(cacheKey);
    if (!value) {
      console.log(`⚠️  Cache not found: ${key}`);
      return null;
    }

    const data = JSON.parse(value) as T;
    console.log(`✅ Cache retrieved: ${key}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to retrieve cache: ${key}`, error);
    return null;
  }
}

/**
 * キャッシュを削除
 */
export async function removeCache(key: string): Promise<void> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const expiryKey = CACHE_EXPIRY_PREFIX + key;

    await AsyncStorage.multiRemove([cacheKey, expiryKey]);
    console.log(`✅ Cache removed: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to remove cache: ${key}`, error);
  }
}

/**
 * すべてのキャッシュをクリア
 */
export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(
      (key) => key.startsWith(CACHE_PREFIX) || key.startsWith(CACHE_EXPIRY_PREFIX)
    );

    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`✅ All cache cleared (${cacheKeys.length} items)`);
    }
  } catch (error) {
    console.error('❌ Failed to clear all cache', error);
  }
}

/**
 * キャッシュのサイズを取得（概算）
 */
export async function getCacheSize(): Promise<number> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((key) => key.startsWith(CACHE_PREFIX));

    let totalSize = 0;
    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        // 文字列のバイトサイズを計算（概算）
        totalSize += new Blob([value]).size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('❌ Failed to calculate cache size', error);
    return 0;
  }
}

/**
 * キャッシュ統計情報を取得
 */
export async function getCacheStats(): Promise<{
  count: number;
  sizeMB: number;
  keys: string[];
}> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((key) => key.startsWith(CACHE_PREFIX));

    const size = await getCacheSize();
    const sizeMB = size / (1024 * 1024);

    const keys = cacheKeys.map((key) => key.replace(CACHE_PREFIX, ''));

    return {
      count: cacheKeys.length,
      sizeMB: parseFloat(sizeMB.toFixed(2)),
      keys,
    };
  } catch (error) {
    console.error('❌ Failed to get cache stats', error);
    return {
      count: 0,
      sizeMB: 0,
      keys: [],
    };
  }
}

/**
 * データフェッチとキャッシュのヘルパー関数
 * キャッシュがあればそれを返し、なければfetchFnを実行してキャッシュに保存
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { expiryMs = 1000 * 60 * 5, forceRefresh = false } = options; // デフォルト5分

  // 強制更新でない場合、キャッシュをチェック
  if (!forceRefresh) {
    const cachedData = await getCache<T>(key);
    if (cachedData !== null) {
      console.log(`📦 Using cached data: ${key}`);
      return cachedData;
    }
  }

  // キャッシュがない、または強制更新の場合、データをフェッチ
  console.log(`🔄 Fetching fresh data: ${key}`);
  const freshData = await fetchFn();

  // フェッチしたデータをキャッシュに保存
  await setCache(key, freshData, expiryMs);

  return freshData;
}

export default {
  setCache,
  getCache,
  removeCache,
  clearAllCache,
  getCacheSize,
  getCacheStats,
  fetchWithCache,
};
