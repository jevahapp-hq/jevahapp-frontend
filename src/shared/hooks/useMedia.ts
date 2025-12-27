import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    isFresh,
    useContentCacheStore,
} from "../../../app/store/useContentCacheStore";
import { mediaApi } from "../../core/api/MediaApi";
import {
    ContentFilter,
    MediaItem,
    UseMediaOptions,
    UseMediaReturn,
} from "../types";
import { filterContentByType, transformApiResponseToMediaItem } from "../utils";
import { UserProfileCache } from "../../../app/utils/cache/UserProfileCache";

export const useMedia = (options: UseMediaOptions = {}): UseMediaReturn => {
  const {
    immediate = true,
    contentType = "ALL",
    page = 1,
    limit = 10,
  } = options;

  // Use React Query for all content (provides 0ms cache hits)
  const allContentQuery = useQuery({
    queryKey: ["all-content", contentType, 1, 50, false],
    queryFn: async () => {
      const response = await mediaApi.getAllContentPublic({
        page: 1,
        limit: 50,
        contentType: contentType !== "ALL" ? contentType : undefined,
      });

      if (response.success) {
        const enrichedMedia = await UserProfileCache.enrichContentArrayBatch(
          response.media || []
        );
        const transformedMedia = enrichedMedia
          .map(transformApiResponseToMediaItem)
          .filter((item): item is MediaItem => item !== null);

        // Also update Zustand cache for backward compatibility
        useContentCacheStore.getState().set("ALL:first", {
          items: transformedMedia,
          page: 1,
          limit: 50,
          total: response.total || response.pagination?.total || 0,
          fetchedAt: Date.now(),
        });

        return {
          media: transformedMedia,
          total: response.total || response.pagination?.total || 0,
        };
      }

      throw new Error(response.error || "Failed to fetch content");
    },
    enabled: immediate,
    staleTime: 30 * 60 * 1000, // 30 minutes - longer cache for better UX
    gcTime: 60 * 60 * 1000, // 60 minutes - keep in cache longer
    retry: 1,
    refetchOnMount: false, // ✅ Use cache if available - instant load when switching tabs
    refetchOnWindowFocus: false, // ✅ Don't refetch on focus - preserve user's current view
    refetchOnReconnect: false, // ✅ Don't refetch on reconnect - use cached data
  });

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
        const enrichedMedia = await UserProfileCache.enrichContentArrayBatch(
          response.media || []
        );
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

        return {
          media: transformedMedia,
          total: response.total || 0,
          page: response.page || page,
          limit: response.limit || limit,
          pages: Math.ceil((response.total || 0) / (response.limit || limit)),
        };
      }

      throw new Error(response.error || "Failed to fetch content");
    },
    enabled: immediate,
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
  const defaultContent = defaultContentQuery.data?.media || [];
  const defaultContentPagination = {
    page: defaultContentQuery.data?.page || page,
    limit: defaultContentQuery.data?.limit || limit,
    total: defaultContentQuery.data?.total || 0,
    pages: defaultContentQuery.data?.pages || 0,
  };

  // Loading states (only show loading if no cached data)
  const allContentLoading = allContentQuery.isLoading && allContent.length === 0;
  const defaultContentLoading = defaultContentQuery.isLoading && defaultContent.length === 0;
  const loading = allContentLoading || defaultContentLoading;
  
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
  const queryClient = useQueryClient();
  const fetchAllContent = useCallback(async (useAuth: boolean = false, pageNum: number = 1, append: boolean = false) => {
    // React Query handles this automatically - just refetch the query
    if (!append) {
      await allContentQuery.refetch();
    } else {
      // For append, fetch next page using queryClient
      await queryClient.fetchQuery({
        queryKey: ["all-content", contentType, pageNum, 50, useAuth],
        queryFn: async () => {
          let response;
          if (useAuth) {
            response = await mediaApi.getAllContentWithAuth({
              page: pageNum,
              limit: 50,
              contentType: contentType !== "ALL" ? contentType : undefined,
            });
          } else {
            response = await mediaApi.getAllContentPublic({
              page: pageNum,
              limit: 50,
              contentType: contentType !== "ALL" ? contentType : undefined,
            });
          }

          if (response.success) {
            const enrichedMedia = await UserProfileCache.enrichContentArrayBatch(
              response.media || []
            );
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
            const enrichedMedia = await UserProfileCache.enrichContentArrayBatch(
              response.media || []
            );
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
    if (allContentLoading) return;
    await allContentQuery.refetch();
  }, [allContentQuery, allContentLoading]);

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
    if (immediate) {
      // Test available endpoints first (non-blocking)
      mediaApi.testAvailableEndpoints();
    }
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
