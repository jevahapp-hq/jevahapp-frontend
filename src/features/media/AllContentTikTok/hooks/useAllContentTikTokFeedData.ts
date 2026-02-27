/**
 * useAllContentTikTokFeedData - Feed data, helpers, and hydration effects
 */
import { useCallback, useEffect, useMemo } from "react";
import { InteractionManager } from "react-native";
import { useInteractionStore } from "../../../../../app/store/useInteractionStore";
import { useLibraryStore } from "../../../../../app/store/useLibraryStore";
import { getPersistedStats, getViewed } from "../../../../../app/utils/persistentStorage";
import {
  categorizeContent,
  filterContentByType,
  getMostRecentItem,
} from "../../../../shared/utils/contentHelpers";
import type { ContentType, MediaItem } from "../../../../shared/types";

export interface UseAllContentTikTokFeedDataParams {
  mediaList: MediaItem[];
  contentType: ContentType | "ALL";
  setPreviouslyViewed: (v: any[]) => void;
  setIsLoadingContent: (v: boolean) => void;
}

export function useAllContentTikTokFeedData(
  params: UseAllContentTikTokFeedDataParams
) {
  const {
    mediaList,
    contentType,
    setPreviouslyViewed,
    setIsLoadingContent,
  } = params;

  const libraryStore = useLibraryStore();

  const filteredMediaList = useMemo(
    () => filterContentByType(mediaList, contentType),
    [mediaList, contentType]
  );

  const categorizedContent = useMemo(
    () => categorizeContent(filteredMediaList),
    [filteredMediaList]
  );

  const mostRecentItem = useMemo(() => {
    const allItems = [
      ...categorizedContent.videos,
      ...categorizedContent.music,
      ...categorizedContent.ebooks,
      ...categorizedContent.sermons,
    ];
    return getMostRecentItem(allItems);
  }, [categorizedContent]);

  const { firstFour, nextFour, rest } = useMemo(() => {
    const remaining = (filteredMediaList || []).filter(
      (item) => !mostRecentItem || item._id !== mostRecentItem._id
    );
    return {
      firstFour: remaining.slice(0, 4),
      nextFour: remaining.slice(4, 8),
      rest: remaining.slice(8),
    };
  }, [filteredMediaList, mostRecentItem]);

  // Hydrate liked/saved from feed
  useEffect(() => {
    const items = (filteredMediaList || []).slice(0, 50);
    if (items.length === 0) return;
    const withInteractions = items
      .filter((i) => i._id && (i.hasLiked === true || i.hasBookmarked === true))
      .map((i) => ({
        contentId: i._id!,
        hasLiked: i.hasLiked,
        hasBookmarked: i.hasBookmarked,
      }));
    if (withInteractions.length > 0) {
      useInteractionStore
        .getState()
        .hydrateUserInteractionsFromFeed(withInteractions);
    }
  }, [filteredMediaList]);

  // Load content stats
  useEffect(() => {
    const items = (filteredMediaList || []).slice(0, 16);
    if (items.length === 0) return;
    const ids = items.map((i) => i._id).filter(Boolean) as string[];
    const run = async () => {
      await new Promise((r) => setTimeout(r, 400));
      try {
        await useInteractionStore
          .getState()
          .loadBatchContentStats(ids, "media");
      } catch (e) {
        if (__DEV__)
          console.warn(
            "⚠️ Batch stats failed:",
            e instanceof Error ? e.message : e
          );
      }
    };
    InteractionManager.runAfterInteractions(() => run());
  }, [filteredMediaList]);

  // Load persisted data
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoadingContent(true);
      try {
        const [stats, viewed] = await Promise.all([
          getPersistedStats(),
          getViewed(),
          libraryStore.isLoaded
            ? Promise.resolve()
            : libraryStore.loadSavedItems(),
        ]);
        setPreviouslyViewed(viewed || []);
      } catch (error) {
        if (__DEV__) console.error("❌ Error loading AllContent data:", error);
      } finally {
        setIsLoadingContent(false);
      }
    };

    if (mediaList.length > 0) {
      InteractionManager.runAfterInteractions(() => loadAllData());
    } else {
      setIsLoadingContent(false);
    }
  }, [mediaList.length, setPreviouslyViewed, setIsLoadingContent, libraryStore]);

  return {
    filteredMediaList,
    categorizedContent,
    mostRecentItem,
    firstFour,
    nextFour,
    rest,
  };
}

export function useContentStatsHelpers(contentStats: Record<string, any>) {
  const getUserLikeState = useCallback(
    (contentId: string) =>
      contentStats[contentId]?.userInteractions?.liked || false,
    [contentStats]
  );

  const getLikeCount = useCallback(
    (contentId: string) => contentStats[contentId]?.likes || 0,
    [contentStats]
  );

  const getUserSaveState = useCallback(
    (contentId: string) =>
      contentStats[contentId]?.userInteractions?.saved || false,
    [contentStats]
  );

  const getSaveCount = useCallback(
    (contentId: string) => contentStats[contentId]?.saves || 0,
    [contentStats]
  );

  const getCommentCount = useCallback(
    (contentId: string) => contentStats[contentId]?.comments || 0,
    [contentStats]
  );

  return {
    getUserLikeState,
    getLikeCount,
    getUserSaveState,
    getSaveCount,
    getCommentCount,
  };
}
