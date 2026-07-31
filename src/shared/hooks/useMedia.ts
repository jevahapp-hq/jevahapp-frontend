import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useContentCacheStore
} from "../../../app/store/useContentCacheStore";
import { useInteractionStore } from "../../../app/store/useInteractionStore";
import { UserProfileCache } from "../../../app/utils/cache/UserProfileCache";
import {
  getCachedContentInteraction,
  isContentInteractionFresh,
} from "../../../app/utils/contentInteractionPersist";
import { mediaApi } from "../../core/api/MediaApi";
import {
  ContentFilter,
  MediaItem,
  UseMediaOptions,
  UseMediaReturn,
} from "../types";
import { filterContentByType, transformApiResponseToMediaItem } from "../utils";

const EMPTY_MEDIA_LIST: MediaItem[] = [];

/** Sync stats from media items to useInteractionStore to prevent redundant metadata fetches */
const syncMediaStatsToInteractionStore = (items: MediaItem[]) => {
  if (!items || items.length === 0) return;

  try {
    const store = useInteractionStore.getState();
    const statsUpdate: Record<string, any> = {};

    items.forEach((item) => {
      const id = item._id;
      if (!id) return;

      const mediaLikes =
        item.totalLikes ?? item.likeCount ?? item.likes ?? item.favorite ?? 0;
      const mediaSaves = item.saves ?? item.saved ?? 0;
      const mediaShares =
        item.totalShares ?? item.shareCount ?? item.shares ?? 0;
      const mediaViews =
        item.totalViews ?? item.viewCount ?? item.views ?? 0;
      const mediaComments =
        item.commentCount ?? item.comments ?? item.comment ?? 0;
      const mediaLiked = Boolean(item.hasLiked);
      const mediaSaved = Boolean(item.hasBookmarked);

      const existing = store.contentStats[id];
      const cached = getCachedContentInteraction(id);
      const cacheIsFresh = isContentInteractionFresh(id);
      if (!existing) {
        statsUpdate[id] = {
          contentId: id,
          likes:
            cacheIsFresh && cached?.likes !== undefined
              ? Math.max(0, cached.likes)
              : mediaLikes,
          saves:
            cacheIsFresh && cached?.saves !== undefined
              ? Math.max(0, cached.saves)
              : mediaSaves,
          shares: mediaShares,
          views: mediaViews,
          comments: mediaComments,
          userInteractions: {
            liked:
              cacheIsFresh && cached?.liked !== undefined
                ? cached.liked
                : mediaLiked,
            saved:
              cacheIsFresh && cached?.saved !== undefined
                ? cached.saved
                : mediaSaved,
            shared: Boolean(item.hasShared),
            viewed: Boolean(item.hasViewed),
          },
        };
        return;
      }

      // Backfill incomplete hydrate (e.g. liked:true with likes:0) from media totals
      const nextLikes =
        cacheIsFresh && cached?.likes !== undefined
          ? Math.max(0, cached.likes)
          : (existing.likes ?? 0) > 0
            ? existing.likes
            : Math.max(existing.likes ?? 0, mediaLikes);
      const nextComments =
        (existing.comments ?? 0) > 0
          ? existing.comments
          : Math.max(existing.comments ?? 0, mediaComments);
      const nextSaves =
        (existing.saves ?? 0) > 0
          ? existing.saves
          : Math.max(existing.saves ?? 0, mediaSaves);
      const nextViews =
        (existing.views ?? 0) > 0
          ? existing.views
          : Math.max(existing.views ?? 0, mediaViews);

      const nextLiked =
        cacheIsFresh && cached?.liked !== undefined
          ? cached.liked
          : existing.userInteractions?.liked || mediaLiked;
      const nextSaved =
        cacheIsFresh && cached?.saved !== undefined
          ? cached.saved
          : existing.userInteractions?.saved || mediaSaved;

      if (
        nextLikes !== existing.likes ||
        nextComments !== existing.comments ||
        nextSaves !== existing.saves ||
        nextViews !== existing.views ||
        nextLiked !== existing.userInteractions?.liked ||
        nextSaved !== existing.userInteractions?.saved
      ) {
        statsUpdate[id] = {
          ...existing,
          likes: nextLikes,
          saves: nextSaves,
          shares: Math.max(existing.shares ?? 0, mediaShares),
          views: nextViews,
          comments: nextComments,
          userInteractions: {
            ...existing.userInteractions,
            liked: nextLiked,
            saved: nextSaved,
          },
        };
      }
    });

    if (Object.keys(statsUpdate).length > 0) {
      useInteractionStore.setState((state) => ({
        contentStats: { ...state.contentStats, ...statsUpdate },
      }));
    }
  } catch (err) {
    if (__DEV__) console.warn("Failed to sync media stats:", err);
  }
};

