/**
 * Prefetch comments for the focused feed item + neighbors
 * so opening the sheet paints from memory instantly.
 */
import { useEffect, useRef } from "react";
import type { MediaItem } from "../../../../shared/types";
import { prefetchComments } from "../../../../../app/hooks/comments/prefetchComments";

function contentTypeForItem(item: MediaItem): "media" | "devotional" {
  const t = String(item.contentType || "").toLowerCase();
  if (t.includes("devotional")) return "devotional";
  return "media";
}

export function useAdjacentCommentsPrefetch(options: {
  focusedKey: string | null;
  items: MediaItem[];
  getContentKey: (item: MediaItem) => string;
  /** Focused + this many neighbors each side */
  radius?: number;
}) {
  const { focusedKey, items, getContentKey, radius = 1 } = options;
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusedKey || items.length === 0) return;
    if (lastKeyRef.current === focusedKey) return;
    lastKeyRef.current = focusedKey;

    const index = items.findIndex((item) => getContentKey(item) === focusedKey);
    if (index < 0) return;

    const targets: MediaItem[] = [];
    for (let i = Math.max(0, index - radius); i <= Math.min(items.length - 1, index + radius); i++) {
      targets.push(items[i]);
    }

    for (const item of targets) {
      const id = String((item as any)._id || (item as any).id || "").trim();
      if (!id) continue;
      void prefetchComments(id, contentTypeForItem(item), "newest");
    }
  }, [focusedKey, items, getContentKey, radius]);
}
