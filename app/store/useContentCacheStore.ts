import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { mmkvZustandStorage } from "../../src/shared/cache/mmkvStorage";
import { setFeedPageSync } from "../../src/shared/cache/feedMmkv";
import {
  getFeedStaleMs,
  feedZustandFirstPageKey,
} from "../../src/shared/config/feedCachePolicy";

type ContentKey =
  | "ALL"
  | "videos"
  | "music"
  | "ebooks"
  | "sermons"
  | "photos"
  | "posts"
  | "audios";

export interface CachedPage<T = any> {
  items: T[];
  page: number;
  limit: number;
  total?: number;
  fetchedAt: number; // epoch ms
  cursor?: string | null;
  hasMore?: boolean;
}

interface ContentCacheState {
  cache: Record<string, CachedPage>;
  /** Must match React Query FEED_STALE_MS (see feedCachePolicy). */
  ttlMs: number;
  setTTL: (ms: number) => void;
  get: (key: string) => CachedPage | undefined;
  set: (key: string, page: CachedPage) => void;
  mergePage: (key: string, page: CachedPage) => void;
  clear: () => void;
}

function maybeWriteFeedMmkv(key: string, page: CachedPage): void {
  // Write-through first-page keys (merged Lite lists still live under :first:)
  // Keys: TYPE:first:auth|public[:lite|full]
  const match = key.match(/^(.+):first:(auth|public)(?::(?:lite|full))?$/);
  if (!match || !page.items?.length) return;
  const contentType = match[1];
  const useAuth = match[2] === "auth";
  setFeedPageSync({
    media: page.items,
    total: page.total ?? page.items.length,
    fetchedAt: page.fetchedAt || Date.now(),
    contentType,
    useAuth,
    limit: page.limit || 12,
    cursor: page.cursor,
    hasMore: page.hasMore,
  });
}

export const useContentCacheStore = create<ContentCacheState>()(
  persist(
    (set, get) => ({
      cache: {},
      ttlMs: getFeedStaleMs(),
      setTTL: (ms) => set({ ttlMs: ms }),
      get: (key) => get().cache[key],
      set: (key, page) => {
        maybeWriteFeedMmkv(key, page);
        set((s) => ({ cache: { ...s.cache, [key]: page } }));
      },
      mergePage: (key, page) =>
        set((s) => {
          const prev = s.cache[key];
          if (!prev) {
            maybeWriteFeedMmkv(key, page);
            return { cache: { ...s.cache, [key]: page } };
          }
          const mergedItems =
            page.page > 1 ? [...prev.items, ...page.items] : page.items;
          const next = { ...page, items: mergedItems, fetchedAt: Date.now() };
          maybeWriteFeedMmkv(key, next);
          return {
            cache: {
              ...s.cache,
              [key]: next,
            },
          };
        }),
      clear: () => set({ cache: {} }),
    }),
    {
      name: "content-cache-store",
      storage: createJSONStorage(() => mmkvZustandStorage),
      version: 4,
      migrate: () => ({ cache: {}, ttlMs: getFeedStaleMs() }),
    }
  )
);

// Sync rehydrate from MMKV so first readSeededFirstPage is not empty
try {
  void useContentCacheStore.persist.rehydrate();
} catch {
  // ignore
}

export function isFresh(key: string): boolean {
  const { get, ttlMs } = useContentCacheStore.getState();
  const entry = get(key);
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < ttlMs;
}

export type { ContentKey };
export { feedZustandFirstPageKey };
