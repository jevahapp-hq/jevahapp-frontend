/**
 * Core Storage Module Exports
 */
export {
  mmkvStorage,
  STORAGE_KEYS,
  getCachedQueryData,
  hasCachedQueryData,
  setCachedQueryData,
  getVideoFeedCache,
  setVideoFeedCache,
  clearAllCache,
  getCacheTimestamp,
  isCacheStale,
} from './mmkvStorage';

export {
  persistQueryData,
  getPersistedQueryData,
  hydrateQueryCache,
  clearPersistedQueryCache,
  setupCachePersistence,
  hasVideoFeedCache,
  getLastCacheTimestamp,
  updateLastCacheTimestamp,
} from './queryCachePersistence';
