import type { MediaItem } from "../types";

function itemId(item: MediaItem): string {
  return String(item?._id || (item as { id?: string })?.id || "").trim();
}

/**
 * Fold typed-catalog sermons/ebooks into the mixed ALL list.
 *
 * Discovery (`/api/media/all-content`) often already contains the same ids
 * tagged as video/media, so a skip-on-duplicate weave hid sermon and ebook
 * cards. Catalog records win on id collision (correct contentType), and any
 * leftovers are interleaved from the first row so they appear above Coming Soon.
 */
export function weaveCatalogIntoFeed(
  base: MediaItem[],
  extras: MediaItem[]
): MediaItem[] {
  const primary = Array.isArray(base) ? base : [];
  const incoming = Array.isArray(extras) ? extras : [];
  if (!incoming.length) return primary;

  const catalogById = new Map<string, MediaItem>();
  for (const item of incoming) {
    const id = itemId(item);
    if (id && !catalogById.has(id)) catalogById.set(id, item);
  }

  const used = new Set<string>();
  const replaced: MediaItem[] = [];
  for (const item of primary) {
    const id = itemId(item);
    const catalog = id ? catalogById.get(id) : undefined;
    if (catalog) {
      used.add(id);
      replaced.push({
        ...catalog,
        moderationStatus:
          catalog.moderationStatus ||
          item.moderationStatus ||
          "approved",
      });
    } else {
      replaced.push(item);
    }
  }

  const leftover: MediaItem[] = [];
  for (const item of incoming) {
    const id = itemId(item);
    if (id && used.has(id)) continue;
    if (id) used.add(id);
    leftover.push(item);
  }

  if (!replaced.length) return leftover;
  if (!leftover.length) return replaced;

  const out: MediaItem[] = [];
  let ei = 0;
  for (let i = 0; i < replaced.length; i++) {
    out.push(replaced[i]);
    if (ei < leftover.length) {
      out.push(leftover[ei++]);
    }
  }
  while (ei < leftover.length) out.push(leftover[ei++]);
  return out;
}
