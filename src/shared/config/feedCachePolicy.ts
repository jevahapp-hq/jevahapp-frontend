/**
 * Shared All Content feed cache policy.
 * Principle: aggressive disk / MMKV / RQ metadata; conservative decoded RAM on Lite.
 */

import {
  getLiteMaxInMemoryFeedPages,
  isLiteProfileActive,
} from "../lite/liteProfile";

export const FEED_PAGE_SIZE = 12;
export const FEED_PAGE_SIZE_LITE = 8;
/** Baseline stale (full profile / legacy callers). Prefer getFeedStaleMs(). */
export const FEED_STALE_MS = 2 * 60 * 60 * 1000; // 2h
export const FEED_GC_MS = 24 * 60 * 60 * 1000; // 24h
/** Lite keeps first-page disk seeds hotter for cold start. */
export const FEED_STALE_MS_LITE = 24 * 60 * 60 * 1000; // 24h fresh
/** Paint from disk even after stale (stale-while-revalidate). */
export const FEED_DISK_MAX_MS_LITE = 7 * 24 * 60 * 60 * 1000; // 7d
/** Lite RQ heap: shorter GC + maxPages; disk still long via MMKV. */
export const FEED_GC_MS_LITE = 4 * 60 * 60 * 1000; // 4h
/** How many feed items to keep on disk (Lite ≈ 3 pages of 8). */
export const FEED_DISK_ITEMS_LITE = 24;
export const FEED_DISK_ITEMS_FULL = 12;

export function getFeedPageSize(): number {
  return isLiteProfileActive() ? FEED_PAGE_SIZE_LITE : FEED_PAGE_SIZE;
}

/** Disk + RQ staleTime — longer on Lite so offline/cold start stays warm. */
export function getFeedStaleMs(): number {
  return isLiteProfileActive() ? FEED_STALE_MS_LITE : FEED_STALE_MS;
}

/** React Query in-memory retention (not disk). Shorter on Lite. */
export function getFeedGcMs(): number {
  return isLiteProfileActive() ? FEED_GC_MS_LITE : FEED_GC_MS;
}

/** Cap infinite-query pages kept in RAM (TanStack maxPages). */
export function getFeedMaxPages(): number {
  return getLiteMaxInMemoryFeedPages();
}

export function getFeedDiskItemCap(): number {
  return isLiteProfileActive() ? FEED_DISK_ITEMS_LITE : FEED_DISK_ITEMS_FULL;
}

/** Full profile: still paint stale disk feed for a week (SWR in background). */
export const FEED_DISK_MAX_MS_FULL = 7 * 24 * 60 * 60 * 1000;

/** How long we will still *paint* from MMKV (may be stale). */
export function getFeedDiskMaxMs(): number {
  return isLiteProfileActive() ? FEED_DISK_MAX_MS_LITE : FEED_DISK_MAX_MS_FULL;
}

/** React Query key for infinite all-content feed. */
export function allContentQueryKey(
  contentType: string,
  limit: number,
  useAuth: boolean,
  forYou = false
) {
  const lite = isLiteProfileActive() ? "lite" : "full";
  return [
    "all-content",
    contentType,
    limit,
    useAuth,
    forYou ? "fy" : "chrono",
    lite,
  ] as const;
}

/**
 * Zustand first-page key. Auth and public are separate so login does not
 * poison (or miss) the wrong seed.
 */
export function feedZustandFirstPageKey(
  contentType: string,
  useAuth: boolean
): string {
  const type = contentType || "ALL";
  const profile = isLiteProfileActive() ? "lite" : "full";
  return `${type}:first:${useAuth ? "auth" : "public"}:${profile}`;
}

/** Legacy key still written by older code paths — read as fallback. */
export const LEGACY_ALL_FIRST_KEY = "ALL:first";
