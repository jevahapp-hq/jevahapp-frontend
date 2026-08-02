import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useContentCacheStore
} from "../../../app/store/useContentCacheStore";
import { useInteractionStore } from "../../../app/store/useInteractionStore";
import { UserProfileCache } from "../../../app/utils/cache/UserProfileCache";
import { mediaApi } from "../../core/api/MediaApi";
import type {
  ContentFilter,
  MediaItem,
  UseMediaOptions,
  UseMediaReturn,
} from "../types";
import { buildStableFeedMediaList } from "../utils/buildStableFeedMediaList";
import { filterContentByType, transformApiResponseToMediaItem } from "../utils";

/** Sync stats from media items to useInteractionStore to prevent redundant metadata fetches */
const syncMediaStatsToInteractionStore = (items: MediaItem[]) => {
  if (!items || items.length === 0) return;

  try {
    const store = useInteractionStore.getState();
    const statsUpdate: Record<string, any> = {};

    items.forEach(item => {
      const id = item._id;
      if (!id || store.contentStats[id]) return; // Skip if stats already exist (preserve user updates)

      statsUpdate[id] = {
        contentId: id,
        likes: item.totalLikes ?? item.likeCount ?? item.likes ?? item.favorite ?? 0,
        saves: item.saves ?? item.saved ?? 0,
        shares: item.totalShares ?? item.shareCount ?? item.shares ?? 0,
        views: item.totalViews ?? item.viewCount ?? item.views ?? 0,
        comments: item.commentCount ?? item.comments ?? item.comment ?? 0,
        userInteractions: {
          liked: Boolean(item.hasLiked),
          saved: Boolean(item.hasBookmarked),
          shared: Boolean(item.hasShared),
          viewed: Boolean(item.hasViewed),
        },
      } as any;
    });

    if (Object.keys(statsUpdate).length > 0) {
      useInteractionStore.setState(state => ({
        contentStats: { ...state.contentStats, ...statsUpdate }
      }));
    }
  } catch (err) {
    if (__DEV__) console.warn("Failed to sync media stats:", err);
  }
};

/** Shared fetcher for prefetch and useMedia - show content as fast as possible */
export async function fetchAllContentPublic(contentType: string = "ALL") {
  const response = await mediaApi.getAllContentPublic({
    page: 1,
    limit: 20,
    contentType: contentType !== "ALL" ? contentType : undefined,
  });

  if (!response.success) throw new Error(response.error || "Failed to fetch content");

  if (!response.media || response.media.length === 0) {
    return { media: [], total: 0 };
  }

  const enrichedMedia = UserProfileCache.enrichContentArray(response.media);
  const transformedMedia = enrichedMedia
    .map(transformApiResponseToMediaItem)
    .filter((item): item is MediaItem => item !== null);

  const result = {
    media: transformedMedia,
    total: response.total || response.pagination?.total || 0,
  };

  // Sync stats to store to prevent individual metadata fetches per card
  syncMediaStatsToInteractionStore(result.media);

  if (contentType === "ALL") {
    useContentCacheStore.getState().set("ALL:first", {
      items: result.media,
      page: 1,
      limit: 20,
      total: result.total,
      fetchedAt: Date.now(),
    });
  }

  return result;
}

/** Shared fetcher for default-content prefetch + useMedia */
export async function fetchDefaultContentPage(
  contentType: string = "ALL",
  page: number = 1,
  limit: number = 40
) {
  const response = await mediaApi.getDefaultContent({
    page,
    limit,
    contentType:
      contentType !== "ALL"
        ? (contentType as ContentFilter["contentType"])
        : undefined,
  });

  if (!response.success) throw new Error(response.error || "Failed to fetch content");

  const enrichedMedia = UserProfileCache.enrichContentArray(response.media || []);
  const transformedMedia = enrichedMedia
    .map(transformApiResponseToMediaItem)
    .filter((item): item is MediaItem => item !== null);

  const defaultKey = `${contentType || "ALL"}:page:${page || 1}`;
  useContentCacheStore.getState().set(defaultKey, {
    items: transformedMedia,
    page: response.page || page,
    limit: response.limit || limit,
    total: response.total || 0,
    fetchedAt: Date.now(),
  });

  // Also seed ALL:first so Most Recent can paint from disk on next cold start
  // even if the auth feed is what the home tab requests.
  if (contentType === "ALL" && page === 1 && transformedMedia.length > 0) {
    const existing = useContentCacheStore.getState().get("ALL:first");
    if (!existing?.items?.length) {
      useContentCacheStore.getState().set("ALL:first", {
        items: transformedMedia.slice(0, 20),
        page: 1,
        limit: 20,
        total: response.total || 0,
        fetchedAt: Date.now(),
      });
    }
  }

  const result = {
    media: transformedMedia,
    total: response.total || 0,
    page: response.page || page,
    limit: response.limit || limit,
    pages: Math.ceil((response.total || 0) / (response.limit || limit)),
  };

  syncMediaStatsToInteractionStore(result.media);
  return result;
}

