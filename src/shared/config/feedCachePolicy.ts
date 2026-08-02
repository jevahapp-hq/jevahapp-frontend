/** Shared All Content feed cache policy — keep RQ + Zustand TTLs in lockstep. */

export const FEED_PAGE_SIZE = 12;
export const FEED_STALE_MS = 2 * 60 * 60 * 1000; // 2h
export const FEED_GC_MS = 24 * 60 * 60 * 1000; // 24h

/** React Query key for infinite all-content feed. */
export function allContentQueryKey(
  contentType: string,
  limit: number,
  useAuth: boolean
) {
  return ["all-content", contentType, limit, useAuth] as const;
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
  return `${type}:first:${useAuth ? "auth" : "public"}`;
}

/** Legacy key still written by older code paths — read as fallback. */
export const LEGACY_ALL_FIRST_KEY = "ALL:first";
