/**
 * MMKV Storage Utility for Synchronous Cache Hydration
 * Provides ultra-fast, synchronous storage for React Query cache
 */
import { createMMKV, MMKV } from 'react-native-mmkv';

// Storage keys
export const STORAGE_KEYS = {
  REACT_QUERY_CACHE: 'react-query-cache',
  VIDEO_FEED_DATA: 'video-feed-data',
  USER_PREFERENCES: 'user-preferences',
  LAST_SYNC_TIMESTAMP: 'last-sync-timestamp',
} as const;

// Initialize MMKV instance with encryption
export const mmkvStorage: MMKV = createMMKV({
  id: 'jevahapp-storage',
  encryptionKey: 'jevahapp-secure-storage-key-2024',
});

/**
 * Synchronously get cached React Query data
 * This is the key to instant-on: no async/await on startup
 */
export const getCachedQueryData = <T>(queryKey: string): T | null => {
  try {
    const data = mmkvStorage.getString(`${STORAGE_KEYS.REACT_QUERY_CACHE}:${queryKey}`);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

/**
 * Synchronously check if cache exists
 */
export const hasCachedQueryData = (queryKey: string): boolean => {
  return mmkvStorage.contains(`${STORAGE_KEYS.REACT_QUERY_CACHE}:${queryKey}`);
};

/**
 * Save React Query data to MMKV (async is fine for writes)
 */
export const setCachedQueryData = <T>(queryKey: string, data: T): void => {
  try {
    mmkvStorage.set(
      `${STORAGE_KEYS.REACT_QUERY_CACHE}:${queryKey}`,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.warn('Failed to cache query data:', error);
  }
};

/**
 * Get video feed data synchronously
 */
export const getVideoFeedCache = <T>(): T | null => {
  return getCachedQueryData<T>('video-feed');
};

/**
 * Save video feed data
 */
export const setVideoFeedCache = <T>(data: T): void => {
  setCachedQueryData('video-feed', data);
};

/**
 * Clear all cached data
 */
export const clearAllCache = (): void => {
  mmkvStorage.clearAll();
};

/**
 * Get cache timestamp
 */
export const getCacheTimestamp = (queryKey: string): number => {
  try {
    const data = mmkvStorage.getString(`${STORAGE_KEYS.REACT_QUERY_CACHE}:${queryKey}`);
    if (!data) return 0;
    const parsed = JSON.parse(data);
    return parsed.timestamp || 0;
  } catch {
    return 0;
  }
};

/**
 * Check if cache is stale (older than specified minutes)
 */
export const isCacheStale = (queryKey: string, maxAgeMinutes: number = 15): boolean => {
  const timestamp = getCacheTimestamp(queryKey);
  if (!timestamp) return true;
  const ageMs = Date.now() - timestamp;
  return ageMs > maxAgeMinutes * 60 * 1000;
};

export default mmkvStorage;