/** Fetcher for authenticated all-content (includes user's uploads) */
async function fetchAllContentWithAuth(contentType: string = "ALL") {
  const response = await mediaApi.getAllContentWithAuth({
    page: 1,
    limit: 20,
    contentType: contentType !== "ALL" ? contentType : undefined,
  });

  if (!response.success) throw new Error(response.error || "Failed to fetch content");
  const mediaArr = response.media || [];
  const enrichedMedia = mediaArr.length > 0
    ? await UserProfileCache.enrichContentArrayBatch(mediaArr)
    : mediaArr;
  const transformedMedia = enrichedMedia
    .map(transformApiResponseToMediaItem)
    .filter((item): item is MediaItem => item !== null);

  const result = {
    media: transformedMedia,
    total: response.total || response.pagination?.total || 0,
  };

  // Sync stats to store
  syncMediaStatsToInteractionStore(result.media);

  // Persist so the next reload can paint Most Recent before the network returns
  // (logged-in home uses useAuth=true and previously skipped cache seeding).
  if (contentType === "ALL" && result.media.length > 0) {
    useContentCacheStore.getState().set("ALL:first", {
      items: result.media,
      page: 1,
      limit: 20,
      total: result.total,
      fetchedAt: Date.now(),
    });
  }

  return result;
}

