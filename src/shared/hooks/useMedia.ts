import { useCallback, useMemo } from "react";
import { FEED_PAGE_SIZE, getFeedPageSize } from "../config/feedCachePolicy";
import { useAllContentInfiniteQuery } from "../media/useAllContentInfiniteQuery";
import { useDefaultContentQuery } from "../media/useDefaultContentQuery";
import {
    ContentFilter,
    UseMediaOptions,
    UseMediaReturn,
} from "../types";
import { filterContentByType } from "../utils";

export { fetchAllContentPublic } from "../media/fetchAllContentPage";
export { useContentItem } from "../media/useContentItem";
export { useContentStats } from "../media/useContentStats";

export const useMedia = (options: UseMediaOptions = {}): UseMediaReturn => {
  const {
    immediate = true,
    contentType = "ALL",
    page = 1,
    limit: limitOpt,
    useAuth = false,
  } = options;

  const limit = limitOpt ?? getFeedPageSize();

  const {
    query: allContentQuery,
    allContent,
    total: allContentTotal,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchAllContent,
    serverRanked,
  } = useAllContentInfiniteQuery({
    contentType,
    limit,
    useAuth,
    enabled: immediate,
  });

  const allContentEarly = allContent;
  const allContentStatus =
    (allContentQuery.error as { status?: number } | null)?.status ??
    Number(
      String((allContentQuery.error as Error | null)?.message || "").match(
        /\b(429)\b/
      )?.[1] || 0
    );
  const rateLimited = allContentStatus === 429;
  const shouldFetchDefault =
    immediate &&
    !rateLimited &&
    (allContentQuery.isError ||
      (allContentQuery.isFetched && allContentEarly.length === 0));

  const {
    query: defaultContentQuery,
    defaultContent,
    pagination: defaultContentPagination,
    fetchDefaultContent,
    refetch: refetchDefaultContent,
  } = useDefaultContentQuery({
    enabled: shouldFetchDefault,
    page,
    limit,
    contentType,
  });

  const hasAnyItems = allContent.length > 0 || defaultContent.length > 0;
  // Never treat "background refetch with seeded data" as a loading screen.
  const allContentPending =
    allContentQuery.isPending &&
    allContent.length === 0 &&
    !allContentQuery.isFetchingNextPage &&
    !allContentQuery.data;
  const defaultContentPending =
    shouldFetchDefault &&
    defaultContentQuery.isPending &&
    defaultContent.length === 0 &&
    !defaultContentQuery.data;
  const waitingOnFallback =
    shouldFetchDefault &&
    !defaultContentQuery.isFetched &&
    defaultContent.length === 0 &&
    !hasAnyItems;
  const loading =
    !hasAnyItems &&
    (allContentPending || defaultContentPending || waitingOnFallback);

  const allContentError = allContentQuery.error
    ? (allContentQuery.error as Error).message
    : null;
  const defaultContentError = defaultContentQuery.error
    ? (defaultContentQuery.error as Error).message
    : null;
  const error = allContentError || defaultContentError;
  const hasContent = hasAnyItems;

  const refreshAllContent = useCallback(async () => {
    await refetchAllContent();
  }, [refetchAllContent]);

  const loadMoreAllContent = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const refreshDefaultContent = useCallback(async () => {
    await refetchDefaultContent();
  }, [refetchDefaultContent]);

  const loadMoreDefaultContent = useCallback(async () => {
    if (defaultContentPagination.page < defaultContentPagination.pages) {
      await fetchDefaultContent({
        page: defaultContentPagination.page + 1,
        limit,
        contentType: contentType !== "ALL" ? contentType : undefined,
      });
      const next = defaultContentPagination.page + 2;
      if (next <= defaultContentPagination.pages) {
        void fetchDefaultContent({
          page: next,
          limit,
          contentType: contentType !== "ALL" ? contentType : undefined,
        });
      }
    }
  }, [fetchDefaultContent, defaultContentPagination, limit, contentType]);

  const loadMoreContent = useCallback(async () => {
    if (allContent.length > 0) {
      await loadMoreAllContent();
      return;
    }
    await loadMoreDefaultContent();
  }, [allContent.length, loadMoreAllContent, loadMoreDefaultContent]);

  const getFilteredContent = useCallback(
    (filter: ContentFilter) => {
      const sourceData = allContent.length > 0 ? allContent : defaultContent;
      return filterContentByType(sourceData, filter.contentType || "ALL");
    },
    [allContent, defaultContent]
  );

  const defaultContentLoading =
    shouldFetchDefault &&
    defaultContentQuery.isPending &&
    defaultContent.length === 0;
  const isLoadingMore =
    Boolean(isFetchingNextPage) ||
    (defaultContentQuery.isFetching && defaultContent.length > 0);
  const hasMoreDefaultPages =
    Boolean(hasNextPage) ||
    defaultContentPagination.page < defaultContentPagination.pages;

  return useMemo(
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
      hasMorePages: hasNextPage,
      isFetchingNextPage,
      getFilteredContent,
      serverRanked: Boolean(serverRanked),
      isLoadingMore,
      hasMoreDefaultPages,
      defaultContentLoading,
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
      hasNextPage,
      isFetchingNextPage,
      getFilteredContent,
      serverRanked,
      isLoadingMore,
      hasMoreDefaultPages,
      defaultContentLoading,
    ]
  );
};
