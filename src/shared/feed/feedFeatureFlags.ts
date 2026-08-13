/**
 * Server For You / Music For You feature flags.
 * Ship events even if list source is still chronological — affinity warms first.
 */
export const USE_SERVER_FOR_YOU = true;
export const USE_MUSIC_FOR_YOU = true;
/**
 * Full affinity re-rank (can wait on impressions). Off — we still session-shuffle
 * For You items in `useAllContentTikTokFeedData` without jumping on pagination.
 */
export const CLIENT_RERANK = false;
/** Seeded shuffle of loaded items each visit / pull-to-refresh. */
export const SESSION_SHUFFLE = true;

export function shouldFetchServerForYou(
  contentType: string,
  useAuth: boolean
): boolean {
  if (!USE_SERVER_FOR_YOU || !useAuth) return false;
  const t = (contentType || "ALL").toUpperCase();
  // Server for-you is the Home "ALL" / video discovery surface
  return t === "ALL" || t === "VIDEO" || t === "VIDEOS";
}
