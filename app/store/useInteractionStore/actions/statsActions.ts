import type { ContentStats } from "../../../utils/contentInteractionAPI";
import {
  getCachedContentInteraction,
  isContentInteractionFresh,
} from "../../../utils/contentInteractionPersist";
import {
  toBatchMetadataItem,
  type BatchMetadataItem,
} from "../../../utils/engagementHelpers";
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
          const cached = getCachedContentInteraction(contentId);
          const cacheIsFresh =
            !options?.forceRefresh && isContentInteractionFresh(contentId);
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
            likes:
              cacheIsFresh && cached?.likes !== undefined
                ? Math.max(0, cached.likes)
                : Math.max(existing?.likes ?? 0, stats.likes ?? 0),
            saves:
              cacheIsFresh && cached?.saves !== undefined
                ? Math.max(0, cached.saves)
                : Math.max(existing?.saves ?? 0, stats.saves ?? 0),
            shares: Math.max(existing?.shares ?? 0, stats.shares ?? 0),
            views: Math.max(existing?.views ?? 0, stats.views ?? 0),
            // List-confirmed total wins; otherwise heal toward metadata (can go down to 0)
            comments: existing?.commentsConfirmed
              ? Math.max(0, existing.comments ?? 0)
              : Math.max(0, stats.comments ?? 0),
            commentsConfirmed: existing?.commentsConfirmed,
            userInteractions: {
              liked: hasActiveLike
                ? existingLiked
                : cacheIsFresh && cached?.liked !== undefined
                  ? cached.liked
                  : (stats.userInteractions?.liked ?? existingLiked ?? false),
              saved: hasActiveSave
                ? existingSaved
                : cacheIsFresh && cached?.saved !== undefined
                  ? cached.saved
                  : (stats.userInteractions?.saved ?? existingSaved ?? false),
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
      idsOrItems: string[] | BatchMetadataItem[],
      contentType: string = "media",
      options?: { forceRefresh?: boolean }
    ) => {
      const items: BatchMetadataItem[] =
        Array.isArray(idsOrItems) &&
        idsOrItems.length > 0 &&
        typeof idsOrItems[0] === "object"
          ? (idsOrItems as BatchMetadataItem[])
          : (idsOrItems as string[]).map((id) =>
              toBatchMetadataItem(id, contentType)
            );

      try {
        const fromBatch = await api.getBatchMetadata(items);
        if (Object.keys(fromBatch).length > 0) {
          set((state: any) => {
            const merged = { ...state.contentStats } as Record<string, ContentStats>;
            for (const [id, stats] of Object.entries(fromBatch)) {
              const existing = state.contentStats[id];
              const cached = getCachedContentInteraction(id);
              const cacheIsFresh =
                !options?.forceRefresh && isContentInteractionFresh(id);

              merged[id] = {
                contentId: id,
                likes:
                  cacheIsFresh && cached?.likes !== undefined
                    ? Math.max(0, cached.likes)
                    : Math.max(existing?.likes ?? 0, stats.likes ?? 0),
                saves:
                  cacheIsFresh && cached?.saves !== undefined
                    ? Math.max(0, cached.saves)
                    : Math.max(existing?.saves ?? 0, stats.saves ?? 0),
                shares: Math.max(existing?.shares ?? 0, stats.shares ?? 0),
                views: Math.max(
                  existing?.views ?? 0,
                  stats.views ?? 0,
                  Number(cached?.views) || 0
                ),
                comments: existing?.commentsConfirmed
                  ? Math.max(0, existing.comments ?? 0)
                  : Math.max(0, stats.comments ?? 0),
                commentsConfirmed: existing?.commentsConfirmed,
                userInteractions: {
                  liked:
                    cacheIsFresh && cached?.liked !== undefined
                      ? cached.liked
                      : (stats.userInteractions?.liked ??
                        existing?.userInteractions?.liked ??
                        false),
                  saved:
                    cacheIsFresh && cached?.saved !== undefined
                      ? cached.saved
                      : (stats.userInteractions?.saved ??
                        existing?.userInteractions?.saved ??
                        false),
                  shared:
                    stats.userInteractions?.shared ??
                    existing?.userInteractions?.shared ??
                    false,
                  viewed:
                    stats.userInteractions?.viewed ??
                    existing?.userInteractions?.viewed ??
                    false,
                },
              } as ContentStats;
            }
            return { contentStats: merged };
          });
          return;
        }
        const fallbackIds = items.map((item) => item.contentId);
        if (fallbackIds.length <= 6) {
          for (const item of items) {
            try {
              await get().loadContentStats(
                item.contentId,
                item.contentType,
                options
              );
            } catch {}
          }
        }
      } catch (e) {
        if (__DEV__) console.warn("Batch metadata failed:", e instanceof Error ? e.message : e);
        const is429 = e instanceof Error && (e.message.includes("429") || (e as any).status === 429);
        if (!is429 && items.length <= 8) {
          for (const item of items) {
            try {
              await get().loadContentStats(
                item.contentId,
                item.contentType,
                options
              );
            } catch {}
          }
        }
      }
    },

    mutateStats: (contentId: string, fn: (s: ContentStats) => Partial<ContentStats | ContentStats["userInteractions"]>) => {
      set((state: any) => {
        const s: ContentStats =
          state.contentStats[contentId] ||
          ({
            contentId,
            likes: 0,
            saves: 0,
            shares: 0,
            views: 0,
            comments: 0,
            userInteractions: {
              liked: false,
              saved: false,
              shared: false,
              viewed: false,
            },
          } as ContentStats);
        const patch = fn(s) as any;
        return {
          contentStats: {
            ...state.contentStats,
            [contentId]: { ...s, ...patch },
          },
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