/** Map Home tab filters to API list `contentType` values. */
function normalizeListContentType(contentType: string): string {
  const t = (contentType || "ALL").toLowerCase();
  if (t === "all") return "ALL";
  if (t === "e-books" || t === "ebook" || t === "ebooks") return "books";
  if (t === "video") return "videos";
  if (t === "audio") return "music";
  return contentType;
}

/** Shared fetcher for prefetch and useMedia - show content as fast as possible */
export async function fetchAllContentPublic(contentType: string = "ALL") {
  const apiContentType = normalizeListContentType(contentType);
  const response = await mediaApi.getAllContentPublic({
    page: 1,
    limit: 12,
    contentType: apiContentType !== "ALL" ? apiContentType : undefined,
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
      limit: 12,
      total: result.total,
      fetchedAt: Date.now(),
    });
  }

  return result;
}

/** Fetcher for authenticated all-content (includes user's uploads) */
async function fetchAllContentWithAuth(contentType: string = "ALL") {
  const apiContentType = normalizeListContentType(contentType);
  const response = await mediaApi.getAllContentWithAuth({
    page: 1,
    limit: 12,
    contentType: apiContentType !== "ALL" ? apiContentType : undefined,
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

  return result;
}

export const useMedia = (options: UseMediaOptions = {}): UseMediaReturn => {
  const {
    immediate = true,
    contentType = "ALL",
    page = 1,
    limit = 12,
    useAuth = false,
  } = options;

  const queryClient = useQueryClient();
  const cacheEntry = useContentCacheStore((s) => s.get("ALL:first"));
  // Seed both public + auth queries so login flip doesn't blank the All tab
  const cachedForInitial =
    contentType === "ALL" && cacheEntry?.items?.length
      ? { media: cacheEntry.items, total: cacheEntry.total ?? 0 }
      : undefined;

  const allContentQueryKey = [
    "all-content",
    contentType,
    1,
    12,
    useAuth,
  ] as const;

  const allContentQuery = useQuery({
    queryKey: allContentQueryKey,
    queryFn: async () => {
      const result = useAuth
        ? await fetchAllContentWithAuth(contentType)
        : await fetchAllContentPublic(contentType);

      // Flaky local/backends sometimes return success with []. Don't wipe a good feed.
      if (!result.media?.length) {
        const prev = queryClient.getQueryData<{
          media: MediaItem[];
          total: number;
        }>(allContentQueryKey);
        if (prev?.media?.length) {
          if (__DEV__) {
            console.warn(
              "⚠️ all-content returned empty; keeping previous feed items"
            );
          }
          return prev;
        }
      }
      return result;
    },
    enabled: immediate,
    initialData: cachedForInitial,
    placeholderData: (prev) => prev ?? cachedForInitial,
    staleTime: 2 * 60 * 60 * 1000, // 2h — heavy feed cache
    gcTime: 24 * 60 * 60 * 1000, // keep in memory a day
    retry: 1,
    refetchOnMount: !cachedForInitial,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const allContentEarly = allContentQuery.data?.media ?? EMPTY_MEDIA_LIST;
  // Default feed is fallback — don't contend with the primary fetch on cold start
  const shouldFetchDefault =
    immediate &&
    (allContentQuery.isError ||
      (allContentQuery.isFetched && allContentEarly.length === 0));

  // Use React Query for default content
  const defaultContentQuery = useQuery({
    queryKey: ["default-content", page, limit, contentType],
    queryFn: async () => {
      const response = await mediaApi.getDefaultContent({
        page,
        limit,
        contentType: contentType !== "ALL" ? contentType : undefined,
      });

      if (response.success) {
        const enrichedMedia = UserProfileCache.enrichContentArray(response.media || []);
        const transformedMedia = enrichedMedia
          .map(transformApiResponseToMediaItem)
          .filter((item): item is MediaItem => item !== null);

        // Also update Zustand cache for backward compatibility
        const defaultKey = `${contentType || "ALL"}:page:${page || 1}`;
        useContentCacheStore.getState().set(defaultKey, {
          items: transformedMedia,
          page: response.page || page,
          limit: response.limit || limit,
          total: response.total || 0,
          fetchedAt: Date.now(),
        });

        const result = {
          media: transformedMedia,
          total: response.total || 0,
          page: response.page || page,
          limit: response.limit || limit,
          pages: Math.ceil((response.total || 0) / (response.limit || limit)),
        };

        // Sync stats to store
        syncMediaStatsToInteractionStore(result.media);

        if (!result.media.length) {
          const prev = queryClient.getQueryData<{
            media: MediaItem[];
            total: number;
            page: number;
            limit: number;
            pages: number;
          }>(["default-content", page, limit, contentType]);
          if (prev?.media?.length) {
            if (__DEV__) {
              console.warn(
                "⚠️ default-content returned empty; keeping previous feed items"
              );
            }
            return prev;
          }
        }

        return result;
      }

      throw new Error(response.error || "Failed to fetch content");
    },
    enabled: shouldFetchDefault,
    placeholderData: (prev) => prev,
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Extract data from React Query (0ms if cached!)
  // Stable empty fallback — `|| []` would allocate a new array every render and
  // retrigger feed memos/effects (Maximum update depth with hydrate).
  const allContent = allContentQuery.data?.media ?? EMPTY_MEDIA_LIST;
  const allContentTotal = allContentQuery.data?.total || 0;
  const defaultContent = defaultContentQuery.data?.media ?? EMPTY_MEDIA_LIST;
  const defaultContentPagination = {
    page: defaultContentQuery.data?.page || page,
    limit: defaultContentQuery.data?.limit || limit,
    total: defaultContentQuery.data?.total || 0,
    pages: defaultContentQuery.data?.pages || 0,
  };

  // Only skeleton when there is nothing renderable yet
  const hasAnyItems = allContent.length > 0 || defaultContent.length > 0;
  const allContentPending =
    (allContentQuery.isLoading || allContentQuery.isFetching) &&
    allContent.length === 0;
  const defaultContentPending =
    shouldFetchDefault &&
    (defaultContentQuery.isLoading ||
      defaultContentQuery.isFetching ||
      defaultContentQuery.isPending) &&
    defaultContent.length === 0;
  // Wait for primary (+ fallback if needed) before declaring empty
  const waitingOnFallback =
    shouldFetchDefault &&
    !defaultContentQuery.isFetched &&
    defaultContent.length === 0;
  const loading =
    !hasAnyItems &&
    (allContentPending || defaultContentPending || waitingOnFallback);

  // Error states
  const allContentError = allContentQuery.error
    ? (allContentQuery.error as Error).message
    : null;
  const defaultContentError = defaultContentQuery.error
    ? (defaultContentQuery.error as Error).message
    : null;
  const error = allContentError || defaultContentError;

  const hasContent = hasAnyItems;

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
              contentType: (() => {
                const api = normalizeListContentType(contentType);
                return api !== "ALL" ? api : undefined;
              })(),
            });
          } else {
            response = await mediaApi.getAllContentPublic({
              page: pageNum,
              limit: 20,
              contentType: (() => {
                const api = normalizeListContentType(contentType);
                return api !== "ALL" ? api : undefined;
              })(),
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

  // Legacy fetch function - now uses React Query internally
  const fetchDefaultContent = useCallback(
    async (params?: ContentFilter) => {
      const filter: ContentFilter = {
        page: params?.page || page,
        limit: params?.limit || limit,
        contentType: params?.contentType || contentType,
        search: params?.search,
      };

      // Use React Query to fetch (will be cached automatically)
      await queryClient.fetchQuery({
        queryKey: ["default-content", filter.page, filter.limit, filter.contentType, filter.search],
        queryFn: async () => {
          const response = await mediaApi.getDefaultContent(filter);

          if (response.success) {
            const enrichedMedia = UserProfileCache.enrichContentArray(response.media || []);
            const transformedMedia = enrichedMedia
              .map(transformApiResponseToMediaItem)
              .filter((item): item is MediaItem => item !== null);

            // Also update Zustand cache for backward compatibility
            const key = `${filter.contentType || "ALL"}:page:${filter.page || 1}`;
            useContentCacheStore.getState().set(key, {
              items: transformedMedia,
              page: filter.page || 1,
              limit: filter.limit || limit,
              total: response.total || 0,
              fetchedAt: Date.now(),
            });

            return {
              media: transformedMedia,
              total: response.total || 0,
              page: response.page || 1,
              limit: response.limit || limit,
              pages: Math.ceil((response.total || 0) / (response.limit || limit)),
            };
          }

          throw new Error(response.error || "Failed to fetch content");
        },
        staleTime: 15 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
      });
    },
    [queryClient, page, limit, contentType]
  );

  // Refresh all content using React Query (maintains cache)
  const refreshAllContent = useCallback(async () => {
    await allContentQuery.refetch();
  }, [allContentQuery]);

  // Load more content for infinite scroll (TODO: implement with infinite query)
  const loadMoreAllContent = useCallback(async () => {
    // For now, just refetch - can be enhanced with infinite query later
    if (allContentPending) return;
    await allContentQuery.refetch();
  }, [allContentQuery, allContentPending]);

  // Refresh default content using React Query
  const refreshDefaultContent = useCallback(async () => {
    await defaultContentQuery.refetch();
  }, [defaultContentQuery]);

  // Load more default content
  const loadMoreDefaultContent = useCallback(async () => {
    if (defaultContentPagination.page < defaultContentPagination.pages) {
      await fetchDefaultContent({
        page: defaultContentPagination.page + 1,
        limit,
        contentType: contentType !== "ALL" ? contentType : undefined,
      });
      // Prefetch the next page in background if available
      const next = defaultContentPagination.page + 2;
      if (next <= defaultContentPagination.pages) {
        fetchDefaultContent({
          page: next,
          limit,
          contentType: contentType !== "ALL" ? contentType : undefined,
        });
      }
    }
  }, [fetchDefaultContent, defaultContentPagination, limit, contentType]);

  // Load more content (alias for compatibility)
  const loadMoreContent = loadMoreDefaultContent;

  // Filter content by type
  const getFilteredContent = useCallback(
    (filter: ContentFilter) => {
      const sourceData = allContent.length > 0 ? allContent : defaultContent;
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
      error,
      hasContent,
      total: allContentTotal || defaultContentPagination.total,
      refreshAllContent,
      refreshDefaultContent,
      loadMoreContent,
      loadMoreAllContent,
      hasMorePages,
      getFilteredContent,
    }),
    [
      allContent,
      defaultContent,
      loading,
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