export const useMedia = (options: UseMediaOptions = {}): UseMediaReturn => {
  const {
    immediate = true,
    contentType = "ALL",
    page = 1,
    limit = 40,
    useAuth = false,
  } = options;

  const queryClient = useQueryClient();
  // Disk-backed seed (hydrated in _layout before splash hides). Used for both
  // public and auth home feeds so Most Recent can paint on the first frame.
  const cacheEntry = useContentCacheStore((s) => s.get("ALL:first"));
  const defaultCacheKey = `${contentType || "ALL"}:page:${page || 1}`;
  const defaultCacheEntry = useContentCacheStore((s) => s.get(defaultCacheKey));

  const cachedAllContent =
    contentType === "ALL" && cacheEntry?.items?.length
      ? { media: cacheEntry.items, total: cacheEntry.total ?? 0 }
      : undefined;

  const cachedDefaultContent = defaultCacheEntry?.items?.length
    ? {
        media: defaultCacheEntry.items,
        total: defaultCacheEntry.total ?? 0,
        page: defaultCacheEntry.page || page,
        limit: defaultCacheEntry.limit || limit,
        pages: Math.ceil(
          (defaultCacheEntry.total || 0) /
            (defaultCacheEntry.limit || limit || 40)
        ),
      }
    : undefined;

  const allContentQuery = useQuery({
    queryKey: ["all-content", contentType, 1, 20, useAuth],
    queryFn: () => (useAuth ? fetchAllContentWithAuth(contentType) : fetchAllContentPublic(contentType)),
    enabled: immediate,
    // Seed both public and auth from disk so Most Recent paints immediately.
    // Auth still refetches (staleTime + refetchOnMount) so uploads appear;
    // initialDataUpdatedAt uses cache age so a fresh disk seed doesn't block
    // that refetch for 30 minutes.
    initialData: cachedAllContent,
    initialDataUpdatedAt: useAuth
      ? 0
      : cacheEntry?.fetchedAt,
    placeholderData: (previousData) => previousData ?? cachedAllContent,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    // Auth home must refetch on mount so uploads aren't stuck behind stale cache.
    refetchOnMount: useAuth ? "always" : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Use React Query for default content
  const defaultContentQuery = useQuery({
    queryKey: ["default-content", page, limit, contentType],
    queryFn: () => fetchDefaultContentPage(contentType, page, limit),
    enabled: immediate,
    initialData: cachedDefaultContent,
    initialDataUpdatedAt: defaultCacheEntry?.fetchedAt,
    placeholderData: (previousData) => previousData ?? cachedDefaultContent,
    staleTime: 30 * 60 * 1000, // 30 minutes - longer cache for better UX
    gcTime: 60 * 60 * 1000, // 60 minutes - keep in cache longer
    retry: 1,
    refetchOnMount: false, // ✅ Use cache if available - instant load when switching tabs
    refetchOnWindowFocus: false, // ✅ Don't refetch on focus - preserve user's current view
    refetchOnReconnect: false, // ✅ Don't refetch on reconnect - use cached data
  });

  // Extract data from React Query (0ms if cached!)
  const allContent = allContentQuery.data?.media || [];
  const allContentTotal = allContentQuery.data?.total || 0;
  const defaultContentPage1 = defaultContentQuery.data?.media || [];
  const defaultContentPagination = {
    page: defaultContentQuery.data?.page || page,
    limit: defaultContentQuery.data?.limit || limit,
    total: defaultContentQuery.data?.total || 0,
    pages: defaultContentQuery.data?.pages || 0,
  };

  // `defaultContentQuery` only ever tracks page 1 - nothing previously
  // accumulated further pages, even though the feed screen's "coming soon"
  // card sits above a `rest` list that's supposed to keep growing as the
  // user scrolls. Without real pagination, the feed was capped at whatever
  // page 1 of these two endpoints currently returns; whenever either
  // refetched (pull-to-refresh, a delete, cache expiry, auth resolving)
  // and the backend's "latest" page 1 shifted (e.g. new uploads elsewhere
  // bumped older items off), previously-visible content - especially
  // anything below the first few items, i.e. under the coming-soon card -
  // would vanish outright since it was never actually accumulated anywhere.
  // This accumulates additional pages locally as `loadMoreContent` is
  // called (wired to the feed's onEndReached), so content already shown
  // keeps accumulating instead of being replaced.
  const [extraPages, setExtraPages] = useState<MediaItem[]>([]);
  const [highestLoadedPage, setHighestLoadedPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastFetchedPageWasFull, setLastFetchedPageWasFull] = useState(true);
  const loadingMoreRef = useRef(false);
  const extraPagesRef = useRef<MediaItem[]>([]);
  const highestLoadedPageRef = useRef(1);
  const lastFetchedPageWasFullRef = useRef(true);
  // Persist pagination per contentType so ALL ↔ VIDEO ↔ SERMON doesn't wipe
  // Coming Soon content or force a cold re-fetch of already-seen pages.
  const extrasByContentTypeRef = useRef<
    Record<
      string,
      { extras: MediaItem[]; page: number; lastFull: boolean }
    >
  >({});
  const paginationKeyRef = useRef(contentType);

  extraPagesRef.current = extraPages;
  highestLoadedPageRef.current = highestLoadedPage;
  lastFetchedPageWasFullRef.current = lastFetchedPageWasFull;

  useEffect(() => {
    if (paginationKeyRef.current === contentType) return;

    extrasByContentTypeRef.current[paginationKeyRef.current] = {
      extras: extraPagesRef.current,
      page: highestLoadedPageRef.current,
      lastFull: lastFetchedPageWasFullRef.current,
    };

    paginationKeyRef.current = contentType;
    const saved = extrasByContentTypeRef.current[contentType];
    if (saved) {
      setExtraPages(saved.extras);
      setHighestLoadedPage(saved.page);
      setLastFetchedPageWasFull(saved.lastFull);
    } else {
      setExtraPages([]);
      setHighestLoadedPage(1);
      setLastFetchedPageWasFull(true);
    }
  }, [contentType]);

  // Keep page-1 fullness in sync for the hasMore heuristic.
  useEffect(() => {
    if (highestLoadedPage !== 1) return;
    const size = defaultContentPagination.limit || limit || 40;
    setLastFetchedPageWasFull(defaultContentPage1.length >= size);
  }, [defaultContentPage1.length, highestLoadedPage, defaultContentPagination.limit, limit]);

  const defaultContent = useMemo(() => {
    if (extraPages.length === 0) return defaultContentPage1;
    // Fall back to fileUrl when _id/id is missing so items without a stable
    // ID still get deduped instead of silently re-appearing on later pages.
    const dedupeKey = (item: MediaItem) =>
      String(item._id || (item as any).id || item.fileUrl || "");
    const seen = new Set<string>();
    const merged: MediaItem[] = [];
    for (const item of defaultContentPage1) {
      const key = dedupeKey(item);
      if (key) seen.add(key);
      merged.push(item);
    }
    for (const item of extraPages) {
      const key = dedupeKey(item);
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      merged.push(item);
    }
    return merged;
  }, [defaultContentPage1, extraPages]);

  const pageSize = defaultContentPagination.limit || limit || 40;
  const computedPages =
    defaultContentPagination.total > 0
      ? Math.ceil(defaultContentPagination.total / pageSize)
      : defaultContentPagination.pages || 0;
  const hasMoreDefaultPages =
    defaultContentPagination.total > 0
      ? defaultContent.length < defaultContentPagination.total
      : computedPages > 1
        ? highestLoadedPage < computedPages
        : lastFetchedPageWasFull;

  // Loading only when BOTH sources are empty — don't block Most Recent on
  // default-content. Coming Soon fills in when that query resolves.
  const allContentLoading = allContentQuery.isLoading && allContent.length === 0;
  const defaultContentLoading =
    defaultContentQuery.isLoading && defaultContent.length === 0;
  const loading =
    allContent.length === 0 &&
    defaultContent.length === 0 &&
    (allContentLoading || defaultContentLoading);

  // Error states
  const allContentError = allContentQuery.error
    ? (allContentQuery.error as Error).message
    : null;
  const defaultContentError = defaultContentQuery.error
    ? (defaultContentQuery.error as Error).message
    : null;
  const error = allContentError || defaultContentError;

  const hasContent = allContent.length > 0 || defaultContent.length > 0;

  // Legacy fetch function - now uses React Query internally
  // Kept for backward compatibility but React Query handles caching
  const fetchAllContent = useCallback(async (useAuth: boolean = false, pageNum: number = 1, append: boolean = false) => {
    // React Query handles this automatically - just refetch the query
    if (!append) {
      await allContentQuery.refetch();
    } else {
      // For append, fetch next page using queryClient
      await queryClient.fetchQuery({
        queryKey: ["all-content", contentType, pageNum, 20, useAuth],
        queryFn: async () => {
          let response;
          if (useAuth) {
            response = await mediaApi.getAllContentWithAuth({
              page: pageNum,
              limit: 20,
              contentType: contentType !== "ALL" ? contentType : undefined,
            });
          } else {
            response = await mediaApi.getAllContentPublic({
              page: pageNum,
              limit: 20,
              contentType: contentType !== "ALL" ? contentType : undefined,
            });
          }

          if (response.success) {
            const enrichedMedia = UserProfileCache.enrichContentArray(response.media || []);
            const transformedMedia = enrichedMedia
              .map(transformApiResponseToMediaItem)
              .filter((item): item is MediaItem => item !== null);

            return {
              media: transformedMedia,
              total: response.total || response.pagination?.total || 0,
            };
          }

          throw new Error(response.error || "Failed to fetch content");
        },
        staleTime: 15 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
      });
    }
  }, [allContentQuery, queryClient, contentType]);

  // Keep showing accumulated pages after refresh. Drop only extras that
  // now duplicate the fresh page 1 — never wipe the Coming Soon tail.
  const refreshAllContent = useCallback(async () => {
    await Promise.all([allContentQuery.refetch(), defaultContentQuery.refetch()]);
    setExtraPages((prev) => {
      const page1 = defaultContentQuery.data?.media || [];
      const page1Ids = new Set(
        page1.map((i) => i._id || (i as any).id).filter(Boolean).map(String)
      );
      return prev.filter((item) => {
        const id = item._id || (item as any).id;
        return !id || !page1Ids.has(String(id));
      });
    });
  }, [allContentQuery, defaultContentQuery]);

  // Load more content for infinite scroll (TODO: implement with infinite query)
  const loadMoreAllContent = useCallback(async () => {
    // For now, just refetch - can be enhanced with infinite query later
    if (allContentLoading) return;
    await allContentQuery.refetch();
  }, [allContentQuery, allContentLoading]);

  // Soft refresh: keep extras until page 1 lands, then dedupe only.
  const refreshDefaultContent = useCallback(async () => {
    await defaultContentQuery.refetch();
    setExtraPages((prev) => {
      const page1 = defaultContentQuery.data?.media || [];
      const page1Ids = new Set(
        page1.map((i) => i._id || (i as any).id).filter(Boolean).map(String)
      );
      return prev.filter((item) => {
        const id = item._id || (item as any).id;
        return !id || !page1Ids.has(String(id));
      });
    });
  }, [defaultContentQuery]);

  // Load more default content - fetches the next page directly and
  // appends it to `extraPages` (deduped against what's already shown in
  // `defaultContent`) so scrolling further never removes what's already
  // on screen, it only ever adds to it.
  const loadMoreDefaultContent = useCallback(async () => {
    if (loadingMoreRef.current) return;

    // Prefer the live hasMore signal. The old `pages` early-return blocked
    // Coming Soon growth whenever total/pages metadata was missing or stale.
    const total = defaultContentPagination.total || 0;
    const pages = defaultContentPagination.pages || 0;
    const loaded = defaultContentPage1.length + extraPagesRef.current.length;
    if (total > 0 && loaded >= total) return;
    if (pages > 1 && highestLoadedPage >= pages) return;
    if (total === 0 && pages <= 1 && !lastFetchedPageWasFullRef.current) return;

    const nextPage = highestLoadedPage + 1;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const response = await mediaApi.getDefaultContent({
        page: nextPage,
        limit,
        contentType: contentType !== "ALL" ? contentType : undefined,
      });
      if (response.success) {
        const enrichedMedia = UserProfileCache.enrichContentArray(
          response.media || []
        );
        const transformedMedia = enrichedMedia
          .map(transformApiResponseToMediaItem)
          .filter((item): item is MediaItem => item !== null);
        syncMediaStatsToInteractionStore(transformedMedia);
        const full = transformedMedia.length >= limit;
        setLastFetchedPageWasFull(full);
        if (transformedMedia.length === 0) {
          setLastFetchedPageWasFull(false);
          return;
        }
        setExtraPages((prev) => {
          // Fall back to fileUrl when _id/id is missing so items without a
          // stable ID are still deduped instead of always passing through.
          const dedupeKey = (item: MediaItem) =>
            String(item._id || (item as any).id || item.fileUrl || "");
          const seen = new Set<string>();
          for (const item of defaultContentPage1) {
            const key = dedupeKey(item);
            if (key) seen.add(key);
          }
          for (const item of prev) {
            const key = dedupeKey(item);
            if (key) seen.add(key);
          }
          const unique = transformedMedia.filter((item) => {
            const key = dedupeKey(item);
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return unique.length ? [...prev, ...unique] : prev;
        });
        setHighestLoadedPage(nextPage);
      }
    } catch (e) {
      if (__DEV__) console.warn("⚠️ Failed to load more content:", e);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [
    highestLoadedPage,
    defaultContentPagination.pages,
    defaultContentPagination.total,
    defaultContentPage1,
    limit,
    contentType,
  ]);

  // Load more content (alias for compatibility)
  const loadMoreContent = loadMoreDefaultContent;

  // Filter content by type - merge both sources rather than picking one, so
  // this doesn't suffer from the same "smaller list wins" issue as `mediaList`
  // in AllContentTikTok (see comment there for details).
  const getFilteredContent = useCallback(
    (filter: ContentFilter) => {
      const sourceData = buildStableFeedMediaList(defaultContent, allContent);
      return filterContentByType(sourceData, filter.contentType || "ALL");
    },
    [allContent, defaultContent]
  );

  // React Query handles initialization automatically via `enabled: immediate`
  // No need for manual useEffect - React Query will fetch on mount if enabled
  useEffect(() => {
    // Redundant endpoint testing removed to prevent 429 "Too many requests" errors.
    // The app already has a startup warmup in _layout.tsx.
  }, [immediate]);

  // Calculate if there are more pages to load
  const hasMorePages = useMemo(() => {
    if (!allContentTotal) return false;
    const currentPage = Math.floor(allContent.length / 50) + 1;
    const totalPages = Math.ceil(allContentTotal / 50);
    return currentPage < totalPages;
  }, [allContent.length, allContentTotal]);

  // Memoized return value
  const returnValue = useMemo(
    (): UseMediaReturn => ({
      allContent,
      defaultContent,
      loading,
      defaultContentLoading,
      error,
      hasContent,
      total: allContentTotal || defaultContentPagination.total,
      refreshAllContent,
      refreshDefaultContent,
      loadMoreContent,
      loadMoreAllContent,
      hasMorePages,
      getFilteredContent,
      isLoadingMore,
      hasMoreDefaultPages,
    }),
    [
      allContent,
      defaultContent,
      loading,
      defaultContentLoading,
      error,
      hasContent,
      allContentTotal,
      defaultContentPagination.total,
      refreshAllContent,
      refreshDefaultContent,
      loadMoreContent,
      loadMoreAllContent,
      hasMorePages,
      getFilteredContent,
      isLoadingMore,
      hasMoreDefaultPages,
    ]
  );

  return returnValue;
};

// Additional hook for content stats
export const useContentStats = (contentIds: string[], contentType?: string) => {
  const [stats, setStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (contentIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await mediaApi.batchGetContentStats(
        contentIds,
        contentType
      );

      if (response.success) {
        setStats(response.data || {});
      } else {
        setError(response.error || "Failed to load stats");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [contentIds, contentType]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, refresh: loadStats };
};

// Hook for single content item
export const useContentItem = (contentId: string) => {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!contentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await mediaApi.getContentById(contentId);

      if (response.success && response.data) {
        setItem(transformApiResponseToMediaItem(response.data));
      } else {
        setError(response.error || "Failed to load content");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  return { item, loading, error, refresh: loadItem };
};
