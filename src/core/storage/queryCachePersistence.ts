/**
 * React Query Cache Persistence with MMKV
 * Enables synchronous cache hydration for instant-on experience
 */
import { QueryClient, QueryKey } from '@tanstack/react-query';
import { mmkvStorage, STORAGE_KEYS } from './mmkvStorage';

// Cache key prefix for React Query
const QUERY_CACHE_PREFIX = `${STORAGE_KEYS.REACT_QUERY_CACHE}:`;

/**
 * Persist query data to MMKV storage
 */
export const persistQueryData = <T>(queryKey: QueryKey, data: T): void => {
  try {
    const keyString = Array.isArray(queryKey) ? queryKey.join('-') : String(queryKey);
    const cacheKey = `${QUERY_CACHE_PREFIX}${keyString}`;
    
    mmkvStorage.set(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('Failed to persist query data:', error);
  }
};

/**
 * Get persisted query data synchronously
 * Returns null if not found or expired
 */
export const getPersistedQueryData = <T>(
  queryKey: QueryKey,
  maxAgeMinutes: number = 30
): T | null => {
  try {
    const keyString = Array.isArray(queryKey) ? queryKey.join('-') : String(queryKey);
    const cacheKey = `${QUERY_CACHE_PREFIX}${keyString}`;
    
    const cached = mmkvStorage.getString(cacheKey);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const ageMs = Date.now() - (parsed.timestamp || 0);
    
    // Check if cache is stale
    if (ageMs > maxAgeMinutes * 60 * 1000) {
      return null;
    }
    
    return parsed.data as T;
  } catch {
    return null;
  }
};

/**
 * Hydrate QueryClient with persisted cache on startup
 * This runs synchronously for instant data availability
 */
export const hydrateQueryCache = (queryClient: QueryClient): void => {
  try {
    const allKeys = mmkvStorage.getAllKeys();
    const queryKeys = allKeys.filter(key => key.startsWith(QUERY_CACHE_PREFIX));
    
    for (const key of queryKeys) {
      try {
        const cached = mmkvStorage.getString(key);
        if (!cached) continue;
        
        const parsed = JSON.parse(cached);
        const queryKeyString = key.replace(QUERY_CACHE_PREFIX, '');
        const queryKey = queryKeyString.split('-');
        
        // Set the cached data in React Query
        queryClient.setQueryData(queryKey, parsed.data);
      } catch (innerError) {
        // Skip invalid cache entries
        console.warn('Failed to hydrate cache entry:', innerError);
      }
    }
  } catch (error) {
    console.warn('Failed to hydrate query cache:', error);
  }
};

/**
 * Clear all persisted query cache
 */
export const clearPersistedQueryCache = (): void => {
  try {
    const allKeys = mmkvStorage.getAllKeys();
    const queryKeys = allKeys.filter(key => key.startsWith(QUERY_CACHE_PREFIX));
    
    for (const key of queryKeys) {
      mmkvStorage.remove(key);
    }
  } catch (error) {
    console.warn('Failed to clear query cache:', error);
  }
};

/**
 * Setup automatic cache persistence
 * Call this after creating QueryClient to enable auto-persist
 * Returns unsubscribe function for cleanup
 */
export const setupCachePersistence = (queryClient: QueryClient): (() => void) => {
  // Subscribe to cache updates
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' || event.type === 'added') {
      const { query } = event;
      const data = query.state.data;
      
      // Only persist successful queries with data
      if (data && query.state.status === 'success') {
        persistQueryData(query.queryKey, data);
      }
    }
  });
  
  // Return unsubscribe function for cleanup
  return unsubscribe;
};

/**
 * Check if we have any cached video feed data
 */
export const hasVideoFeedCache = (): boolean => {
  return mmkvStorage.contains(`${QUERY_CACHE_PREFIX}video-feed`);
};

/**
 * Get the timestamp of the last successful cache
 */
export const getLastCacheTimestamp = (): number => {
  try {
    const timestamp = mmkvStorage.getNumber(STORAGE_KEYS.LAST_SYNC_TIMESTAMP);
    return timestamp || 0;
  } catch {
    return 0;
  }
};

/**
 * Update the last sync timestamp
 */
export const updateLastCacheTimestamp = (): void => {
  mmkvStorage.set(STORAGE_KEYS.LAST_SYNC_TIMESTAMP, Date.now());
};
