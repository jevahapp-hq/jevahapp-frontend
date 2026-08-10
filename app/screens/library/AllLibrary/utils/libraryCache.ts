/**
 * Library bookmark cache - instant library loads without native dependencies.
 *
 * An in-memory mirror is hydrated once from AsyncStorage (kicked off at app
 * startup), so by the time the Library screen mounts, cached bookmark items
 * can be read synchronously and painted on the first frame. A background API
 * refresh then updates both the UI and this cache.
 *
 * Note: react-native-mmkv is intentionally NOT used here - it requires
 * react-native-nitro-modules, which is not installed in this project, and
 * calling createMMKV() crashes the module at import time.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "libraryBookmarkCacheV1";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedLibraryData {
  items: any[];
  timestamp: number;
}

type CacheShape = Record<string, CachedLibraryData>;

let memoryCache: CacheShape = {};
let hydrationPromise: Promise<void> | null = null;

const cacheKey = (apiContentType?: string): string => apiContentType || "all";

/**
 * Load the persisted cache into memory. Idempotent; safe to call multiple
 * times. Called automatically on module import and from app startup.
 */
export const hydrateLibraryCache = (): Promise<void> => {
  if (!hydrationPromise) {
    hydrationPromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          // Preserve any writes that happened before hydration finished
          memoryCache = { ...parsed, ...memoryCache };
        }
      })
      .catch(() => {
        // Cache is best-effort; the API refresh always runs regardless
      });
  }
  return hydrationPromise;
};

// Begin hydration as soon as this module loads
hydrateLibraryCache();

const persist = (): void => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache)).catch(
    (error) => {
      console.warn("Failed to persist library cache:", error);
    }
  );
};

const readEntry = (key: string): any[] | null => {
  const entry = memoryCache[key];
  if (!entry?.timestamp || Date.now() - entry.timestamp > CACHE_DURATION) {
    return null;
  }
  return Array.isArray(entry.items) ? entry.items : null;
};

/**
 * Synchronously read cached library items for a content type.
 * Falls back to the "all" cache (filtered client-side by the caller)
 * when a category-specific cache doesn't exist yet.
 */
export const getCachedLibraryItemsSync = (
  apiContentType?: string
): any[] | null => {
  const exact = readEntry(cacheKey(apiContentType));
  if (exact && exact.length > 0) return exact;
  if (apiContentType) {
    const all = readEntry(cacheKey(undefined));
    if (all && all.length > 0) return all;
  }
  return exact;
};

export const cacheLibraryItems = (
  items: any[],
  apiContentType?: string
): void => {
  memoryCache[cacheKey(apiContentType)] = { items, timestamp: Date.now() };
  persist();
};

/**
 * Remove an item from every cached content-type list so it doesn't
 * reappear from the synchronous seed after being unbookmarked.
 */
export const removeItemFromLibraryCache = (itemId: string): void => {
  let changed = false;
  Object.keys(memoryCache).forEach((key) => {
    const entry = memoryCache[key];
    if (!Array.isArray(entry?.items)) return;
    const next = entry.items.filter(
      (item: any) => (item._id || item.id) !== itemId
    );
    if (next.length !== entry.items.length) {
      memoryCache[key] = { items: next, timestamp: entry.timestamp };
      changed = true;
    }
  });
  if (changed) persist();
};

/**
 * Prepend a newly saved item to the "all" cache so it shows up
 * instantly on the next library mount, before the API refresh lands.
 */
export const addItemToLibraryCache = (item: any): void => {
  const key = cacheKey(undefined);
  const entry = memoryCache[key];
  const items = Array.isArray(entry?.items) ? entry.items : [];
  const itemId = item._id || item.id;
  const exists = items.some((i: any) => (i._id || i.id) === itemId);
  if (!exists) {
    memoryCache[key] = {
      items: [item, ...items],
      timestamp: entry?.timestamp || Date.now(),
    };
    persist();
  }
};

export const clearLibraryCache = (): void => {
  memoryCache = {};
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
};

/**
 * Prefetch bookmarks into the sync cache so Library can paint without waiting
 * on the network when the user opens the tab.
 */
export const prefetchLibraryBookmarks = async (): Promise<void> => {
  try {
    await hydrateLibraryCache();
    const allMediaAPI = (await import("../../../../utils/allMediaAPI")).default;
    const response = await allMediaAPI.getSavedContent(1, 50);
    if (!response.success || !response.data) return;

    const d = response.data;
    const items =
      d?.data?.media ||
      d?.media ||
      (Array.isArray(d?.data) ? d.data : null) ||
      (Array.isArray(d) ? d : null) ||
      [];

    if (Array.isArray(items) && items.length > 0) {
      cacheLibraryItems(items);
    }
  } catch {
    // Best-effort warm-up; Library still refreshes on mount
  }
};
