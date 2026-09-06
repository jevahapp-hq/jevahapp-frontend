/**
 * MMKV keys for cheap JSON that must survive process death.
 * Feed first-page uses feedMmkv.ts separately (hand-hydrated into RQ).
 */
export const CACHE_MANAGER_DISK_KEY = "cache-manager-v1";
export const SIGNED_URL_DISK_KEY = "signed-url-cache-v1";
export const RQ_PERSIST_DISK_KEY = "rq-persist-v1";
export const SESSION_CACHE_USER_KEY = "session-cache-user-id";
export const CF_API_CACHE_DISK_KEY = "cf-api-cache-v1";
export const CF_SONGS_CACHE_KEY = "copyrightFreeSongsCache_v1";
export const MUSIC_CATALOG_PREFIX = "music-catalog-v1:";

/** Explicit keys to warm into the Expo Go memory fallback. */
export const ASYNC_FALLBACK_JSON_CACHE_KEYS = [
  CACHE_MANAGER_DISK_KEY,
  SIGNED_URL_DISK_KEY,
  RQ_PERSIST_DISK_KEY,
  CF_API_CACHE_DISK_KEY,
  CF_SONGS_CACHE_KEY,
] as const;
