import type { ContentStats } from "../../utils/contentInteractionAPI";
import type { StoreGet, StoreSet } from "../types";

export function createCacheActions(set: StoreSet, get: StoreGet) {
  return {
    clearCache: () =>
      set({
        contentStats: {},
        loadingStats: {},
        loadingInteraction: {},
        comments: {},
        loadingComments: {},
        savedContent: [],
      }),

    refreshContentStats: async (contentId: string) => {
      await get().loadContentStats(contentId);
    },

    refreshAllStatsAfterLogin: async (contentIds?: string[]) => {
      const state = get();
      let idsToRefresh = contentIds || Object.keys(state.contentStats);

      if (idsToRefresh.length === 0) {
        try {
          const { useContentCacheStore } = await import("../../useContentCacheStore");
          const cache = useContentCacheStore.getState().cache;
          const ids = new Set<string>();
          for (const entry of Object.values(cache)) {
            for (const item of entry?.items || []) {
              const id = item?._id || item?.id;
              if (id) ids.add(String(id));
            }
          }
          idsToRefresh = Array.from(ids);
        } catch {}
      }

      if (idsToRefresh.length === 0) return;

      try {
        await state.loadBatchContentStats(idsToRefresh, "media", { forceRefresh: true });
      } catch (error) {
        console.warn("⚠️ Failed to refresh all stats after login:", error);
        for (const id of idsToRefresh) {
          try {
            await state.loadContentStats(id, "media");
          } catch (itemError) {
            console.warn(`⚠️ Failed to refresh stats for ${id}:`, itemError);
          }
        }
      }
    },

    hydrateUserInteractionsFromFeed: (
      items: Array<{ contentId: string; hasLiked?: boolean; hasBookmarked?: boolean }>
    ) => {
      if (!items?.length) return;
      set((state: any) => {
        const next = { ...state.contentStats };
        for (const { contentId, hasLiked, hasBookmarked } of items) {
          if (!contentId) continue;
          const existing = next[contentId];
          const base: ContentStats =
            existing ??
            ({
              contentId,
              likes: 0,
              saves: 0,
              shares: 0,
              views: 0,
              comments: 0,
              userInteractions: { liked: false, saved: false, shared: false, viewed: false },
            } as ContentStats);
          next[contentId] = {
            ...base,
            userInteractions: {
              ...base.userInteractions,
              liked: hasLiked ?? base.userInteractions.liked,
              saved: hasBookmarked ?? base.userInteractions.saved,
            },
          };
        }
        return { contentStats: next };
      });
    },
  };
}
