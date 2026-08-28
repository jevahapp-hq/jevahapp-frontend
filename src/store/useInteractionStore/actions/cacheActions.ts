import type { ContentStats } from "@/app/utils/contentInteractionAPI";
import {
  getCachedContentInteraction,
  isContentInteractionFresh,
  resolveLikedFlag,
  resolveSavedFlag,
} from "@/app/utils/contentInteractionPersist";
import type { StoreGet, StoreSet } from "../types";

export function createCacheActions(set: StoreSet, get: StoreGet) {
  return {
    clearCache: () =>
      set({
        contentStats: {},
        loadingStats: {},
        loadingInteraction: {},
        likeCooldownUntil: {},
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
        await state.loadBatchContentStats(idsToRefresh, "media", {
          forceRefresh: true,
        });
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
      items: Array<{
        contentId: string;
        hasLiked?: boolean;
        hasBookmarked?: boolean;
        likes?: number;
        saves?: number;
        comments?: number;
        views?: number;
      }>
    ) => {
      if (!items?.length) return;
      set((state: any) => {
        let changed = false;
        let next: Record<string, ContentStats> | null = null;

        for (const item of items) {
          const {
            contentId,
            hasLiked,
            hasBookmarked,
            likes,
            saves,
            comments,
            views,
          } = item;
          if (!contentId) continue;
          const cached = getCachedContentInteraction(contentId);
          const cacheIsFresh = isContentInteractionFresh(contentId);
          const existing = (next ?? state.contentStats)[contentId];
          const base: ContentStats =
            existing ??
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

          const nextLikes =
            cacheIsFresh && cached?.likes !== undefined
              ? Math.max(0, cached.likes)
              : Math.max(base.likes ?? 0, Number(likes) || 0);
          const nextSaves =
            cacheIsFresh && cached?.saves !== undefined
              ? Math.max(0, cached.saves)
              : Math.max(base.saves ?? 0, Number(saves) || 0);
          const nextComments = Math.max(
            base.comments ?? 0,
            Number(comments) || 0,
            Number(cached?.comments) || 0
          );
          const nextViews = Math.max(
            base.views ?? 0,
            Number(views) || 0,
            Number(cached?.views) || 0
          );
          const nextLiked =
            resolveLikedFlag(contentId, hasLiked) ??
            base.userInteractions.liked;
          const nextSaved =
            resolveSavedFlag(contentId, hasBookmarked) ??
            base.userInteractions.saved;

          if (
            existing &&
            existing.likes === nextLikes &&
            existing.saves === nextSaves &&
            existing.comments === nextComments &&
            existing.views === nextViews &&
            existing.userInteractions?.liked === nextLiked &&
            existing.userInteractions?.saved === nextSaved
          ) {
            continue;
          }

          if (!next) next = { ...state.contentStats };
          changed = true;
          next[contentId] = {
            ...base,
            likes: nextLikes,
            saves: nextSaves,
            comments: nextComments,
            views: nextViews,
            userInteractions: {
              ...base.userInteractions,
              // Sticky local liked/saved beat stale feed hasLiked:false (backend bug).
              liked: nextLiked,
              saved: nextSaved,
            },
          };
        }

        // Bail out with same state — avoids feed/FlashList infinite re-render loops.
        if (!changed || !next) return state;
        return { contentStats: next };
      });
    },
  };
}
