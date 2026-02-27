import type { ContentStats } from "../../../utils/contentInteractionAPI";
import type { StoreGet, StoreSet } from "../types";

export function createLikeActions(set: StoreSet, get: StoreGet, api: any) {
  return {
    toggleLike: async (contentId: string, contentType: string): Promise<{ liked: boolean; totalLikes: number }> => {
      const key = `${contentId}_like`;
      const defaultStats: ContentStats = {
        contentId,
        likes: 0,
        saves: 0,
        shares: 0,
        views: 0,
        comments: 0,
        userInteractions: { liked: false, saved: false, shared: false, viewed: false },
      };

      set((state: any) => {
        const s = state.contentStats[contentId] || defaultStats;
        const liked = !s.userInteractions.liked;
        const likes = Math.max(0, (s.likes || 0) + (liked ? 1 : -1));
        return {
          contentStats: {
            ...state.contentStats,
            [contentId]: { ...s, likes, userInteractions: { ...s.userInteractions, liked } },
          },
          loadingInteraction: { ...state.loadingInteraction, [key]: true },
        };
      });

      try {
        const result = await api.toggleLike(contentId, contentType);
        set((state: any) => {
          const s = state.contentStats[contentId];
          if (!s) return state;
          return {
            contentStats: {
              ...state.contentStats,
              [contentId]: {
                ...s,
                likes: result.totalLikes,
                userInteractions: { ...s.userInteractions, liked: result.liked },
              },
            },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });
        const latest = get().contentStats[contentId];
        return { liked: latest?.userInteractions?.liked ?? result.liked, totalLikes: latest?.likes ?? result.totalLikes };
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
              [contentId]: { ...s, likes, userInteractions: { ...s.userInteractions, liked } },
            },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });
        const currentState = get().contentStats[contentId];
        return { liked: currentState?.userInteractions?.liked ?? false, totalLikes: currentState?.likes ?? 0 };
      }
    },
  };
}
