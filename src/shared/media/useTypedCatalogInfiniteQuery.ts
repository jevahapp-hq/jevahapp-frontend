import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getFeedGcMs,
  getFeedMaxPages,
  getFeedPageSize,
  getFeedStaleMs,
} from "../config/feedCachePolicy";
import type { MediaItem } from "../types";
import { fetchTypedCatalogPage } from "./fetchTypedCatalogPage";
import { typedCatalogQueryKey, type TypedCatalogKind } from "./typedCatalogKeys";

const EMPTY_MEDIA_LIST: MediaItem[] = [];

export function useTypedCatalogInfiniteQuery(options: {
  kind: TypedCatalogKind;
  enabled: boolean;
  limit?: number;
}) {
  const { kind, enabled, limit: limitOpt } = options;
  const limit = limitOpt ?? getFeedPageSize();
  const queryKey = typedCatalogQueryKey(kind, limit);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const page = typeof pageParam === "number" ? pageParam : 1;
      return fetchTypedCatalogPage({ kind, page, limit });
    },
    enabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) return lastPage.page + 1;
      return undefined;
    },
    staleTime: getFeedStaleMs(),
    gcTime: getFeedGcMs(),
    maxPages: getFeedMaxPages(),
    retry: (failureCount, error) => {
      const msg = String((error as Error)?.message || "");
      if (msg.includes("429") || msg.toLowerCase().includes("too many")) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: (q) => {
      const msg = String((q.state.error as Error | null)?.message || "");
      if (msg.includes("Missing queryFn")) return "always";
      const pages = (q.state.data as { pages?: Array<{ media?: unknown[] }> } | undefined)
        ?.pages;
      if (!pages?.length) return true;
      return false;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const items = useMemo(() => {
    const pages = query.data?.pages;
    if (!pages?.length) return EMPTY_MEDIA_LIST;
    const out: MediaItem[] = [];
    const seen = new Set<string>();
    for (const page of pages) {
      for (const item of page.media || []) {
        const id = String(item._id || (item as { id?: string }).id || "");
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        out.push(item);
      }
    }
    return out;
  }, [query.data]);

  const errorMessage = query.error
    ? String((query.error as Error).message || "Failed to load catalog")
    : null;
  const displayError =
    errorMessage && !errorMessage.includes("Missing queryFn")
      ? errorMessage
      : null;

  return {
    query,
    items,
    error: displayError,
    isPending: query.isPending && items.length === 0,
    isFetchingNextPage: Boolean(query.isFetchingNextPage),
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
