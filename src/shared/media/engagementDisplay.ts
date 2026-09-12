/**
 * Shared engagement number / identity helpers for feed cards and Reels.
 */

export function commentCountFromMetadata(item: {
  commentCount?: number | null;
  comments?: number | null | unknown[];
  comment?: number | null;
} | null | undefined): number {
  if (Array.isArray(item?.comments)) return item.comments.length;
  const raw = item?.commentCount ?? item?.comments ?? item?.comment ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * After the comments list loads, the store total is truth (including 0).
 * Before that, never let a stale feed payload hide a live increment.
 */
export function resolveCommentDisplayCount(options: {
  storeComments?: number | null;
  commentsConfirmed?: boolean;
  fallback?: number | null;
}): number {
  const storeComments = Number(options.storeComments ?? 0);
  const fallback = Number(options.fallback ?? 0);
  const store = Number.isFinite(storeComments) ? Math.max(0, storeComments) : 0;
  const feed = Number.isFinite(fallback) ? Math.max(0, fallback) : 0;
  if (options.commentsConfirmed) return store;
  return Math.max(store, feed);
}

export function libraryItemMatchesId(
  item: { id?: string; originalKey?: string } | null | undefined,
  itemId: string
): boolean {
  if (!itemId) return false;
  return item?.id === itemId || item?.originalKey === itemId;
}
