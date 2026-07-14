import type { ContentStats } from "../../../utils/contentInteractionAPI";
import { persistContentInteraction } from "../../../utils/contentInteractionPersist";
import type { StoreGet, StoreSet } from "../types";

export type ToggleLikeOptions = {
  initialLikes?: number;
  initialLiked?: boolean;
};

export function createLikeActions(set: StoreSet, get: StoreGet, api: any) {
  return {
    toggleLike: async (
      contentId: string,
      contentType: string,
      options: ToggleLikeOptions = {}
    ): Promise<{ liked: boolean; totalLikes: number }> => {
      const key = `${contentId}_like`;
      // Ignore a second tap until the authoritative response returns. Without
      // this, rapid taps can toggle twice and make the heart appear unresponsive.
      if (get().loadingInteraction[key]) {
        const current = get().contentStats[contentId];
        return {
          liked: current?.userInteractions?.liked ?? false,
          totalLikes: current?.likes ?? options.initialLikes ?? 0,
        };
      }

      const defaultStats: ContentStats = {
        contentId,
        likes: Math.max(0, options.initialLikes ?? 0),
        saves: 0,
        shares: 0,
        views: 0,
        comments: 0,
        userInteractions: {
          liked: options.initialLiked ?? false,
          saved: false,
          shared: false,
          viewed: false,
        },
      };

      set((state: any) => {
        const existing = state.contentStats[contentId];
        const s: ContentStats = existing
          ? {
              ...existing,
              likes:
                (existing.likes ?? 0) > 0
                  ? existing.likes
                  : Math.max(existing.likes ?? 0, options.initialLikes ?? 0),
              userInteractions: {
                ...existing.userInteractions,
                liked:
                  existing.userInteractions?.liked ??
                  options.initialLiked ??
                  false,
              },
            }
          : defaultStats;

        const liked = !s.userInteractions.liked;
        const likes = Math.max(0, (s.likes || 0) + (liked ? 1 : -1));
        return {
          contentStats: {
            ...state.contentStats,
            [contentId]: {
              ...s,
              likes,
              userInteractions: { ...s.userInteractions, liked },
            },
          },
          loadingInteraction: { ...state.loadingInteraction, [key]: true },
        };
      });

      const optimistic = get().contentStats[contentId];
      if (optimistic) {
        void persistContentInteraction(contentId, {
          likes: optimistic.likes,
          liked: optimistic.userInteractions?.liked,
          comments: optimistic.comments,
          saves: optimistic.saves,
          views: optimistic.views,
        });
      }

      try {
        const result = await api.toggleLike(contentId, contentType);
        const optimisticLiked = Boolean(optimistic?.userInteractions?.liked);
        const serverLiked = Boolean(result.liked);
        // Backend has returned success with liked:false + likeCount:1 after a
        // like tap (see Metro). Prefer the optimistic heart when they disagree
        // so the UI doesn't flash red then gray while BE is wrong.
        const liked =
          serverLiked === optimisticLiked
            ? serverLiked
            : (() => {
                console.warn(
                  `⚠️ LIKE MISMATCH ${contentId}: optimistic=${optimisticLiked} server=${serverLiked} count=${result.totalLikes}. Keeping optimistic liked.`
                );
                return optimisticLiked;
              })();
        set((state: any) => {
          const s = state.contentStats[contentId];
          if (!s) return state;
          const serverTotal = Number(result.totalLikes);
          const nextLikes = Number.isFinite(serverTotal)
            ? Math.max(0, serverTotal)
            : s.likes;
          return {
            contentStats: {
              ...state.contentStats,
              [contentId]: {
                ...s,
                likes: nextLikes,
                userInteractions: {
                  ...s.userInteractions,
                  liked,
                },
              },
            },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });
        const latest = get().contentStats[contentId];
        if (latest) {
          void persistContentInteraction(contentId, {
            likes: latest.likes,
            liked: latest.userInteractions?.liked,
            comments: latest.comments,
            saves: latest.saves,
            views: latest.views,
          });
        }
        return {
          liked: latest?.userInteractions?.liked ?? liked,
          totalLikes: latest?.likes ?? result.totalLikes,
        };
      } catch (error) {
        console.error("Error toggling like:", error);
        set((state: any) => {
          const s = state.contentStats[contentId];
          if (!s) return state;
          const liked = !s.userInteractions.liked;
          const likes = Math.max(0, (s.likes || 0) + (liked ? 1 : -1));
          return {
            contentStats: {
              ...state.contentStats,
              [contentId]: {
                ...s,
                likes,
                userInteractions: { ...s.userInteractions, liked },
              },
            },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });
        const currentState = get().contentStats[contentId];
        if (currentState) {
          void persistContentInteraction(contentId, {
            likes: currentState.likes,
            liked: currentState.userInteractions?.liked,
          });
        }
        return {
          liked: currentState?.userInteractions?.liked ?? false,
          totalLikes: currentState?.likes ?? 0,
        };
      }
    },
  };
}
