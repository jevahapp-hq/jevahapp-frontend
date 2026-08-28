import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useMedia } from "../../../../shared/hooks/useMedia";
import { canViewerSeeMedia } from "../../../../shared/media/moderationVisibility";
import type { ContentType, MediaItem } from "../../../../shared/types";
import {
    refreshFeedAfterDelete,
    removeMediaFromFeedCaches,
} from "../../../../shared/utils/removeMediaFromFeedCaches";

/**
 * ALL / VIDEO share the mixed discovery query (instant chip switch).
 * SERMON and E-BOOKS must hit the list API with their own type — For You
 * pages are video-heavy, so local filtering of ALL looks empty even when
 * the user has sermons and default-content ebooks.
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

export function useAllContentTikTokFeedSource(options: {
  activeTab: ContentType | "ALL";
  useAuthFeed: boolean;
  /** Viewer id — unapproved content stays visible only to its uploader. */
  viewerId?: string | null;
}) {
  const { activeTab, useAuthFeed, viewerId } = options;
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

    /**
     * Single chokepoint for feed visibility. Unapproved content is dropped for
     * everyone except its uploader, who keeps seeing it so they can delete it.
     *
     * Nothing filtered on moderation state before this — the only gate was a
     * per-card `rejected` check in ContentItemRenderer, so `under_review` and
     * `pending` items rendered as normal cards for every user.
     */
    return sourceData.filter((item) => {
      if (removedIds.has(String(item._id || (item as any).id || ""))) {
        return false;
      }
      return canViewerSeeMedia(item as any, viewerId);
    });
  }, [allContent, defaultContent, removedIds, viewerId]);

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
