import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useMedia } from "../../../../shared/hooks/useMedia";
import type { ContentType, MediaItem } from "../../../../shared/types";
import {
    refreshFeedAfterDelete,
    removeMediaFromFeedCaches,
} from "../../../../shared/utils/removeMediaFromFeedCaches";

/** Home chips share the ALL infinite query, then filter locally (instant tab switch). */
export function feedQueryContentType(tab: ContentType | "ALL"): ContentType | "ALL" {
  const t = String(tab || "ALL").toLowerCase();
  if (
    t === "all" ||
    t === "video" ||
    t === "videos" ||
    t === "sermon" ||
    t === "e-books" ||
    t === "ebook" ||
    t === "ebooks" ||
    t === "books"
  ) {
    return "ALL";
  }
  return tab;
}

export function useAllContentTikTokFeedSource(options: {
  activeTab: ContentType | "ALL";
  useAuthFeed: boolean;
}) {
  const { activeTab, useAuthFeed } = options;
  const queryClient = useQueryClient();
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());

  const {
    allContent,
    defaultContent,
    error,
    loading: feedLoading,
    refreshAllContent,
    getFilteredContent,
    hasContent,
    loadMoreAllContent,
    hasMorePages,
    isFetchingNextPage,
    serverRanked,
  } = useMedia({
    immediate: true,
    contentType: feedQueryContentType(activeTab),
    useAuth: useAuthFeed,
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
      void refreshAllContent();
    },
    [queryClient, refreshAllContent]
  );

  const mediaList: MediaItem[] = useMemo(() => {
    const sourceData = allContent.length > 0 ? allContent : defaultContent;
    if (!sourceData || !Array.isArray(sourceData)) return [];
    if (removedIds.size === 0) return sourceData;
    return sourceData.filter(
      (item) => !removedIds.has(String(item._id || (item as any).id || ""))
    );
  }, [allContent, defaultContent, removedIds]);

  return {
    mediaList,
    error,
    feedLoading,
    refreshAllContent,
    getFilteredContent,
    hasContent,
    loadMoreAllContent,
    hasMorePages: Boolean(hasMorePages),
    isFetchingNextPage: Boolean(isFetchingNextPage),
    handleDeleteSuccess,
    serverRanked: Boolean(serverRanked),
  };
}
