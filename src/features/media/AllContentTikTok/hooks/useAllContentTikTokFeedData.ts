/**
 * useAllContentTikTokFeedData - Feed data, helpers, and hydration effects
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { InteractionManager } from "react-native";
import { useInteractionStore } from "../../../../../app/store/useInteractionStore";
import { useLibraryStore } from "../../../../../app/store/useLibraryStore";
import { toBatchMetadataItem } from "../../../../../app/utils/engagementHelpers";
import { getPersistedStats, getViewed } from "../../../../../app/utils/persistentStorage";
import type { ContentType, MediaItem } from "../../../../shared/types";
import {
  categorizeContent,
  filterContentByType,
} from "../../../../shared/utils/contentHelpers";
import {
  getFeedImpressions,
  getOrCreateSessionSeed,
  idsSeenToday,
  markFeedImpressions,
} from "../utils/feedImpressionStore";
import {
  pickMostRecentItem,
  rankFeedForYou,
} from "../utils/rankFeedForYou";

export interface UseAllContentTikTokFeedDataParams {
  mediaList: MediaItem[];
  contentType: ContentType | "ALL";
  setPreviouslyViewed: (v: any[]) => void;
  setIsLoadingContent: (v: boolean) => void;
  previouslyViewed?: any[];
}

export function useAllContentTikTokFeedData(
  params: UseAllContentTikTokFeedDataParams
) {
  const {
    mediaList,
    contentType,
    setPreviouslyViewed,
    setIsLoadingContent,
    previouslyViewed = [],
  } = params;

  const libraryStore = useLibraryStore();
  const [seenTodayIds, setSeenTodayIds] = useState<Set<string>>(new Set());
  const [sessionSeed, setSessionSeed] = useState<number>(1);
  const [impressionsReady, setImpressionsReady] = useState(false);
  const [affinity, setAffinity] = useState<
    import("../utils/feedAffinityStore").FeedAffinityProfile | undefined
  >(undefined);

  // Load cross-session impressions + rotate seed once per cold start
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getFeedAffinity } = await import("../utils/feedAffinityStore");
        const [map, seed, aff] = await Promise.all([
          getFeedImpressions(),
          getOrCreateSessionSeed(),
          getFeedAffinity(),
        ]);
        if (cancelled) return;
        setSeenTodayIds(idsSeenToday(map));
        setSessionSeed(seed);
        setAffinity(aff);
      } catch {
        // no-op
      } finally {
        if (!cancelled) setImpressionsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredByType = useMemo(
    () => filterContentByType(mediaList, contentType),
    [mediaList, contentType]
  );

  const previouslyViewedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of previouslyViewed || []) {
      if (typeof entry === "string") ids.add(entry);
      else if (entry?._id) ids.add(String(entry._id));
      else if (entry?.id) ids.add(String(entry.id));
      else if (entry?.contentId) ids.add(String(entry.contentId));
    }
    return ids;
  }, [previouslyViewed]);

  // For You ranking — wait for impression state so relaunch rotation is correct
  const filteredMediaList = useMemo(() => {
    if (!impressionsReady && filteredByType.length > 0) {
      return rankFeedForYou(filteredByType, {
        previouslyViewedIds,
        sessionSeed,
        affinity,
      });
    }
    return rankFeedForYou(filteredByType, {
      previouslyViewedIds,
      seenTodayIds,
      sessionSeed,
      affinity,
    });
  }, [
    filteredByType,
    previouslyViewedIds,
    seenTodayIds,
    sessionSeed,
    impressionsReady,
    affinity,
  ]);

  const categorizedContent = useMemo(
    () => categorizeContent(filteredByType),
    [filteredByType]
  );

  // Shelf: newest upload stays "Most Recent"; ranked list powers For You
  const mostRecentItem = useMemo(
    () => pickMostRecentItem(filteredByType),
    [filteredByType]
  );

  const { firstFour, nextFour, rest } = useMemo(() => {
    const remaining = (filteredMediaList || []).filter(
      (item) => !mostRecentItem || item._id !== mostRecentItem._id
    );
    return {
      firstFour: remaining.slice(0, 4),
      nextFour: [] as MediaItem[],
      rest: remaining.slice(4),
    };
  }, [filteredMediaList, mostRecentItem]);

  // Persist impressions for next launch — do not mutate seenTodayIds mid-session
  // (that would re-rank and jump the feed while the user is scrolling).
  useEffect(() => {
    const ids = [
      mostRecentItem?._id,
      ...firstFour.map((i) => i._id),
      ...rest.slice(0, 6).map((i) => i._id),
    ]
      .filter(Boolean)
      .map(String);

    if (ids.length === 0) return;

    const timer = setTimeout(() => {
      void markFeedImpressions(ids);
    }, 2800);

    return () => clearTimeout(timer);
  }, [mostRecentItem?._id, firstFour, rest]);

  // Hydrate liked/saved + counts from feed immediately (no InteractionManager delay)
  useEffect(() => {
    const items = (filteredMediaList || []).slice(0, 40);
    if (items.length === 0) return;

    const withInteractions = items
      .filter((i) => i._id)
      .map((i) => ({
        contentId: i._id!,
        hasLiked: i.hasLiked,
        hasBookmarked: i.hasBookmarked,
        likes: i.likeCount ?? i.totalLikes ?? i.likes ?? i.favorite ?? 0,
        saves: i.saves ?? i.saved ?? 0,
        comments: i.commentCount ?? i.comments ?? i.comment ?? 0,
        views: i.viewCount ?? i.totalViews ?? i.views ?? 0,
      }));

    if (withInteractions.length > 0) {
      useInteractionStore
        .getState()
        .hydrateUserInteractionsFromFeed(withInteractions);
    }
  }, [filteredMediaList]);

  // Restore persisted like/save flags ASAP so relaunch doesn't flash gray then red
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          getPersistedContentInteractions,
        } = await import(
          "../../../../../app/utils/contentInteractionPersist"
        );
        const map = await getPersistedContentInteractions();
        if (cancelled || !map || Object.keys(map).length === 0) return;

        const items = Object.entries(map).map(([contentId, v]) => ({
          contentId,
          hasLiked: v.liked,
          hasBookmarked: v.saved,
          likes: v.likes,
          saves: v.saves,
          comments: v.comments,
          views: v.views,
        }));
        useInteractionStore.getState().hydrateUserInteractionsFromFeed(items);
      } catch {
        // no-op
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load content stats (runs async, doesn't block rendering)
  useEffect(() => {
    const items = (filteredMediaList || []).slice(0, 8);
    if (items.length === 0) return;

    const knownStats = useInteractionStore.getState().contentStats;
    const batchItems = items
      // Feed responses already include counts. Only hit metadata for genuinely
      // missing records instead of re-querying the DB on every feed mount.
      .filter((item) => item._id && !knownStats[item._id])
      .map((item) =>
        item._id
          ? toBatchMetadataItem(item._id, item.contentType || "media")
          : null
      )
      .filter(Boolean) as ReturnType<typeof toBatchMetadataItem>[];

    if (batchItems.length === 0) return;

    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        await useInteractionStore
          .getState()
          .loadBatchContentStats(batchItems);
      } catch (e) {
        if (__DEV__)
          console.warn(
            "⚠️ Batch stats failed:",
            e instanceof Error ? e.message : e
          );
      }
    });
    return () => task.cancel();
  }, [filteredMediaList]);

  // Load persisted data off the critical path
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoadingContent(true);
      try {
        const [, viewed] = await Promise.all([
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
