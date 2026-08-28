/**
 * Library data: paint disk cache on frame 0, reconcile network in the background.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import allMediaAPI from "../../../../utils/allMediaAPI";
import copyrightFreeMusicAPI from "../../../../services/copyrightFreeMusicAPI";
import { useLibraryStore } from "@/store/useLibraryStore";
import { filterItemsByType } from "../utils/libraryHelpers";

interface UseAllLibraryDataProps {
  contentType?: string;
}

function localSnapshot(): any[] {
  try {
    return useLibraryStore.getState().getAllSavedItems() || [];
  } catch {
    return [];
  }
}

function itemId(item: any): string {
  return String(item?._id || item?.id || "").trim();
}

function mergeById(primary: any[], extra: any[]): any[] {
  const map = new Map<string, any>();
  for (const item of [...primary, ...extra]) {
    const id = itemId(item);
    if (!id || map.has(id)) continue;
    map.set(id, item);
  }
  return [...map.values()];
}

export function useAllLibraryData({ contentType }: UseAllLibraryDataProps) {
  const libraryStore = useLibraryStore();
  const cached = localSnapshot();

  const [savedItems, setSavedItems] = useState<any[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(
    () => new Set(cached.map(itemId).filter(Boolean))
  );
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [showOverlay, setShowOverlay] = useState<Record<string, boolean>>({});

  const applyItemsToState = useCallback((apiItems: any[]) => {
    const userBookmarks = apiItems.filter(
      (item: any) =>
        !item.isDefaultContent &&
        !item.isOnboardingContent &&
        item.isInLibrary !== false
    );
    if (userBookmarks.length === 0) return false;

    const overlayState: Record<string, boolean> = {};
    const likeState: Record<string, boolean> = {};
    const likeCountState: Record<string, number> = {};
    const savedIds = new Set<string>();

    userBookmarks.forEach((item: any) => {
      const id = itemId(item);
      if (!id) return;
      savedIds.add(id);
      if (item.contentType === "videos") overlayState[id] = true;
      likeState[id] = item.isLiked || false;
      likeCountState[id] = item.likeCount || item.likes || 0;
    });

    setSavedItems(userBookmarks);
    setShowOverlay(overlayState);
    setLikedItems(likeState);
    setLikeCounts(likeCountState);
    setSavedItemIds(savedIds);
    setError(null);
    return true;
  }, []);

  const hydrateFromDisk = useCallback(async () => {
    try {
      if (!useLibraryStore.getState().isLoaded) {
        await useLibraryStore.getState().loadSavedItems();
      }
      const localItems = useLibraryStore.getState().getAllSavedItems();
      if (localItems.length === 0) return false;
      applyItemsToState(localItems);
      return true;
    } catch {
      return false;
    }
  }, [applyItemsToState]);

  const fetchRemote = useCallback(async () => {
    const [audioResult, savedResult] = await Promise.allSettled([
      copyrightFreeMusicAPI.getLibrary(),
      allMediaAPI.getSavedContent(1, 50),
    ]);

    let remote: any[] = [];

    if (audioResult.status === "fulfilled") {
      const audioLib = audioResult.value;
      if (audioLib?.success && audioLib.data?.items?.length) {
        remote = mergeById(remote, audioLib.data.items);
      }
    }

    if (savedResult.status === "fulfilled") {
      const response = savedResult.value;
      if (response?.success && response.data) {
        const d = response.data;
        const parsed = d.data?.media || d.media || (Array.isArray(d.data) ? d.data : null) || (Array.isArray(d) ? d : []);
        if (Array.isArray(parsed) && parsed.length) {
          remote = mergeById(remote, parsed);
        }
      }
    }

    if (remote.length > 0) {
      applyItemsToState(remote);
      return true;
    }
    return false;
  }, [applyItemsToState]);

  const loadSavedItems = useCallback(async () => {
    const hasPaint = savedItems.length > 0 || localSnapshot().length > 0;
    if (!hasPaint) setLoading(true);
    setError(null);

    try {
      const disk = await hydrateFromDisk();
      if (disk) setLoading(false);
      const remote = await fetchRemote();
      if (!remote && !disk) {
        setError("Failed to load library content.");
        setSavedItems([]);
      }
    } catch (err) {
      console.error("Error loading saved items:", err);
      setError("Failed to load library content. Showing saved items on this device.");
      await hydrateFromDisk();
    } finally {
      setLoading(false);
    }
  }, [fetchRemote, hydrateFromDisk, savedItems.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const remote = await fetchRemote();
      if (!remote) await hydrateFromDisk();
    } catch (err) {
      console.error("Error refreshing saved items:", err);
      await hydrateFromDisk();
    } finally {
      setRefreshing(false);
    }
  }, [fetchRemote, hydrateFromDisk]);

  useEffect(() => {
    void loadSavedItems();
    // Disk first, then one background reconcile — chips filter locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(
    () => filterItemsByType(savedItems, contentType),
    [savedItems, contentType]
  );

  const isItemSaved = useCallback(
    (id: string) => savedItemIds.has(id) || libraryStore.isItemSaved(id),
    [savedItemIds, libraryStore]
  );

  const refreshSavedState = useCallback(() => {
    const currentSavedIds = new Set<string>();
    savedItems.forEach((item: any) => {
      const id = itemId(item);
      if (id) currentSavedIds.add(id);
    });
    libraryStore.getAllSavedItems().forEach((item: any) => {
      if (item.id) currentSavedIds.add(item.id);
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
    loadFromLocalStorage: hydrateFromDisk,
  };
}
