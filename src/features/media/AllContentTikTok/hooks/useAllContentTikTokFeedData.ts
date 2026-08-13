/**
 * useAllContentTikTokFeedData - Feed data, helpers, and hydration effects
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  getLastSessionTopIds,
  getOrCreateSessionSeed,
  idsSeenToday,
  markFeedImpressions,
  rememberLastSessionTopIds,
  rotateSessionSeed,
} from "../utils/feedImpressionStore";
import {
  createFeedShuffleSeed,
  pickMostRecentItem,
  rankFeedForYou,
  stabilizeFeedOrder,
} from "../utils/rankFeedForYou";
import {
  CLIENT_RERANK,
  SESSION_SHUFFLE,
} from "../../../../shared/feed/feedFeatureFlags";

export interface UseAllContentTikTokFeedDataParams {
  mediaList: MediaItem[];
  contentType: ContentType | "ALL";
  setPreviouslyViewed: (v: any[]) => void;
  setIsLoadingContent: (v: boolean) => void;
  previouslyViewed?: any[];
  /** Server already ranked via /feed/for-you */
  serverRanked?: boolean;
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
    serverRanked = false,
  } = params;

  const libraryIsLoaded = useLibraryStore((s) => s.isLoaded);
  const loadSavedItems = useLibraryStore((s) => s.loadSavedItems);
  const [seenTodayIds, setSeenTodayIds] = useState<Set<string>>(new Set());
  const [lastSessionTopIds, setLastSessionTopIds] = useState<Set<string>>(
    new Set()
  );
  const [sessionSeed, setSessionSeed] = useState<number>(() =>
    createFeedShuffleSeed()
  );
  const [impressionsReady, setImpressionsReady] = useState(false);
  const [affinity, setAffinity] = useState<
    import("../utils/feedAffinityStore").FeedAffinityProfile | undefined
  >(undefined);
  const pinnedOrderRef = useRef<string[]>([]);
  const seedUsedRef = useRef(sessionSeed);

  // Load cross-session impressions + rotate seed once per cold start
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getFeedAffinity } = await import("../utils/feedAffinityStore");
        const [map, seed, aff, lastTops] = await Promise.all([
          getFeedImpressions(),
          getOrCreateSessionSeed(),
          getFeedAffinity(),
          getLastSessionTopIds(),
        ]);
        if (cancelled) return;
        setSeenTodayIds(idsSeenToday(map));
        setSessionSeed(seed);
        setAffinity(aff);
        setLastSessionTopIds(lastTops);
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

  // Session shuffle: random order each visit / PTR. Pin shown IDs so page 2 doesn't jump.
  const filteredMediaList = useMemo(() => {
    if (!SESSION_SHUFFLE && (serverRanked || !CLIENT_RERANK)) {
      return filteredByType;
    }

    if (seedUsedRef.current !== sessionSeed) {
      pinnedOrderRef.current = [];
      seedUsedRef.current = sessionSeed;
    }

    const ranked = rankFeedForYou(filteredByType, {
      previouslyViewedIds,
      seenTodayIds: impressionsReady ? seenTodayIds : undefined,
      lastSessionTopIds: impressionsReady ? lastSessionTopIds : undefined,
      sessionSeed,
      affinity: CLIENT_RERANK ? affinity : undefined,
    });

    const { items, nextPinnedIds } = stabilizeFeedOrder(
      ranked,
      pinnedOrderRef.current
    );
    pinnedOrderRef.current = nextPinnedIds;
    return items;
  }, [
    filteredByType,
    previouslyViewedIds,
    seenTodayIds,
    lastSessionTopIds,
    sessionSeed,
    impressionsReady,
    affinity,
    serverRanked,
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

  // Remember this session's top cards for next cold start rotation
  useEffect(() => {
    const topIds = [
      mostRecentItem?._id,
      ...firstFour.map((i) => i._id),
    ]
      .filter(Boolean)
      .map(String)
      .slice(0, 5);

    return () => {
      if (topIds.length > 0) {
        void rememberLastSessionTopIds(topIds);
      }
    };
  }, [mostRecentItem?._id, firstFour]);

  // Hydrate liked/saved + counts from feed immediately (no InteractionManager delay).
  // Fingerprint deps — not filteredMediaList identity — so ranking remounts don't loop.
  const feedInteractionFingerprint = useMemo(() => {
    return (filteredMediaList || [])
      .slice(0, 40)
      .map((i) => {
        if (!i._id) return "";
        const likes = i.likeCount ?? i.totalLikes ?? i.likes ?? i.favorite ?? 0;
        const saves = i.saves ?? i.saved ?? 0;
        const comments = i.commentCount ?? i.comments ?? i.comment ?? 0;
        const views = i.viewCount ?? i.totalViews ?? i.views ?? 0;
        return `${i._id}:${i.hasLiked ? 1 : 0}:${i.hasBookmarked ? 1 : 0}:${likes}:${saves}:${comments}:${views}`;
      })
      .filter(Boolean)
      .join("|");
  }, [filteredMediaList]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fingerprint tracks meaningful feed interaction fields
  }, [feedInteractionFingerprint]);

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
    let cancelled = false;
    const loadAllData = async () => {
      setIsLoadingContent(true);
      try {
        const [, viewed] = await Promise.all([
          getPersistedStats(),
          getViewed(),
          libraryIsLoaded ? Promise.resolve() : loadSavedItems(),
        ]);
        if (cancelled) return;
        const next = viewed || [];
        setPreviouslyViewed((prev) => {
          if (
            prev.length === next.length &&
            prev.every((p, i) => {
              const a =
                typeof p === "string"
                  ? p
                  : String(p?._id || p?.id || p?.contentId || "");
              const b = next[i];
              const bId =
                typeof b === "string"
                  ? b
                  : String(b?._id || b?.id || b?.contentId || "");
              return a === bId;
            })
          ) {
            return prev;
          }
          return next;
        });
      } catch (error) {
        if (__DEV__) console.error("❌ Error loading AllContent data:", error);
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    };

    if (mediaList.length > 0) {
      InteractionManager.runAfterInteractions(() => {
        void loadAllData();
      });
    } else {
      setIsLoadingContent(false);
    }
    return () => {
      cancelled = true;
    };
  }, [
    mediaList.length,
    setPreviouslyViewed,
    setIsLoadingContent,
    libraryIsLoaded,
    loadSavedItems,
  ]);

  const reshuffleFeed = useCallback(async () => {
    pinnedOrderRef.current = [];
    const seed = await rotateSessionSeed();
    seedUsedRef.current = seed;
    setSessionSeed(seed);
  }, []);

  return {
    filteredMediaList,
    categorizedContent,
    mostRecentItem,
    firstFour,
    nextFour,
    rest,
    reshuffleFeed,
  };
}

/** Stable helpers — read latest store; do not subscribe the feed root to contentStats. */
export function useContentStatsHelpers() {
  const getUserLikeState = useCallback(
    (contentId: string) =>
      useInteractionStore.getState().contentStats[contentId]?.userInteractions
        ?.liked || false,
    []
  );

  const getLikeCount = useCallback(
    (contentId: string) =>
      useInteractionStore.getState().contentStats[contentId]?.likes || 0,
    []
  );

  const getUserSaveState = useCallback(
    (contentId: string) =>
      useInteractionStore.getState().contentStats[contentId]?.userInteractions
        ?.saved || false,
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
