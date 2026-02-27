import type { ContentStats } from "../../utils/contentInteractionAPI";
import type { StoreGet, StoreSet } from "../types";

export function createStatsActions(set: StoreSet, get: StoreGet, api: any) {
  return {
    loadContentStats: async (
      contentId: string,
      contentType: string = "media",
      options?: { forceRefresh?: boolean }
    ) => {
      const key = `${contentId}_stats`;
      set((state: any) => ({ loadingStats: { ...state.loadingStats, [key]: true } }));

      try {
        const stats = await api.getContentMetadata(contentId, contentType);
        set((state: any) => {
          const existing = state.contentStats[contentId];
          const isFreshLoad = !existing;
          const shouldTrustBackend = options?.forceRefresh || isFreshLoad;
          const likeKey = `${contentId}_like`;
          const saveKey = `${contentId}_save`;
          const hasActiveLike = state.loadingInteraction[likeKey] === true;
          const hasActiveSave = state.loadingInteraction[saveKey] === true;

          const existingLiked = existing?.userInteractions?.liked ?? false;
          const existingSaved = existing?.userInteractions?.saved ?? false;
          const existingShared = existing?.userInteractions?.shared ?? false;
          const existingViewed = existing?.userInteractions?.viewed ?? false;

          const merged: ContentStats = {
            contentId,
            likes: shouldTrustBackend ? (stats.likes ?? 0) : Math.max(existing?.likes ?? 0, stats.likes ?? 0),
            saves: shouldTrustBackend ? (stats.saves ?? 0) : Math.max(existing?.saves ?? 0, stats.saves ?? 0),
            shares: shouldTrustBackend ? (stats.shares ?? 0) : Math.max(existing?.shares ?? 0, stats.shares ?? 0),
            views: shouldTrustBackend ? (stats.views ?? 0) : Math.max(existing?.views ?? 0, stats.views ?? 0),
            comments: shouldTrustBackend ? (stats.comments ?? 0) : Math.max(existing?.comments ?? 0, stats.comments ?? 0),
            userInteractions: {
              liked: hasActiveLike ? existingLiked : (stats.userInteractions?.liked ?? existingLiked ?? false),
              saved: hasActiveSave ? existingSaved : (stats.userInteractions?.saved ?? existingSaved ?? false),
              shared: stats.userInteractions?.shared ?? existingShared ?? false,
              viewed: stats.userInteractions?.viewed ?? existingViewed ?? false,
            },
          };

          return {
            contentStats: { ...state.contentStats, [contentId]: merged },
            loadingStats: { ...state.loadingStats, [key]: false },
          };
        });
      } catch (error) {
        if (__DEV__) console.warn("Error loading content stats:", error instanceof Error ? error.message : error);
        set((state: any) => {
          const existing = state.contentStats[contentId];
          const fallback: ContentStats =
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
          const nextStats = { ...state.contentStats };
          nextStats[contentId] = fallback;
          return {
            contentStats: nextStats,
            loadingStats: { ...state.loadingStats, [key]: false },
          };
        });
      }
    },

    loadBatchContentStats: async (
      contentIds: string[],
      contentType: string = "media",
      options?: { forceRefresh?: boolean }
    ) => {
      try {
        const fromBatch = await api.getBatchMetadata(contentIds, contentType);
        if (Object.keys(fromBatch).length > 0) {
          set((state: any) => {
            const merged = { ...state.contentStats } as Record<string, ContentStats>;
            for (const [id, stats] of Object.entries(fromBatch)) {
              const existing = state.contentStats[id];
              const isFreshLoad = !existing;
              const shouldTrustBackend = options?.forceRefresh || isFreshLoad;

              merged[id] = {
                contentId: id,
                likes: shouldTrustBackend ? (stats.likes ?? 0) : Math.max(existing?.likes ?? 0, stats.likes ?? 0),
                saves: shouldTrustBackend ? (stats.saves ?? 0) : Math.max(existing?.saves ?? 0, stats.saves ?? 0),
                shares: shouldTrustBackend ? (stats.shares ?? 0) : Math.max(existing?.shares ?? 0, stats.shares ?? 0),
                views: shouldTrustBackend ? (stats.views ?? 0) : Math.max(existing?.views ?? 0, stats.views ?? 0),
                comments: shouldTrustBackend ? (stats.comments ?? 0) : Math.max(existing?.comments ?? 0, stats.comments ?? 0),
                userInteractions: {
                  liked: stats.userInteractions?.liked ?? false,
                  saved: stats.userInteractions?.saved ?? false,
                  shared: stats.userInteractions?.shared ?? false,
                  viewed: stats.userInteractions?.viewed ?? false,
                },
              } as ContentStats;
            }
            return { contentStats: merged };
          });
          return;
        }
        if (contentIds.length <= 6) {
          for (const id of contentIds) {
            try {
              await get().loadContentStats(id, contentType, options);
            } catch {}
          }
        }
      } catch (e) {
        if (__DEV__) console.warn("Batch metadata failed:", e instanceof Error ? e.message : e);
        const is429 = e instanceof Error && (e.message.includes("429") || (e as any).status === 429);
        if (!is429 && contentIds.length <= 8) {
          for (const id of contentIds) {
            try {
              await get().loadContentStats(id, contentType, options);
            } catch {}
          }
        }
      }
    },

    mutateStats: (contentId: string, fn: (s: ContentStats) => Partial<ContentStats | ContentStats["userInteractions"]>) => {
      set((state: any) => {
        const s = state.contentStats[contentId];
        if (!s) return state;
        const patch = fn(s) as any;
        return {
          contentStats: { ...state.contentStats, [contentId]: { ...s, ...patch } },
        };
      });
    },

    loadUserSavedContent: async (contentType?: string, page: number = 1) => {
      set({ savedContentLoading: true });
      try {
        const result = await api.getUserSavedContent(contentType, page);
        set((state: any) => ({
          savedContent: page === 1 ? result.content : [...state.savedContent, ...result.content],
          savedContentLoading: false,
        }));
      } catch (error) {
        console.error("Error loading saved content:", error);
        set({ savedContentLoading: false });
      }
    },
  };
}
