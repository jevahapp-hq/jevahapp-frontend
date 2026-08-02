import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  FEED_GC_MS,
  FEED_PAGE_SIZE,
  FEED_STALE_MS,
  allContentQueryKey,
} from "../config/feedCachePolicy";
import type { MediaItem } from "../types";
import {
  fetchAllContentPage,
  readSeededFirstPage,
  type AllContentPageResult,
} from "./fetchAllContentPage";

const EMPTY_MEDIA_LIST: MediaItem[] = [];

export function useAllContentInfiniteQuery(options: {
  contentType: string;
  limit?: number;
  useAuth?: boolean;
  enabled?: boolean;
}) {
  const {
    contentType,
    limit = FEED_PAGE_SIZE,
    useAuth = false,
    enabled = true,
  } = options;

  const queryKey = allContentQueryKey(contentType, limit, useAuth);
  const seeded = readSeededFirstPage(contentType, useAuth);
  const initialData = seeded?.media?.length
    ? {
        pages: [
          {
            media: seeded.media,
            total: seeded.total,
            page: 1,
            limit,
          } satisfies AllContentPageResult,
        ],
        pageParams: [1],
      }
    : undefined;

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const result = await fetchAllContentPage({
        contentType,
        page: pageParam as number,
        limit,
        useAuth,
      });

      // Flaky backends sometimes return success with []. Don't wipe a good feed.
      if (!result.media?.length && (pageParam as number) === 1) {
        const seed = readSeededFirstPage(contentType, useAuth);
        if (seed?.media?.length) {
          if (__DEV__) {
            console.warn(
              "⚠️ all-content returned empty; keeping seeded feed items"
            );
          }
          return {
            media: seed.media,
            total: seed.total,
            page: 1,
            limit,
          };
        }
      }
      return result;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (sum, p) => sum + (p.media?.length ?? 0),
        0
      );
      const total = lastPage.total ?? 0;
      if (total > 0 && loaded >= total) return undefined;
      if (!lastPage.media?.length) return undefined;
      if (lastPage.media.length < limit) return undefined;
      return allPages.length + 1;
    },
    enabled,
    initialData,
    placeholderData: (prev) => prev ?? initialData,
    staleTime: FEED_STALE_MS,
    gcTime: FEED_GC_MS,
    retry: 1,
    refetchOnMount: !initialData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const allContent = useMemo(() => {
    const pages = query.data?.pages;
    if (!pages?.length) return EMPTY_MEDIA_LIST;
    const flat: MediaItem[] = [];
    const seen = new Set<string>();
    for (const page of pages) {
      for (const item of page.media ?? []) {
        const id = String(item._id || (item as any).id || "");
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        flat.push(item);
      }
    }
    return flat;
  }, [query.data?.pages]);

  const total = query.data?.pages?.[0]?.total ?? 0;

  return {
    query,
    allContent,
    total,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
