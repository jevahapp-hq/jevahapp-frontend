import type { QueryClient } from "@tanstack/react-query";
import { useContentCacheStore } from "../../../app/store/useContentCacheStore";
import {
  FEED_PAGE_SIZE,
  LEGACY_ALL_FIRST_KEY,
  feedZustandFirstPageKey,
} from "../config/feedCachePolicy";
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

function patchInList<T extends { _id?: string; id?: string }>(
  list: T[] | undefined,
  id: string,
  patch: Partial<T>
): T[] | undefined {
  if (!Array.isArray(list) || !id) return list;
  let changed = false;
  const next = list.map((item) => {
    if (itemId(item) !== id) return item;
    changed = true;
    return { ...item, ...patch };
  });
  return changed ? next : list;
}

function mergePageData(old: any, item: MediaItem) {
  if (!old) {
    return { media: [item], total: 1 };
  }
  if (Array.isArray(old.media)) {
    const media = prependToList(old.media, item);
    const added = media.length > (old.media?.length || 0) ? 1 : 0;
    return {
      ...old,
      media,
      total: typeof old.total === "number" ? old.total + added : media.length,
    };
  }
  if (Array.isArray(old)) {
    return prependToList(old, item);
  }
  return old;
}

function mergeInfiniteOrPage(old: any, item: MediaItem) {
  if (old?.pages && Array.isArray(old.pages)) {
    if (!old.pages.length) {
      return {
        pages: [{ media: [item], total: 1, page: 1, limit: FEED_PAGE_SIZE }],
        pageParams: [1],
      };
    }
    const pages = [...old.pages];
    pages[0] = mergePageData(pages[0], item);
    return { ...old, pages };
  }
  return mergePageData(old, item);
}

function patchPageData(old: any, id: string, patch: Partial<MediaItem>) {
  if (!old) return old;
  if (Array.isArray(old.media)) {
    const media = patchInList(old.media, id, patch);
    if (media === old.media) return old;
    return { ...old, media };
  }
  if (Array.isArray(old)) {
    return patchInList(old, id, patch) ?? old;
  }
  return old;
}

function patchInfiniteOrPage(old: any, id: string, patch: Partial<MediaItem>) {
  if (old?.pages && Array.isArray(old.pages)) {
    let changed = false;
    const pages = old.pages.map((page: any) => {
      const next = patchPageData(page, id, patch);
      if (next !== page) changed = true;
      return next;
    });
    return changed ? { ...old, pages } : old;
  }
  return patchPageData(old, id, patch);
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

  queryClient.setQueriesData(
    { queryKey: ["all-content"] },
    (old: any) => mergeInfiniteOrPage(old, item)
  );
  queryClient.setQueriesData(
    { queryKey: ["default-content"] },
    (old: any) => mergePageData(old, item)
  );
  queryClient.setQueriesData(
    { queryKey: ["all-content-infinite"] },
    (old: any) => mergeInfiniteOrPage(old, item)
  );

  const cache = useContentCacheStore.getState().cache;
  const touchKeys = new Set([
    LEGACY_ALL_FIRST_KEY,
    feedZustandFirstPageKey("ALL", false),
    feedZustandFirstPageKey("ALL", true),
    "ALL:page:1",
    ...Object.keys(cache),
  ]);

  for (const key of touchKeys) {
    const page = cache[key];
    if (!page?.items) {
      if (
        key === LEGACY_ALL_FIRST_KEY ||
        key === "ALL:page:1" ||
        key === feedZustandFirstPageKey("ALL", false) ||
        key === feedZustandFirstPageKey("ALL", true)
      ) {
        useContentCacheStore.getState().set(key, {
          items: [item],
          page: 1,
          limit: FEED_PAGE_SIZE,
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

/**
 * Patch an existing feed item (e.g. after media worker returns duration / MP4 URLs).
 */
export function patchMediaInFeedCaches(
  queryClient: QueryClient,
  mediaId: string,
  patch: Partial<MediaItem>
): void {
  const id = String(mediaId || "").trim();
  if (!id) return;

  queryClient.setQueriesData(
    { queryKey: ["all-content"] },
    (old: any) => patchInfiniteOrPage(old, id, patch)
  );
  queryClient.setQueriesData(
    { queryKey: ["default-content"] },
    (old: any) => patchPageData(old, id, patch)
  );
  queryClient.setQueriesData(
    { queryKey: ["all-content-infinite"] },
    (old: any) => patchInfiniteOrPage(old, id, patch)
  );

  const cache = useContentCacheStore.getState().cache;
  for (const key of Object.keys(cache)) {
    const page = cache[key];
    if (!page?.items) continue;
    const items = patchInList(page.items, id, patch);
    if (!items || items === page.items) continue;
    useContentCacheStore.getState().set(key, {
      ...page,
      items,
      fetchedAt: Date.now(),
    });
  }
}

/** Mark feed queries stale after upload — do NOT force an immediate refetch.
 * Forced refetch often drops a just-prepended under_review item before BE indexes it,
 * which feels like the video "plays then disappears".
 */
export function refreshFeedAfterUpload(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: ["all-content"],
    refetchType: "none",
  });
  void queryClient.invalidateQueries({
    queryKey: ["default-content"],
    refetchType: "none",
  });
  void queryClient.invalidateQueries({
    queryKey: ["all-content-infinite"],
    refetchType: "none",
  });
}
