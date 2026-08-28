/**
 * Fan a description edit out to every cache that renders it, so the new text
 * appears in Reels, the feed and the library without a refetch.
 *
 * Mirrors `removeMediaFromFeedCaches`, which does the same traversal for
 * deletes — same cache keys, same infinite/page/array shapes.
 */
import type { QueryClient } from "@tanstack/react-query";
import { useContentCacheStore } from "@/store/useContentCacheStore";
import { useReelsStore } from "@/store/useReelsStore";

function itemId(item: any): string {
  return String(item?._id || item?.id || "");
}

function patchList(list: any[] | undefined, id: string, description: string) {
  if (!Array.isArray(list)) return list;
  let changed = false;
  const next = list.map((item) => {
    if (itemId(item) !== id) return item;
    changed = true;
    return { ...item, description };
  });
  return changed ? next : list;
}

export function applyMediaDescriptionToCaches(
  queryClient: QueryClient,
  mediaId: string,
  description: string
): void {
  const id = String(mediaId || "").trim();
  if (!id) return;

  const patchPageData = (old: any) => {
    if (!old) return old;
    if (Array.isArray(old.media)) {
      return { ...old, media: patchList(old.media, id, description) };
    }
    if (Array.isArray(old)) return patchList(old, id, description);
    return old;
  };

  const patchInfiniteOrPage = (old: any) => {
    if (old?.pages && Array.isArray(old.pages)) {
      return { ...old, pages: old.pages.map(patchPageData) };
    }
    return patchPageData(old);
  };

  queryClient.setQueriesData({ queryKey: ["all-content"] }, patchInfiniteOrPage);
  queryClient.setQueriesData({ queryKey: ["default-content"] }, patchPageData);
  queryClient.setQueriesData(
    { queryKey: ["all-content-infinite"] },
    patchInfiniteOrPage
  );

  const cache = useContentCacheStore.getState().cache;
  for (const [key, page] of Object.entries(cache)) {
    if (!page?.items?.length) continue;
    const items = patchList(page.items, id, description);
    if (items === page.items) continue;
    useContentCacheStore.getState().set(key, { ...page, items } as any);
  }

  // Reels renders off its own list, not React Query.
  try {
    const store = useReelsStore.getState();
    const list = store.videoList;
    if (Array.isArray(list) && list.length) {
      const next = patchList(list, id, description);
      if (next !== list) store.setVideoList(next as any);
    }
  } catch {
    // no-op
  }
}
