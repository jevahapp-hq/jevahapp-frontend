import type { MediaItem } from "../../../../shared/types";
import { detectMediaType } from "../../../../shared/utils/mediaTypeDetection";

function isReelsVideo(item?: MediaItem | null): item is MediaItem {
  if (!item) return false;
  const type = detectMediaType(item);
  return type === "video" || type === "gif";
}

function itemId(item: MediaItem): string {
  return String(item._id || (item as { id?: string }).id || item.fileUrl || "");
}

/**
 * Reels list order matches the home feed: most recent first, then the
 * remaining videos in the same order they appear while scrolling.
 */
export function buildReelsVideoList(options: {
  mostRecentItem?: MediaItem | null;
  firstFour?: MediaItem[];
  rest?: MediaItem[];
  fallbackVideos?: MediaItem[];
}): MediaItem[] {
  const ordered: MediaItem[] = [];
  const seen = new Set<string>();
  const push = (item?: MediaItem | null) => {
    if (!isReelsVideo(item)) return;
    const id = itemId(item);
    if (id && seen.has(id)) return;
    if (id) seen.add(id);
    ordered.push(item);
  };

  push(options.mostRecentItem);
  (options.firstFour ?? []).forEach(push);
  (options.rest ?? []).forEach(push);
  (options.fallbackVideos ?? []).forEach(push);
  return ordered;
}
