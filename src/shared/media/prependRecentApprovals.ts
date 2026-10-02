import type { MediaItem } from "../types";
import { normalizeModerationToken } from "./moderationStatus.ts";

const RECENT_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PREPEND = 8;

function itemId(item: { _id?: string; id?: string }): string {
  return String(item?._id || item?.id || "").trim();
}

function isHiddenFromPublic(item: MediaItem): boolean {
  const status = normalizeModerationToken(item.moderationStatus);
  return (
    status === "under_review" ||
    status === "pending" ||
    status === "in_review" ||
    status === "rejected"
  );
}

/**
 * For You is a ranked subset and often misses a video the moment an admin
 * approves it. Prepend recent public-catalog rows that the ranked page
 * does not already contain.
 */
export function prependRecentApprovals<T extends MediaItem>(
  ranked: T[],
  catalog: T[],
  now = Date.now()
): T[] {
  const base = Array.isArray(ranked) ? ranked : [];
  const extraSource = Array.isArray(catalog) ? catalog : [];
  const seen = new Set(base.map((item) => itemId(item)).filter(Boolean));
  const fresh = extraSource
    .filter((item) => {
      const id = itemId(item);
      if (!id || seen.has(id)) return false;
      if (isHiddenFromPublic(item)) return false;
      const created = Date.parse(String(item.createdAt || ""));
      if (!Number.isFinite(created)) return false;
      return now - created <= RECENT_MS && created <= now + 60_000;
    })
    .sort(
      (a, b) =>
        Date.parse(String(b.createdAt || "")) -
        Date.parse(String(a.createdAt || ""))
    )
    .slice(0, MAX_PREPEND);
  return fresh.length ? [...fresh, ...base] : base;
}
