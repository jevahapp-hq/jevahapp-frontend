import type { QueryClient } from "@tanstack/react-query";
import { useContentCacheStore } from "../../../app/store/useContentCacheStore";

type MediaLike = { _id?: string; id?: string; media?: unknown[] };

function itemId(item: any): string {
  return String(item?._id || item?.id || "");
}

function filterMediaList<T extends MediaLike>(list: T[] | undefined, mediaId: string): T[] {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => itemId(item) !== mediaId);
}

/**
 * Instantly drop a deleted item from React Query + Zustand feed caches
 * (TikTok/IG-style: UI updates before the network refetch finishes).
 */
export function removeMediaFromFeedCaches(
  queryClient: QueryClient,
  mediaId: string
): void {
  const id = String(mediaId || "").trim();
  if (!id) return;

  const stripQueryData = (old: any) => {
    if (!old) return old;
    if (Array.isArray(old.media)) {
      const media = filterMediaList(old.media, id);
      const total =
        typeof old.total === "number"
          ? Math.max(0, old.total - (old.media.length - media.length))
          : old.total;
      return { ...old, media, total };
    }
    if (Array.isArray(old)) {
      return filterMediaList(old, id);
    }
    return old;
  };

  queryClient.setQueriesData({ queryKey: ["all-content"] }, stripQueryData);
  queryClient.setQueriesData({ queryKey: ["default-content"] }, stripQueryData);
  queryClient.setQueriesData(
    { queryKey: ["all-content-infinite"] },
    (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => stripQueryData(page)),
      };
    }
  );

  const cache = useContentCacheStore.getState().cache;
  for (const [key, page] of Object.entries(cache)) {
    if (!page?.items?.length) continue;
    const items = filterMediaList(page.items, id);
    if (items.length === page.items.length) continue;
    useContentCacheStore.getState().set(key, {
      ...page,
      items,
      total:
        typeof page.total === "number"
          ? Math.max(0, page.total - (page.items.length - items.length))
          : page.total,
      fetchedAt: Date.now(),
    });
  }
}

/** Mark stale + refetch so the server remains source of truth. */
export function refreshFeedAfterDelete(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ["all-content"] });
  void queryClient.invalidateQueries({ queryKey: ["default-content"] });
  void queryClient.invalidateQueries({ queryKey: ["all-content-infinite"] });
}
