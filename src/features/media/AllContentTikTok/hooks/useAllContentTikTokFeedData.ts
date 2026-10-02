/**
 * useAllContentTikTokFeedData - Feed data, helpers, and hydration effects
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInteractionStore } from "@/store/useInteractionStore";
import { useLibraryStore } from "@/store/useLibraryStore";
import { getPersistedStats, getViewed } from "../../../../../app/utils/persistentStorage";
import { getLiteStatsHydrateCount, isLiteProfileActive } from "../../../../shared/lite/liteProfile";
import type { ContentType, MediaItem } from "../../../../shared/types";
import { canonicalMediaFileUrl } from "../../../../shared/media/ownUploads";
import {
  categorizeContent,
  filterContentByType,
} from "../../../../shared/utils/contentHelpers";
import {
  mediaItemId,
  resolveMostRecentItem,
} from "../../../../shared/utils/mostRecentItem";

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
    const seenUrls = new Set<string>();
    const unique: MediaItem[] = [];
    for (const item of filtered) {
      const id = String(item._id || (item as any).id || "");
      const url = canonicalMediaFileUrl(item);
      const remoteUrl = url && !url.startsWith("file:") ? url : "";
      if (id && seen.has(id)) continue;
      if (remoteUrl && seenUrls.has(remoteUrl)) continue;
      if (id) seen.add(id);
      if (remoteUrl) seenUrls.add(remoteUrl);
      unique.push(item);
    }
    return unique;
  }, [mediaList, contentType, skipTypeFilter]);

  const categorizedContent = useMemo(
    () => categorizeContent(filteredMediaList),
    [filteredMediaList]
  );

  // Keep the real newest row. A reshuffled For You page must not swap it
  // for whichever item happens to be first, and a missing date must not win.
  const mostRecentPinRef = useRef<string | null>(null);
  const mostRecentTypeRef = useRef(contentType);
  if (mostRecentTypeRef.current !== contentType) {
    mostRecentTypeRef.current = contentType;
    mostRecentPinRef.current = null;
  }
  const stableMostRecentItem = resolveMostRecentItem(
    filteredMediaList,
    mostRecentPinRef.current
  );
  const stableMostRecentId = mediaItemId(stableMostRecentItem);
  if (stableMostRecentId && mostRecentPinRef.current !== stableMostRecentId) {
    mostRecentPinRef.current = stableMostRecentId;
  }

  const { firstFour, nextFour, rest } = useMemo(() => {
    const mostRecentId = stableMostRecentId || null;
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
  }, [filteredMediaList, stableMostRecentItem, stableMostRecentId]);

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
    requestIdleCallback(() => {
      void (async () => {
      try {
        await useInteractionStore
          .getState()
          .loadBatchContentStats(ids, "media");
        } catch {
          // Stats hydrate is best-effort; the feed already rendered.
        }
      })();
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
      requestIdleCallback(() => {
        void loadAllData();
      });
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

export function useContentStatsHelpers(_contentStats?: Record<string, any>) {
  const getUserLikeState = useCallback(
    (contentId: string) =>
      Boolean(
        useInteractionStore.getState().contentStats[contentId]?.userInteractions
          ?.liked
      ),
    []
  );

  const getLikeCount = useCallback(
    (contentId: string) =>
      useInteractionStore.getState().contentStats[contentId]?.likes || 0,
    []
  );

  const getUserSaveState = useCallback(
    (contentId: string) =>
      Boolean(
        useInteractionStore.getState().contentStats[contentId]?.userInteractions
          ?.saved
      ),
    []
  );

  const getSaveCount = useCallback(
    (contentId: string) =>
      useInteractionStore.getState().contentStats[contentId]?.saves || 0,
    []
  );

  const getCommentCount = useCallback(
    (contentId: string) =>
      useInteractionStore.getState().contentStats[contentId]?.comments || 0,
    []
  );

  return {
    getUserLikeState,
    getLikeCount,
    getUserSaveState,
    getSaveCount,
    getCommentCount,
  };
}
