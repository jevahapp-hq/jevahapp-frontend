/**
 * useAllContentTikTokFeedData - Feed data, helpers, and hydration effects
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { InteractionManager } from "react-native";
import { useInteractionStore } from "@/store/useInteractionStore";
import { useLibraryStore } from "@/store/useLibraryStore";
import { getPersistedStats, getViewed } from "../../../../../app/utils/persistentStorage";
import { getLiteStatsHydrateCount, isLiteProfileActive } from "../../../../shared/lite/liteProfile";
import type { ContentType, MediaItem } from "../../../../shared/types";
import {
  categorizeContent,
  filterContentByType,
  getMostRecentItem,
} from "../../../../shared/utils/contentHelpers";

export interface UseAllContentTikTokFeedDataParams {
  mediaList: MediaItem[];
  contentType: ContentType | "ALL";
  /** Caller already curated this tab's list — don't filter by type again. */
  skipTypeFilter?: boolean;
  setPreviouslyViewed: (v: any[]) => void;
  setIsLoadingContent: (v: boolean) => void;
}

export function useAllContentTikTokFeedData(
  params: UseAllContentTikTokFeedDataParams
) {
  const {
    mediaList,
    contentType,
    skipTypeFilter = false,
    setPreviouslyViewed,
    setIsLoadingContent,
  } = params;

  const libraryStore = useLibraryStore();

  const filteredMediaList = useMemo(() => {
    const filtered = skipTypeFilter
      ? mediaList
      : filterContentByType(mediaList, contentType);
    // Dedupe by id — duplicate rows silently disappear in FlashList under
    // Coming Soon (same key twice → later cells dropped).
    const seen = new Set<string>();
    const unique: MediaItem[] = [];
    for (const item of filtered) {
      const id = String(item._id || (item as any).id || item.fileUrl || "");
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      unique.push(item);
    }
    return unique;
  }, [mediaList, contentType, skipTypeFilter]);

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

  // Sticky most-recent for this contentType session so Coming Soon `rest`
  // doesn't reshuffle when the feed order jitters on refetch.
  const stickyMostRecentIdRef = useRef<string | null>(null);
  const stickyContentTypeRef = useRef(contentType);
  if (stickyContentTypeRef.current !== contentType) {
    stickyContentTypeRef.current = contentType;
    stickyMostRecentIdRef.current = null;
  }
  const incomingMostRecentId =
    mostRecentItem?._id || (mostRecentItem as any)?.id || null;
  if (!stickyMostRecentIdRef.current && incomingMostRecentId) {
    stickyMostRecentIdRef.current = String(incomingMostRecentId);
  }
  const stickyMostRecentId = stickyMostRecentIdRef.current;

  const stableMostRecentItem = useMemo(() => {
    if (!stickyMostRecentId) return mostRecentItem;
    const match = (filteredMediaList || []).find(
      (item) => String(item._id || (item as any).id || "") === stickyMostRecentId
    );
    return match || mostRecentItem;
  }, [filteredMediaList, mostRecentItem, stickyMostRecentId]);

  const { firstFour, nextFour, rest } = useMemo(() => {
    const mostRecentId =
      stableMostRecentItem?._id ||
      (stableMostRecentItem as any)?.id ||
      stickyMostRecentId ||
      null;
    const remaining = (filteredMediaList || []).filter((item) => {
      if (!mostRecentId) return true;
      const id = item._id || (item as any).id;
      return String(id || "") !== String(mostRecentId);
    });
    return {
      firstFour: remaining.slice(0, 4),
      nextFour: [],
      rest: remaining.slice(4),
    };
  }, [filteredMediaList, stableMostRecentItem, stickyMostRecentId]);

  // Hydrate liked/saved from feed
  useEffect(() => {
    const items = (filteredMediaList || []).slice(
      0,
      isLiteProfileActive() ? 12 : 50
    );
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

  // Load content stats (runs async, doesn't block rendering)
  useEffect(() => {
    const items = (filteredMediaList || []).slice(0, getLiteStatsHydrateCount());
    if (items.length === 0) return;
    const ids = items.map((i) => i._id).filter(Boolean) as string[];
    InteractionManager.runAfterInteractions(async () => {
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
    });
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
    mostRecentItem: stableMostRecentItem,
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
