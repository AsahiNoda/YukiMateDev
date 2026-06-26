import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setCache,
  getCache,
  removeCache,
  clearAllCache,
  getCacheStats,
  fetchWithCache,
} from '../cache';

// AsyncStorageのモックをクリア
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('Cache Utilities', () => {
  describe('setCache', () => {
    it('should save data to cache', async () => {
      const testData = { id: 1, name: 'Test Event' };
      await setCache('test_key', testData);

      const cachedValue = await AsyncStorage.getItem('@slopelink_cache_test_key');
      expect(cachedValue).toBe(JSON.stringify(testData));
    });

    it('should save expiry time when provided', async () => {
      const testData = { id: 1, name: 'Test Event' };
      const expiryMs = 5000;

      await setCache('test_key', testData, expiryMs);

      const expiryValue = await AsyncStorage.getItem('@slopelink_expiry_test_key');
      expect(expiryValue).toBeTruthy();

      const expiryTime = parseInt(expiryValue!, 10);
      const now = Date.now();
      expect(expiryTime).toBeGreaterThan(now);
      expect(expiryTime).toBeLessThanOrEqual(now + expiryMs + 100); // 100ms tolerance
    });
  });

  describe('getCache', () => {
    it('should retrieve data from cache', async () => {
      const testData = { id: 1, name: 'Test Event' };
      await setCache('test_key', testData);

      const retrievedData = await getCache<typeof testData>('test_key');
      expect(retrievedData).toEqual(testData);
    });

    it('should return null for non-existent cache', async () => {
      const retrievedData = await getCache('non_existent_key');
      expect(retrievedData).toBeNull();
    });

    it('should return null and remove expired cache', async () => {
      const testData = { id: 1, name: 'Test Event' };
      const expiryMs = -1000; // Already expired

      // Manually set expired cache
      await AsyncStorage.setItem('@slopelink_cache_test_key', JSON.stringify(testData));
      await AsyncStorage.setItem('@slopelink_expiry_test_key', (Date.now() + expiryMs).toString());

      const retrievedData = await getCache('test_key');
      expect(retrievedData).toBeNull();

      // Verify cache was removed
      const cachedValue = await AsyncStorage.getItem('@slopelink_cache_test_key');
      expect(cachedValue).toBeNull();
    });

    it('should return data if not expired', async () => {
      const testData = { id: 1, name: 'Test Event' };
      const expiryMs = 5000; // 5 seconds from now

      await setCache('test_key', testData, expiryMs);

      const retrievedData = await getCache<typeof testData>('test_key');
      expect(retrievedData).toEqual(testData);
    });
  });

  describe('removeCache', () => {
    it('should remove cache and expiry', async () => {
      const testData = { id: 1, name: 'Test Event' };
      await setCache('test_key', testData, 5000);

      await removeCache('test_key');

      const cachedValue = await AsyncStorage.getItem('@slopelink_cache_test_key');
      const expiryValue = await AsyncStorage.getItem('@slopelink_expiry_test_key');

      expect(cachedValue).toBeNull();
      expect(expiryValue).toBeNull();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache entries', async () => {
      await setCache('key1', { data: 'test1' });
      await setCache('key2', { data: 'test2' });
      await setCache('key3', { data: 'test3' });

      await clearAllCache();

      const key1 = await AsyncStorage.getItem('@slopelink_cache_key1');
      const key2 = await AsyncStorage.getItem('@slopelink_cache_key2');
      const key3 = await AsyncStorage.getItem('@slopelink_cache_key3');

      expect(key1).toBeNull();
      expect(key2).toBeNull();
      expect(key3).toBeNull();
    });

    it('should not clear non-cache entries', async () => {
      // Add a non-cache entry
      await AsyncStorage.setItem('other_key', 'other_value');

      await setCache('cache_key', { data: 'test' });
      await clearAllCache();

      const otherValue = await AsyncStorage.getItem('other_key');
      expect(otherValue).toBe('other_value');
    });
  });

  describe('getCacheStats', () => {
    it('should return correct cache statistics', async () => {
      await setCache('key1', { data: 'test1' });
      await setCache('key2', { data: 'test2' });

      const stats = await getCacheStats();

      expect(stats.count).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
      expect(stats.sizeMB).toBeGreaterThan(0);
    });

    it('should return zero stats when no cache exists', async () => {
      const stats = await getCacheStats();

      expect(stats.count).toBe(0);
      expect(stats.keys).toEqual([]);
      expect(stats.sizeMB).toBe(0);
    });
  });

  describe('fetchWithCache', () => {
    it('should fetch fresh data when cache is empty', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ id: 1, name: 'Fresh Data' });

      const data = await fetchWithCache('test_key', fetchFn);

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(data).toEqual({ id: 1, name: 'Fresh Data' });

      // Verify data was cached
      const cachedData = await getCache('test_key');
      expect(cachedData).toEqual({ id: 1, name: 'Fresh Data' });
    });

    it('should return cached data when available', async () => {
      const cachedData = { id: 1, name: 'Cached Data' };
      await setCache('test_key', cachedData, 5000);

      const fetchFn = jest.fn().mockResolvedValue({ id: 2, name: 'Fresh Data' });

      const data = await fetchWithCache('test_key', fetchFn);

      expect(fetchFn).not.toHaveBeenCalled();
      expect(data).toEqual(cachedData);
    });

    it('should force refresh when forceRefresh is true', async () => {
      const cachedData = { id: 1, name: 'Cached Data' };
      await setCache('test_key', cachedData, 5000);

      const fetchFn = jest.fn().mockResolvedValue({ id: 2, name: 'Fresh Data' });

      const data = await fetchWithCache('test_key', fetchFn, { forceRefresh: true });

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(data).toEqual({ id: 2, name: 'Fresh Data' });
    });

    it('should use custom expiry time', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ id: 1, name: 'Fresh Data' });

      const customExpiryMs = 10000; // 10 seconds
      await fetchWithCache('test_key', fetchFn, { expiryMs: customExpiryMs });

      // Verify expiry was set
      const expiryValue = await AsyncStorage.getItem('@slopelink_expiry_test_key');
      expect(expiryValue).toBeTruthy();

      const expiryTime = parseInt(expiryValue!, 10);
      const now = Date.now();
      expect(expiryTime).toBeGreaterThan(now + 9000); // Should be at least 9 seconds from now
    });
  });
});
