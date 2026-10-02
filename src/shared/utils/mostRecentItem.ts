import type { MediaItem } from "../types";

export function mediaItemId(
  item: { _id?: string; id?: string } | null | undefined
): string {
  return String(item?._id || item?.id || "");
}

/** Real publish time. Missing or unreadable dates do not compete. */
export function mediaCreatedAtMs(
  item: { createdAt?: string | null } | null | undefined
): number | null {
  const ts = Date.parse(String(item?.createdAt || ""));
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return ts;
}

/**
 * Newest item by createdAt.
 * A previous pick stays when nothing is actually newer, so a reshuffled
 * feed cannot swap the Most Recent hero for a random row.
 */
export function resolveMostRecentItem(
  items: MediaItem[] | null | undefined,
  previousId: string | null
): MediaItem | null {
  const list = Array.isArray(items) ? items : [];
  let best: MediaItem | null = null;
  let bestAt = -Infinity;

  for (const item of list) {
    const at = mediaCreatedAtMs(item);
    if (at == null) continue;
    const id = mediaItemId(item);
    const sameTimePreferred = at === bestAt && !!previousId && id === previousId;
    if (at > bestAt || sameTimePreferred) {
      best = item;
      bestAt = at;
    }
  }

  if (best) return best;

  if (previousId) {
    const previous = list.find((item) => mediaItemId(item) === previousId);
    if (previous) return previous;
  }

  return list[0] ?? null;
}
