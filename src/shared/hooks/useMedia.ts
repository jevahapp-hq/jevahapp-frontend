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

  // State for all content (TikTok-style)
  const [allContent, setAllContent] = useState<MediaItem[]>([]);
  const [allContentLoading, setAllContentLoading] = useState(false);
  const [allContentError, setAllContentError] = useState<string | null>(null);
  const [allContentTotal, setAllContentTotal] = useState(0);

  // State for default content (paginated)
  const [defaultContent, setDefaultContent] = useState<MediaItem[]>([]);
  const [defaultContentLoading, setDefaultContentLoading] = useState(false);
  const [defaultContentError, setDefaultContentError] = useState<string | null>(
    null
  );
  const [defaultContentPagination, setDefaultContentPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Combined loading and error states
  const loading = allContentLoading || defaultContentLoading;
  const error = allContentError || defaultContentError;
  const hasContent = allContent.length > 0 || defaultContent.length > 0;

  // Fetch all content (TikTok-style endpoint)
  const fetchAllContent = useCallback(async (useAuth: boolean = false) => {
    setAllContentLoading(true);
    setAllContentError(null);

    try {
      console.log("🚀 useMedia: Fetching all content (useAuth:", useAuth, ")");

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
        console.error(
          "❌ useMedia: Failed to fetch all content:",
          response.error
        );
        setAllContentError(response.error || "Failed to fetch all content");
        setAllContentLoading(false);
      }
    } catch (error) {
      console.error(
        "❌ useMedia: Exception while fetching all content:",
        error
      );
      setAllContentError(
        error instanceof Error ? error.message : "Unknown error"
      );
      setAllContentLoading(false);
    }
  }, []);

  // Fetch default content (paginated)
  const fetchDefaultContent = useCallback(
    async (params?: ContentFilter) => {
      setDefaultContentLoading(true);
      setDefaultContentError(null);

      try {
        console.log("🚀 useMedia: Fetching default content:", params);

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
          console.error(
            "❌ useMedia: Failed to fetch default content:",
            response.error
          );
          setDefaultContentError(
            response.error || "Failed to fetch default content"
          );
          setDefaultContentLoading(false);
        }
      } catch (error) {
        console.error(
          "❌ useMedia: Exception while fetching default content:",
          error
        );
        setDefaultContentError(
          error instanceof Error ? error.message : "Unknown error"
        );
        setDefaultContentLoading(false);
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
      console.log("🔄 Auth failed, trying public endpoint...");
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
  useEffect(() => {
    if (immediate) {
      console.log("🚀 useMedia: Initializing with immediate load");

      // Test available endpoints first
      mediaApi.testAvailableEndpoints();

      // Hydrate from cache instantly if fresh; then background revalidate
      const cachedAll = useContentCacheStore.getState().get("ALL:first");
      if (cachedAll && isFresh("ALL:first")) {
        setAllContent(cachedAll.items as any);
        setAllContentTotal(cachedAll.total || 0);
      }
      const defaultKey = `${contentType || "ALL"}:page:${page || 1}`;
      const cachedDefault = useContentCacheStore.getState().get(defaultKey);
      if (cachedDefault && isFresh(defaultKey)) {
        setDefaultContent(cachedDefault.items as any);
        setDefaultContentPagination((p) => ({
          ...p,
          page: cachedDefault.page,
          limit: cachedDefault.limit,
          total: cachedDefault.total || 0,
          pages: Math.ceil(
            (cachedDefault.total || 0) / (cachedDefault.limit || 10)
          ),
        }));
      }

      // Background revalidate
      refreshAllContent();
      fetchDefaultContent({ page, limit, contentType });
    }
  }, [immediate, refreshAllContent]);

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
