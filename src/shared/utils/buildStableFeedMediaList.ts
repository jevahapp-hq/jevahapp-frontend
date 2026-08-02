import type { MediaItem } from "../types";

/**
 * Build a stable home-feed media list.
 *
 * Paginated `defaultContent` (page 1 + accumulated extra pages) is the
 * backbone so content under Coming Soon never vanishes when the capped
 * auth feed refetches. Auth-only items (e.g. pending uploads) are
 * prepended without replacing that backbone.
 */
export function buildStableFeedMediaList(
  defaultContent: MediaItem[],
  allContent: MediaItem[]
): MediaItem[] {
  const defaults = Array.isArray(defaultContent) ? defaultContent : [];
  const authItems = Array.isArray(allContent) ? allContent : [];

  if (defaults.length === 0) return authItems;
  if (authItems.length === 0) return defaults;

  // Fall back to fileUrl when _id/id is missing so items without a stable
  // ID still get deduped instead of silently appearing twice in the feed.
  const dedupeKey = (item: MediaItem) =>
    String(item._id || (item as any).id || item.fileUrl || "");

  const seen = new Set<string>();
  const merged: MediaItem[] = [];

  for (const item of defaults) {
    const key = dedupeKey(item);
    if (key) seen.add(key);
    merged.push(item);
  }

  const authOnly: MediaItem[] = [];
  for (const item of authItems) {
    const key = dedupeKey(item);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    authOnly.push(item);
  }

  return authOnly.length ? [...authOnly, ...merged] : merged;
}
