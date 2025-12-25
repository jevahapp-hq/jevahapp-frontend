import { useCallback, useEffect, useMemo, useState } from "react";
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

export const useMedia = (options: UseMediaOptions = {}): UseMediaReturn => {
  const {
    immediate = true,
    contentType = "ALL",
    page = 1,
    limit = 10,
  } = options;

  // INSTANT CACHE LOADING - Load cache synchronously before first render
  const cacheStore = useContentCacheStore.getState();
  const cachedAll = cacheStore.get("ALL:first");
  const defaultKey = `${contentType || "ALL"}:page:${page || 1}`;
  const cachedDefault = cacheStore.get(defaultKey);

  // Initialize state with cached data immediately (no delay)
  const [allContent, setAllContent] = useState<MediaItem[]>(() => {
    if (cachedAll && isFresh("ALL:first")) {
      return cachedAll.items as any;
    }
    return [];
  });
  const [allContentLoading, setAllContentLoading] = useState(false);
  const [allContentError, setAllContentError] = useState<string | null>(null);
  const [allContentTotal, setAllContentTotal] = useState(() => {
    if (cachedAll && isFresh("ALL:first")) {
      return cachedAll.total || 0;
    }
    return 0;
  });

  // State for default content (paginated) - Initialize with cache
  const [defaultContent, setDefaultContent] = useState<MediaItem[]>(() => {
    if (cachedDefault && isFresh(defaultKey)) {
      return cachedDefault.items as any;
    }
    return [];
  });
  const [defaultContentLoading, setDefaultContentLoading] = useState(false);
  const [defaultContentError, setDefaultContentError] = useState<string | null>(
    null
  );
  const [defaultContentPagination, setDefaultContentPagination] = useState(() => {
    if (cachedDefault && isFresh(defaultKey)) {
      return {
        page: cachedDefault.page,
        limit: cachedDefault.limit,
        total: cachedDefault.total || 0,
        pages: Math.ceil(
          (cachedDefault.total || 0) / (cachedDefault.limit || 10)
        ),
      };
    }
    return {
      page: 1,
      limit: 10,
      total: 0,
      pages: 0,
    };
  });

  // Combined loading and error states - Don't show loading if we have cached content
  const loading = (allContentLoading || defaultContentLoading) && 
                  allContent.length === 0 && 
                  defaultContent.length === 0;
  const error = allContentError || defaultContentError;
  const hasContent = allContent.length > 0 || defaultContent.length > 0;

  // Fetch all content (TikTok-style endpoint)
  const fetchAllContent = useCallback(async (useAuth: boolean = false) => {
    setAllContentLoading(true);
    setAllContentError(null);

    try {
      if (__DEV__) console.log("🚀 useMedia: Fetching all content (useAuth:", useAuth, ")");

      let response;
      if (useAuth) {
        response = await mediaApi.getAllContentWithAuth();
      } else {
        response = await mediaApi.getAllContentPublic();
      }

      if (response.success) {
        const transformedMedia = (response.media || []).map(
          transformApiResponseToMediaItem
        );
        setAllContent(transformedMedia);
        // cache write-through
        useContentCacheStore.getState().set("ALL:first", {
          items: transformedMedia,
          page: 1,
          limit: response.limit || 10,
          total: response.total || 0,
          fetchedAt: Date.now(),
        });
        setAllContentTotal(response.total || 0);
        setAllContentLoading(false);
      } else {
        // Handle 401/402 authentication errors
        const isAuthError = 
          response.error?.includes("401") ||
          response.error?.includes("402") ||
          response.error?.includes("Unauthorized") ||
          response.error?.includes("UNAUTHORIZED") ||
          response.error?.includes("Authentication failed");
        
        if (isAuthError) {
          // For auth errors, try public endpoint as fallback
          if (__DEV__) {
            console.log("🔄 Auth failed, trying public endpoint...");
          }
          try {
            const publicResponse = await mediaApi.getAllContentPublic();
            if (publicResponse.success) {
              const transformedMedia = (publicResponse.media || []).map(
                transformApiResponseToMediaItem
              );
              setAllContent(transformedMedia);
              setAllContentTotal(publicResponse.total || 0);
              setAllContentLoading(false);
              return; // Success with public endpoint
            }
          } catch (fallbackError) {
            if (__DEV__) {
              console.warn("⚠️ Public endpoint also failed:", fallbackError);
            }
          }
          // If both fail, set a user-friendly error message
          setAllContentError("Session expired. Please login again.");
          setAllContentLoading(false);
        } else {
          // Handle network errors gracefully
          const isNetworkError = response.error?.includes("Network unavailable");
          
          if (isNetworkError) {
            // Network error - keep existing content, just stop loading
            setAllContentLoading(false);
            // Don't set error state for network failures
          } else {
            if (__DEV__) {
              console.error(
                "❌ useMedia: Failed to fetch all content:",
                response.error
              );
            }
            // Clean up error message - don't show raw status codes
            const cleanError = response.error?.replace(/^\d+\s*/, "") || "Failed to fetch content";
            setAllContentError(cleanError);
            setAllContentLoading(false);
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Handle 401/402 authentication errors
      const isAuthError = 
        errorMessage.includes("401") ||
        errorMessage.includes("402") ||
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("UNAUTHORIZED") ||
        errorMessage.includes("Authentication failed");
      
      if (isAuthError) {
        // Try public endpoint as fallback
        try {
          const publicResponse = await mediaApi.getAllContentPublic();
          if (publicResponse.success) {
            const transformedMedia = (publicResponse.media || []).map(
              transformApiResponseToMediaItem
            );
            setAllContent(transformedMedia);
            setAllContentTotal(publicResponse.total || 0);
            setAllContentLoading(false);
            return; // Success with public endpoint
          }
        } catch (fallbackError) {
          if (__DEV__) {
            console.warn("⚠️ Public endpoint also failed:", fallbackError);
          }
        }
        // If both fail, set a user-friendly error message
        setAllContentError("Session expired. Please login again.");
        setAllContentLoading(false);
      } else {
        const isNetworkError = 
          errorMessage.includes("Network request failed") ||
          errorMessage.includes("Failed to fetch") ||
          errorMessage.includes("NetworkError");
        
        if (isNetworkError) {
          // Network error - keep existing content, just stop loading
          setAllContentLoading(false);
          // Don't set error state for network failures
        } else {
          if (__DEV__) {
            console.error(
              "❌ useMedia: Exception while fetching all content:",
              error
            );
          }
          // Clean up error message - don't show raw status codes
          const cleanError = errorMessage.replace(/^\d+\s*/, "") || "Failed to fetch content";
          setAllContentError(cleanError);
          setAllContentLoading(false);
        }
      }
    }
  }, []);

  // Fetch default content (paginated)
  const fetchDefaultContent = useCallback(
    async (params?: ContentFilter) => {
      setDefaultContentLoading(true);
      setDefaultContentError(null);

      try {
        if (__DEV__) {
          console.log("🚀 useMedia: Fetching default content:", params);
        }

        const filter: ContentFilter = {
          page: params?.page || page,
          limit: params?.limit || limit,
          contentType: params?.contentType || contentType,
          search: params?.search,
        };

        const response = await mediaApi.getDefaultContent(filter);

        if (response.success) {
          const transformedMedia = (response.media || []).map(
            transformApiResponseToMediaItem
          );

          if (filter.page && filter.page > 1) {
            // Append to existing content for pagination
            setDefaultContent((prev) => [...prev, ...transformedMedia]);
          } else {
            // Replace content for refresh or first load
            setDefaultContent(transformedMedia);
          }

          // cache write-through by contentType key
          const key = `${filter.contentType || "ALL"}:page:${filter.page || 1}`;
          useContentCacheStore.getState().set(key, {
            items: transformedMedia,
            page: filter.page || 1,
            limit: filter.limit || limit,
            total: response.total || 0,
            fetchedAt: Date.now(),
          });

          setDefaultContentPagination({
            page: response.page || 1,
            limit: response.limit || 10,
            total: response.total || 0,
            pages: Math.ceil((response.total || 0) / (response.limit || 10)),
          });

          setDefaultContentLoading(false);
        } else {
          // Handle 401/402 authentication errors
          const isAuthError = 
            response.error?.includes("401") ||
            response.error?.includes("402") ||
            response.error?.includes("Unauthorized") ||
            response.error?.includes("UNAUTHORIZED") ||
            response.error?.includes("Authentication failed");
          
          if (isAuthError) {
            // Set a user-friendly error message for auth errors
            setDefaultContentError("Session expired. Please login again.");
            setDefaultContentLoading(false);
          } else {
            // Handle network errors gracefully
            const isNetworkError = response.error?.includes("Network unavailable");
            
            if (isNetworkError) {
              // Network error - keep existing content, just stop loading
              setDefaultContentLoading(false);
              // Don't set error state for network failures
            } else {
              if (__DEV__) {
                console.error(
                  "❌ useMedia: Failed to fetch default content:",
                  response.error
                );
              }
              // Clean up error message - don't show raw status codes
              const cleanError = response.error?.replace(/^\d+\s*/, "") || "Failed to fetch content";
              setDefaultContentError(cleanError);
              setDefaultContentLoading(false);
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Handle 401/402 authentication errors
        const isAuthError = 
          errorMessage.includes("401") ||
          errorMessage.includes("402") ||
          errorMessage.includes("Unauthorized") ||
          errorMessage.includes("UNAUTHORIZED") ||
          errorMessage.includes("Authentication failed");
        
        if (isAuthError) {
          // Set a user-friendly error message for auth errors
          setDefaultContentError("Session expired. Please login again.");
          setDefaultContentLoading(false);
        } else {
          const isNetworkError = 
            errorMessage.includes("Network request failed") ||
            errorMessage.includes("Failed to fetch") ||
            errorMessage.includes("NetworkError");
          
          if (isNetworkError) {
            // Network error - keep existing content, just stop loading
            setDefaultContentLoading(false);
            // Don't set error state for network failures
          } else {
            if (__DEV__) {
              console.error(
                "❌ useMedia: Exception while fetching default content:",
                error
              );
            }
            // Clean up error message - don't show raw status codes
            const cleanError = errorMessage.replace(/^\d+\s*/, "") || "Failed to fetch content";
            setDefaultContentError(cleanError);
            setDefaultContentLoading(false);
          }
        }
      }
    },
    [page, limit, contentType]
  );

  // Refresh all content
  const refreshAllContent = useCallback(async () => {
    try {
      // Try authenticated first, fallback to public
      await fetchAllContent(true);
    } catch (error) {
      if (__DEV__) console.log("🔄 Auth failed, trying public endpoint...");
      await fetchAllContent(false);
    }
  }, [fetchAllContent]);

  // Refresh default content
  const refreshDefaultContent = useCallback(async () => {
    await fetchDefaultContent({ page: 1, limit });
  }, [fetchDefaultContent, limit]);

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

  // Initialize content on mount if immediate is true
  // Cache is already loaded synchronously above, so we just refresh in background
  useEffect(() => {
    if (immediate) {
      // Test available endpoints first (non-blocking)
      mediaApi.testAvailableEndpoints();

      // Background revalidate - fetch fresh data without blocking UI
      // Content is already shown from cache if available
      Promise.all([
        refreshAllContent().catch(() => {}), // Don't block on errors
        fetchDefaultContent({ page, limit, contentType }).catch(() => {}),
      ]);
    }
  }, [immediate, refreshAllContent, page, limit, contentType]);

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
