import { useCallback, useMemo } from "react";
import { FEED_PAGE_SIZE } from "../config/feedCachePolicy";
import { fetchAllContentPublic } from "../media/fetchAllContentPage";
import { useAllContentInfiniteQuery } from "../media/useAllContentInfiniteQuery";
import { useDefaultContentQuery } from "../media/useDefaultContentQuery";
import {
  ContentFilter,
  UseMediaOptions,
  UseMediaReturn,
} from "../types";
import { filterContentByType } from "../utils";

export { fetchAllContentPublic } from "../media/fetchAllContentPage";
export { useContentStats } from "../media/useContentStats";
export { useContentItem } from "../media/useContentItem";

export const useMedia = (options: UseMediaOptions = {}): UseMediaReturn => {
  const {
    immediate = true,
    contentType = "ALL",
    page = 1,
    limit = FEED_PAGE_SIZE,
    useAuth = false,
  } = options;

  const {
    query: allContentQuery,
    allContent,
    total: allContentTotal,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchAllContent,
  } = useAllContentInfiniteQuery({
    contentType,
    limit,
    useAuth,
    enabled: immediate,
  });

  const allContentEarly = allContent;
  const shouldFetchDefault =
    immediate &&
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
  const allContentPending =
    (allContentQuery.isLoading || allContentQuery.isFetching) &&
    allContent.length === 0 &&
    !isFetchingNextPage;
  const defaultContentPending =
    shouldFetchDefault &&
    (defaultContentQuery.isLoading ||
      defaultContentQuery.isFetching ||
      defaultContentQuery.isPending) &&
    defaultContent.length === 0;
  const waitingOnFallback =
    shouldFetchDefault &&
    !defaultContentQuery.isFetched &&
    defaultContent.length === 0;
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

  const loadMoreContent = loadMoreDefaultContent;

  const getFilteredContent = useCallback(
    (filter: ContentFilter) => {
      const sourceData = allContent.length > 0 ? allContent : defaultContent;
      return filterContentByType(sourceData, filter.contentType || "ALL");
    },
    [allContent, defaultContent]
  );

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
    ]
  );
};
