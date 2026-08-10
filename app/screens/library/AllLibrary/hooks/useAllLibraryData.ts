/**
 * useAllLibraryData - Data loading, filtering, and refresh for AllLibrary
 *
 * Instant-load strategy:
 * 1. Seed state synchronously from the bookmark cache (or the already
 *    hydrated Zustand library store) so content paints on the first frame.
 * 2. Refresh from the API in the background without a blocking spinner.
 * 3. Persist fresh API results back to the cache for the next cold start.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import allMediaAPI from "../../../../utils/allMediaAPI";
import { useContentCacheStore } from "../../../../store/useContentCacheStore";
import { useLibraryStore } from "../../../../store/useLibraryStore";
import { useMediaStore } from "../../../../store/useUploadStore";
import {
  filterItemsByType,
  mapContentTypeToAPI,
} from "../utils/libraryHelpers";
import {
  cacheLibraryItems,
  getCachedLibraryItemsSync,
  hydrateLibraryCache,
} from "../utils/libraryCache";
import { enrichLibraryItemsFromKnownMedia } from "../utils/libraryEnrichment";

interface UseAllLibraryDataProps {
  contentType?: string;
}

const isUserBookmark = (item: any): boolean =>
  !item.isDefaultContent &&
  !item.isOnboardingContent &&
  item.isInLibrary !== false;

interface DerivedItemState {
  savedIds: Set<string>;
  likeState: Record<string, boolean>;
  likeCountState: Record<string, number>;
  overlayState: Record<string, boolean>;
}

const deriveItemState = (items: any[]): DerivedItemState => {
  const savedIds = new Set<string>();
  const likeState: Record<string, boolean> = {};
  const likeCountState: Record<string, number> = {};
  const overlayState: Record<string, boolean> = {};

  items.forEach((item: any) => {
    const itemId = item._id || item.id;
    savedIds.add(itemId);
    if (item.contentType === "videos") overlayState[itemId] = true;
    likeState[itemId] = item.isLiked || false;
    likeCountState[itemId] = item.likeCount || item.likes || 0;
  });

  return { savedIds, likeState, likeCountState, overlayState };
};

const seedFromCaches = (contentType?: string): any[] => {
  const apiContentType = mapContentTypeToAPI(contentType);
  const cached = getCachedLibraryItemsSync(apiContentType);
  const raw =
    cached && cached.length > 0
      ? cached.filter(isUserBookmark)
      : useLibraryStore.getState().getAllSavedItems();
  // Reuse file/thumb URLs already loaded for the same items in ALL.
  return enrichLibraryItemsFromKnownMedia(raw);
};

export function useAllLibraryData({ contentType }: UseAllLibraryDataProps) {
  const libraryStore = useLibraryStore();

  const [seed] = useState(() => ({ items: seedFromCaches(contentType) }));
  const seedState = useMemo(() => deriveItemState(seed.items), [seed.items]);

  const [savedItems, setSavedItems] = useState<any[]>(seed.items);
  const [loading, setLoading] = useState(seed.items.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(
    seedState.savedIds
  );
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>(
    seedState.likeState
  );
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(
    seedState.likeCountState
  );
  const [showOverlay, setShowOverlay] = useState<Record<string, boolean>>(
    seedState.overlayState
  );

  const hasDataRef = useRef(seed.items.length > 0);
  const lastFetchedTypeRef = useRef<string | undefined>(undefined);

  const applyLocalItems = useCallback((localItems: any[]) => {
    const enriched = enrichLibraryItemsFromKnownMedia(localItems);
    setSavedItems(enriched);
    hasDataRef.current = enriched.length > 0;
    const derived = deriveItemState(enriched);
    setSavedItemIds(derived.savedIds);
    setLikedItems(derived.likeState);
    setLikeCounts(derived.likeCountState);
    setShowOverlay(derived.overlayState);
    setError(null);
  }, []);

  const loadFromLocalStorage = useCallback(async () => {
    try {
      if (!libraryStore.isLoaded) {
        await libraryStore.loadSavedItems();
      }
      applyLocalItems(libraryStore.getAllSavedItems());
    } catch (localError) {
      console.error("Error loading from local storage:", localError);
      setSavedItems([]);
      setSavedItemIds(new Set());
      setLikedItems({});
      setLikeCounts({});
      setError("Failed to load library content from local storage.");
    }
  }, [libraryStore, applyLocalItems]);

  const parseApiItems = useCallback((response: any): any[] => {
    if (!response?.data) return [];
    const d = response.data;
    const raw =
      d.data?.media ||
      d.media ||
      d.bookmarks ||
      d.bookmarkedMedia ||
      (Array.isArray(d.data) ? d.data : null) ||
      (Array.isArray(d) ? d : null) ||
      [];

    if (!Array.isArray(raw)) return [];

    // Bookmark API may wrap media as { media: {...} } — unwrap so thumbs/titles resolve
    return raw.map((item: any) => {
      if (item?.media && typeof item.media === "object" && (item.media._id || item.media.title)) {
        return {
          ...item.media,
          bookmarkId: item._id || item.id,
          isInLibrary: true,
          isBookmarked: true,
        };
      }
      return item;
    });
  }, []);

  const applyItemsToState = useCallback(
    (apiItems: any[]) => {
      const userBookmarks = apiItems.filter(isUserBookmark);

      if (userBookmarks.length > 0) {
        applyLocalItems(userBookmarks);
        return true;
      }
      return false;
    },
    [applyLocalItems]
  );

  const fetchAndApply = useCallback(async () => {
    const apiContentType = mapContentTypeToAPI(contentType);
    const response = await allMediaAPI.getSavedContent(1, 50, apiContentType);

    if (response.success && response.data) {
      const apiItems = parseApiItems(response);
      const applied = applyItemsToState(apiItems);
      if (applied) {
        cacheLibraryItems(apiItems, apiContentType);
        // Only the unfiltered fetch should populate the "all" cache
        if (!apiContentType) {
          cacheLibraryItems(apiItems);
        }
      } else {
        await loadFromLocalStorage();
      }
    } else {
      await loadFromLocalStorage();
    }
  }, [contentType, parseApiItems, applyItemsToState, loadFromLocalStorage]);

  const loadSavedItems = useCallback(async () => {
    // If sync seed was empty, hydrate disk cache once — often wins the race
    // against a cold API call and lets us paint without a spinner.
    if (!hasDataRef.current) {
      await hydrateLibraryCache();
      const hydrated = seedFromCaches(contentType);
      if (hydrated.length > 0) {
        applyLocalItems(hydrated);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    setError(null);

    try {
      await fetchAndApply();
      lastFetchedTypeRef.current = contentType;
    } catch (err) {
      console.error("Error loading saved items:", err);
      if (!hasDataRef.current) {
        setError(
          "Failed to load library content. Using local storage as fallback."
        );
        await loadFromLocalStorage();
      }
    } finally {
      setLoading(false);
    }
  }, [contentType, fetchAndApply, loadFromLocalStorage, applyLocalItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAndApply();
    } catch (err) {
      console.error("Error refreshing saved items:", err);
      await loadFromLocalStorage();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAndApply, loadFromLocalStorage]);

  useEffect(() => {
    // Category switch: paint from sync cache immediately, then background refresh
    if (lastFetchedTypeRef.current !== undefined) {
      const cached = seedFromCaches(contentType);
      if (cached.length > 0) {
        applyLocalItems(cached);
        setLoading(false);
      }
    }
    loadSavedItems();
  }, [contentType, loadSavedItems, applyLocalItems]);

  // When ALL/home finishes loading the same videos, pull their covers/URLs in.
  const feedCache = useContentCacheStore((s) => s.cache);
  const feedMediaList = useMediaStore((s) => s.mediaList);
  useEffect(() => {
    setSavedItems((prev) => {
      if (!prev.length) return prev;
      return enrichLibraryItemsFromKnownMedia(prev);
    });
  }, [feedCache, feedMediaList]);

  const filteredItems = useMemo(
    () => filterItemsByType(savedItems, contentType),
    [savedItems, contentType]
  );

  const isItemSaved = useCallback(
    (itemId: string) =>
      savedItemIds.has(itemId) || libraryStore.isItemSaved(itemId),
    [savedItemIds, libraryStore]
  );

  const refreshSavedState = useCallback(() => {
    const currentSavedIds = new Set<string>();
    savedItems.forEach((item: any) => {
      currentSavedIds.add(item._id || item.id);
    });
    libraryStore.getAllSavedItems().forEach((item: any) => {
      currentSavedIds.add(item.id);
    });
    setSavedItemIds(currentSavedIds);
  }, [savedItems, libraryStore]);

  return {
    savedItems,
    setSavedItems,
    filteredItems,
    loading,
    error,
    refreshing,
    onRefresh,
    savedItemIds,
    setSavedItemIds,
    likedItems,
    setLikedItems,
    likeCounts,
    setLikeCounts,
    showOverlay,
    setShowOverlay,
    isItemSaved,
    refreshSavedState,
    loadFromLocalStorage,
  };
}
