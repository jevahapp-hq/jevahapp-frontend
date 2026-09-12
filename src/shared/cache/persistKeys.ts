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
/** Current feed first-page disk prefix (must match feedMmkv). */
export const FEED_PAGE_V3_PREFIX = "feed-page-v3:";
export const RQ_FEED_SEED_V3_KEY = "rq-all-content-seed-v3";

/** Explicit keys to warm into the Expo Go memory fallback. */
export const ASYNC_FALLBACK_JSON_CACHE_KEYS = [
  CACHE_MANAGER_DISK_KEY,
  SIGNED_URL_DISK_KEY,
  RQ_PERSIST_DISK_KEY,
  CF_API_CACHE_DISK_KEY,
  CF_SONGS_CACHE_KEY,
] as const;

const BOOT_FEED_TYPES = ["ALL"] as const;
const BOOT_AUTH_SIDES = ["public", "auth"] as const;
const BOOT_PROFILES = ["lite", "full"] as const;

/**
 * First-page feed keys Expo Go must copy from AsyncStorage before Home paints.
 * Older `feed-page:` keys stay listed so a stale client still seeds.
 */
export function bootFeedFallbackKeys(): string[] {
  const keys: string[] = [
    RQ_FEED_SEED_V3_KEY,
    `${RQ_FEED_SEED_V3_KEY}:lite`,
    `${RQ_FEED_SEED_V3_KEY}:full`,
    "rq-all-content-seed",
    "rq-all-content-seed:lite",
    "rq-all-content-seed:full",
  ];
  for (const contentType of BOOT_FEED_TYPES) {
    for (const auth of BOOT_AUTH_SIDES) {
      keys.push(`feed-page:${contentType}:${auth}`);
      keys.push(`${FEED_PAGE_V3_PREFIX}${contentType}:${auth}`);
      for (const profile of BOOT_PROFILES) {
        keys.push(`feed-page:${contentType}:${auth}:${profile}`);
        keys.push(
          `${FEED_PAGE_V3_PREFIX}${contentType}:${auth}:${profile}`
        );
      }
    }
  }
  return keys;
}

/** Prefix scan after the explicit first-page keys (music, bible, persist). */
export const BOOT_FALLBACK_PREFIXES = [
  FEED_PAGE_V3_PREFIX,
  MUSIC_CATALOG_PREFIX,
  RQ_PERSIST_DISK_KEY,
  "bible_",
] as const;

/** AsyncStorage keys copied into memory before Home's first query. */
export function bootCacheExplicitKeys(): string[] {
  return [
    "author-profiles-v1",
    SESSION_CACHE_USER_KEY,
    "content-cache-store",
    "video-feed-data",
    ...ASYNC_FALLBACK_JSON_CACHE_KEYS,
    ...bootFeedFallbackKeys(),
  ];
}
