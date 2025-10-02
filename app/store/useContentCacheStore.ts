import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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
}

interface ContentCacheState {
  cache: Record<string, CachedPage>;
  ttlMs: number; // default 2 minutes
  setTTL: (ms: number) => void;
  get: (key: string) => CachedPage | undefined;
  set: (key: string, page: CachedPage) => void;
  mergePage: (key: string, page: CachedPage) => void;
  clear: () => void;
}

export const useContentCacheStore = create<ContentCacheState>()(
  persist(
    (set, get) => ({
      cache: {},
      ttlMs: 5 * 60 * 1000,
      setTTL: (ms) => set({ ttlMs: ms }),
      get: (key) => get().cache[key],
      set: (key, page) => set((s) => ({ cache: { ...s.cache, [key]: page } })),
      mergePage: (key, page) =>
        set((s) => {
          const prev = s.cache[key];
          if (!prev) return { cache: { ...s.cache, [key]: page } };
          const mergedItems =
            page.page > 1 ? [...prev.items, ...page.items] : page.items;
          return {
            cache: {
              ...s.cache,
              [key]: { ...page, items: mergedItems, fetchedAt: Date.now() },
            },
          };
        }),
      clear: () => set({ cache: {} }),
    }),
    {
      name: "content-cache-store",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

export function isFresh(key: string): boolean {
  const { get, ttlMs } = useContentCacheStore.getState();
  const entry = get(key);
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < ttlMs;
}
