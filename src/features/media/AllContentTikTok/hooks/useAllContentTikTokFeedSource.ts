import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useMedia } from "../../../../shared/hooks/useMedia";
import { useTypedCatalogInfiniteQuery } from "../../../../shared/media/useTypedCatalogInfiniteQuery";
import { canViewerSeeMedia } from "../../../../shared/media/moderationVisibility";
import type { ContentType, MediaItem } from "../../../../shared/types";
import {
    refreshFeedAfterDelete,
    removeMediaFromFeedCaches,
} from "../../../../shared/utils/removeMediaFromFeedCaches";

/**
 * ALL / VIDEO share the mixed discovery query (instant chip switch).
 * SERMON and E-BOOKS hit typed catalog endpoints so they never reuse a
 * videos-only fetcher or a `default-content` key without a queryFn.
 */
export function feedQueryContentType(tab: ContentType | "ALL"): ContentType | "ALL" {
  const t = String(tab || "ALL").toLowerCase();
  if (t === "all" || t === "video" || t === "videos") {
    return "ALL";
  }
  if (t === "e-books" || t === "ebook" || t === "ebooks") {
    return "books";
  }
  if (t === "teachings" || t === "teaching") {
    return "sermon";
  }
  return tab;
}

export function isTypedCatalogTab(tab: ContentType | "ALL"): boolean {
  const t = String(tab || "ALL").toLowerCase();
  return (
    t === "sermon" ||
    t === "teachings" ||
    t === "e-books" ||
    t === "ebook" ||
    t === "ebooks" ||
    t === "books"
  );
}

export function useAllContentTikTokFeedSource(options: {
  activeTab: ContentType | "ALL";
  useAuthFeed: boolean;
  /** Viewer id — unapproved content stays visible only to its uploader. */
  viewerId?: string | null;
}) {
  const { activeTab, useAuthFeed, viewerId } = options;
  const queryClient = useQueryClient();
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const catalogTab = isTypedCatalogTab(activeTab);
  const sermonTab =
    String(activeTab).toLowerCase() === "sermon" ||
    String(activeTab).toLowerCase() === "teachings";

  const {
    allContent,
    defaultContent,
    error: discoveryError,
    loading: feedLoading,
    refreshAllContent,
    getFilteredContent,
    hasContent,
    loadMoreAllContent,
    hasMorePages,
    isFetchingNextPage,
    serverRanked,
  } = useMedia({
    immediate: !catalogTab,
    contentType: catalogTab ? "ALL" : feedQueryContentType(activeTab),
    useAuth: useAuthFeed,
  });

  const catalog = useTypedCatalogInfiniteQuery({
    kind: sermonTab ? "sermon" : "ebook",
    enabled: catalogTab,
  });

  const handleDeleteSuccess = useCallback(
    (deleted?: MediaItem | { _id?: string; id?: string }) => {
      const id = String(deleted?._id || (deleted as any)?.id || "").trim();
      if (id) {
        setRemovedIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        removeMediaFromFeedCaches(queryClient, id);
      }
      refreshFeedAfterDelete(queryClient);
      if (catalogTab) {
        void catalog.refetch();
        return;
      }
      void refreshAllContent();
    },
    [queryClient, refreshAllContent, catalogTab, catalog.refetch]
  );

  const mediaList: MediaItem[] = useMemo(() => {
    const sourceData = catalogTab
      ? catalog.items
      : allContent.length > 0
        ? allContent
        : defaultContent;
    if (!sourceData || !Array.isArray(sourceData)) return [];

    return sourceData.filter((item) => {
      if (removedIds.has(String(item._id || (item as any).id || ""))) {
        return false;
      }
      return canViewerSeeMedia(item as any, viewerId);
    });
  }, [
    catalogTab,
    catalog.items,
    allContent,
    defaultContent,
    removedIds,
    viewerId,
  ]);

  const error = catalogTab
    ? catalog.error
    : discoveryError && !String(discoveryError).includes("Missing queryFn")
      ? discoveryError
      : null;

  return {
    mediaList,
    error,
    feedLoading: catalogTab ? catalog.isPending : feedLoading,
    refreshAllContent: catalogTab ? catalog.refetch : refreshAllContent,
    getFilteredContent,
    hasContent: catalogTab ? catalog.items.length > 0 : hasContent,
    loadMoreAllContent: catalogTab
      ? async () => {
          if (catalog.hasNextPage && !catalog.isFetchingNextPage) {
            await catalog.fetchNextPage();
          }
        }
      : loadMoreAllContent,
    hasMorePages: catalogTab ? catalog.hasNextPage : Boolean(hasMorePages),
    isFetchingNextPage: catalogTab
      ? catalog.isFetchingNextPage
      : Boolean(isFetchingNextPage),
    handleDeleteSuccess,
    serverRanked: catalogTab ? false : Boolean(serverRanked),
  };
}
