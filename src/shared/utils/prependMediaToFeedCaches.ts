import type { QueryClient } from "@tanstack/react-query";
import { useContentCacheStore } from "../../../app/store/useContentCacheStore";
import type { MediaItem } from "../types";

function itemId(item: { _id?: string; id?: string }): string {
  return String(item?._id || item?.id || "");
}

function prependToList<T extends { _id?: string; id?: string }>(
  list: T[] | undefined,
  item: T
): T[] {
  const id = itemId(item);
  const existing = Array.isArray(list) ? list.filter((x) => itemId(x) !== id) : [];
  return [item, ...existing];
}

/**
 * Instantly surface a just-uploaded item in React Query + Zustand feed caches
 * so Home tabs don't wait on a stale 12-item page / disabled refetchOnMount.
 */
export function prependMediaToFeedCaches(
  queryClient: QueryClient,
  item: MediaItem
): void {
  const id = itemId(item);
  if (!id) return;

  const mergeQueryData = (old: any) => {
    if (!old) {
      return { media: [item], total: 1 };
    }
    if (Array.isArray(old.media)) {
      const media = prependToList(old.media, item);
      const added = media.length > (old.media?.length || 0) ? 1 : 0;
      return {
        ...old,
        media,
        total:
          typeof old.total === "number" ? old.total + added : media.length,
      };
    }
    if (Array.isArray(old)) {
      return prependToList(old, item);
    }
    return old;
  };

  queryClient.setQueriesData({ queryKey: ["all-content"] }, mergeQueryData);
  queryClient.setQueriesData({ queryKey: ["default-content"] }, mergeQueryData);
  queryClient.setQueriesData(
    { queryKey: ["all-content-infinite"] },
    (old: any) => {
      if (!old?.pages?.length) {
        return {
          pages: [{ media: [item], total: 1 }],
          pageParams: [1],
        };
      }
      const pages = [...old.pages];
      pages[0] = mergeQueryData(pages[0]);
      return { ...old, pages };
    }
  );

  const cache = useContentCacheStore.getState().cache;
  const touchKeys = new Set([
    "ALL:first",
    "ALL:page:1",
    ...Object.keys(cache),
  ]);

  for (const key of touchKeys) {
    const page = cache[key];
    if (!page?.items) {
      if (key === "ALL:first" || key === "ALL:page:1") {
        useContentCacheStore.getState().set(key, {
          items: [item],
          page: 1,
          limit: 12,
          total: 1,
          fetchedAt: Date.now(),
        });
      }
      continue;
    }
    const items = prependToList(page.items, item);
    const added = items.length > page.items.length ? 1 : 0;
    useContentCacheStore.getState().set(key, {
      ...page,
      items,
      total:
        typeof page.total === "number" ? page.total + added : items.length,
      fetchedAt: Date.now(),
    });
  }
}

/** Mark feed queries stale and refetch active ones after upload. */
export function refreshFeedAfterUpload(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ["all-content"] });
  void queryClient.invalidateQueries({ queryKey: ["default-content"] });
  void queryClient.invalidateQueries({ queryKey: ["all-content-infinite"] });
  void queryClient.refetchQueries({
    queryKey: ["all-content"],
    type: "active",
  });
}
