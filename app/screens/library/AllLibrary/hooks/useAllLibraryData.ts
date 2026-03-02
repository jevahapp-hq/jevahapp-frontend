/**
 * useAllLibraryData - Data loading, filtering, and refresh for AllLibrary
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import allMediaAPI from "../../../../utils/allMediaAPI";
import { useLibraryStore } from "../../../../store/useLibraryStore";
import {
  filterItemsByType,
  mapContentTypeToAPI,
} from "../utils/libraryHelpers";

interface UseAllLibraryDataProps {
  contentType?: string;
}

export function useAllLibraryData({ contentType }: UseAllLibraryDataProps) {
  const libraryStore = useLibraryStore();

  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [showOverlay, setShowOverlay] = useState<Record<string, boolean>>({});

  const loadFromLocalStorage = useCallback(async () => {
    try {
      if (!libraryStore.isLoaded) {
        await libraryStore.loadSavedItems();
      }
      const localItems = libraryStore.getAllSavedItems();
      setSavedItems(localItems);

      const savedIds = new Set<string>();
      const likeState: Record<string, boolean> = {};
      const likeCountState: Record<string, number> = {};

      localItems.forEach((item: any) => {
        const itemId = item.id || item._id;
        savedIds.add(itemId);
        likeState[itemId] = item.isLiked || false;
        likeCountState[itemId] = item.likeCount || item.likes || 0;
      });

      setSavedItemIds(savedIds);
      setLikedItems(likeState);
      setLikeCounts(likeCountState);
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

  const applyItemsToState = useCallback(
    (apiItems: any[]) => {
      const userBookmarks = apiItems.filter(
        (item: any) =>
          !item.isDefaultContent &&
          !item.isOnboardingContent &&
          item.isInLibrary !== false
      );

      if (userBookmarks.length > 0) {
        setSavedItems(userBookmarks);

        const overlayState: Record<string, boolean> = {};
        const likeState: Record<string, boolean> = {};
        const likeCountState: Record<string, number> = {};
        const savedIds = new Set<string>();

        userBookmarks.forEach((item: any) => {
          const itemId = item._id || item.id;
          savedIds.add(itemId);
          if (item.contentType === "videos") overlayState[itemId] = true;
          likeState[itemId] = item.isLiked || false;
          likeCountState[itemId] = item.likeCount || item.likes || 0;
        });

        setShowOverlay(overlayState);
        setLikedItems(likeState);
        setLikeCounts(likeCountState);
        setSavedItemIds(savedIds);
        setError(null);
        return true;
      }
      return false;
    },
    []
  );

  const loadSavedItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiContentType = mapContentTypeToAPI(contentType);
      const response = await allMediaAPI.getSavedContent(1, 50, apiContentType);

      if (response.success && response.data) {
        const apiItems = parseApiItems(response);
        const applied = applyItemsToState(apiItems);
        if (!applied) await loadFromLocalStorage();
      } else {
        await loadFromLocalStorage();
      }
    } catch (err) {
      console.error("Error loading saved items:", err);
      setError("Failed to load library content. Using local storage as fallback.");
      await loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  }, [
    contentType,
    parseApiItems,
    applyItemsToState,
    loadFromLocalStorage,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const apiContentType = mapContentTypeToAPI(contentType);
      const response = await allMediaAPI.getSavedContent(1, 50, apiContentType);

      if (response.success && response.data) {
        const apiItems = parseApiItems(response);
        const applied = applyItemsToState(apiItems);
        if (!applied) await loadFromLocalStorage();
      } else {
        await loadFromLocalStorage();
      }
    } catch (err) {
      console.error("Error refreshing saved items:", err);
      await loadFromLocalStorage();
    } finally {
      setRefreshing(false);
    }
  }, [
    contentType,
    parseApiItems,
    applyItemsToState,
    loadFromLocalStorage,
  ]);

  useEffect(() => {
    loadSavedItems();
  }, [contentType, loadSavedItems]);

  useEffect(() => {
    setLikedItems({});
    setLikeCounts({});
    setSavedItemIds(new Set());
    setSavedItems([]);
    setShowOverlay({});
  }, []);

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
