/**
 * useAllLibraryData - Data loading, filtering, and refresh for AllLibrary
 *
 * Instant-load strategy:
 * 1. Seed state synchronously from the MMKV bookmark cache (or the already
 *    hydrated Zustand library store) so content paints on the first frame.
 * 2. Refresh from the API in the background without a blocking spinner.
 * 3. Persist fresh API results back to the cache for the next cold start.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import allMediaAPI from "../../../../utils/allMediaAPI";
import { useLibraryStore } from "../../../../store/useLibraryStore";
import {
  filterItemsByType,
  mapContentTypeToAPI,
} from "../utils/libraryHelpers";
import {
  cacheLibraryItems,
  getCachedLibraryItemsSync,
} from "../utils/libraryCache";

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

export function useAllLibraryData({ contentType }: UseAllLibraryDataProps) {
  const libraryStore = useLibraryStore();

  // Synchronous seed: MMKV cache first (rich API payloads), then the Zustand
  // store hydrated at app start. Runs once, before the first paint.
  const [seed] = useState(() => {
    const apiContentType = mapContentTypeToAPI(contentType);
    const cached = getCachedLibraryItemsSync(apiContentType);
    if (cached && cached.length > 0) {
      return { items: cached.filter(isUserBookmark) };
    }
    return { items: useLibraryStore.getState().getAllSavedItems() };
  });
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

  const loadFromLocalStorage = useCallback(async () => {
    try {
      if (!libraryStore.isLoaded) {
        await libraryStore.loadSavedItems();
      }
      const localItems = libraryStore.getAllSavedItems();
      setSavedItems(localItems);
      hasDataRef.current = localItems.length > 0;

      const derived = deriveItemState(localItems);
      setSavedItemIds(derived.savedIds);
      setLikedItems(derived.likeState);
      setLikeCounts(derived.likeCountState);
      setError(null);
    } catch (localError) {
      console.error("Error loading from local storage:", localError);
      setSavedItems([]);
      setSavedItemIds(new Set());
      setLikedItems({});
      setLikeCounts({});
      setError("Failed to load library content from local storage.");
    }
  }, [libraryStore]);

  const parseApiItems = useCallback((response: any): any[] => {
    if (!response?.data) return [];
    const d = response.data;
    if (d.data?.media) return d.data.media;
    if (d.media) return d.media;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d)) return d;
    return [];
  }, []);

  const applyItemsToState = useCallback((apiItems: any[]) => {
    const userBookmarks = apiItems.filter(isUserBookmark);

    if (userBookmarks.length > 0) {
      setSavedItems(userBookmarks);
      hasDataRef.current = true;

      const derived = deriveItemState(userBookmarks);
      setShowOverlay(derived.overlayState);
      setLikedItems(derived.likeState);
      setLikeCounts(derived.likeCountState);
      setSavedItemIds(derived.savedIds);
      setError(null);
      return true;
    }
    return false;
  }, []);

  const fetchAndApply = useCallback(async () => {
    const apiContentType = mapContentTypeToAPI(contentType);
    const response = await allMediaAPI.getSavedContent(1, 50, apiContentType);

    if (response.success && response.data) {
      const apiItems = parseApiItems(response);
      const applied = applyItemsToState(apiItems);
      if (applied) {
        cacheLibraryItems(apiItems, apiContentType);
      } else {
        await loadFromLocalStorage();
      }
    } else {
      await loadFromLocalStorage();
    }
  }, [contentType, parseApiItems, applyItemsToState, loadFromLocalStorage]);

  const loadSavedItems = useCallback(async () => {
    // Only block the UI with a spinner when there is nothing to show yet;
    // otherwise refresh silently behind the seeded content.
    if (!hasDataRef.current) setLoading(true);
    setError(null);

    try {
      await fetchAndApply();
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
  }, [fetchAndApply, loadFromLocalStorage]);

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
    loadSavedItems();
  }, [contentType, loadSavedItems]);

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
