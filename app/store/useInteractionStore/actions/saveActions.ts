import type { ContentStats } from "../../../utils/contentInteractionAPI";
import type { ToggleSaveOptions } from "../types";
import type { StoreGet, StoreSet } from "../types";

export function createSaveActions(set: StoreSet, get: StoreGet, api: any) {
  return {
    toggleSave: async (
      contentId: string,
      contentType: string,
      options: ToggleSaveOptions = {}
    ): Promise<{ saved: boolean; totalSaves: number }> => {
      const key = `${contentId}_save`;
      const previousStats = get().contentStats[contentId];
      const previousSaved = previousStats?.userInteractions?.saved ?? options.initialSaved ?? false;
      const previousSaves = previousStats?.saves ?? options.initialSaves ?? 0;

      set((state: any) => ({ loadingInteraction: { ...state.loadingInteraction, [key]: true } }));

      try {
        set((state: any) => {
          const existing = state.contentStats[contentId];
          const currentlySaved = existing?.userInteractions?.saved ?? options.initialSaved ?? false;
          const baseSaves = existing?.saves ?? options.initialSaves ?? 0;
          const baseLikes = existing?.likes ?? options.initialLikes ?? 0;
          const baseViews = existing?.views ?? options.initialViews ?? 0;
          const baseComments = existing?.comments ?? options.initialComments ?? 0;
          const baseShares = existing?.shares ?? options.initialShares ?? 0;
          const baseLiked = existing?.userInteractions?.liked ?? options.initialLiked ?? false;
          const baseShared = existing?.userInteractions?.shared ?? options.initialShared ?? false;
          const baseViewed = existing?.userInteractions?.viewed ?? options.initialViewed ?? false;

          const nextSaved = !currentlySaved;
          const nextSaves = Math.max(0, baseSaves + (nextSaved ? 1 : -1));

          const baseStats: ContentStats =
            existing ||
            ({
              contentId,
              likes: baseLikes,
              saves: baseSaves,
              shares: baseShares,
              views: baseViews,
              comments: baseComments,
              userInteractions: { liked: baseLiked, saved: currentlySaved, shared: baseShared, viewed: baseViewed },
            } as ContentStats);

          return {
            contentStats: {
              ...state.contentStats,
              [contentId]: {
                ...baseStats,
                saves: nextSaves,
                userInteractions: { ...baseStats.userInteractions, saved: nextSaved },
              },
            },
            loadingInteraction: { ...state.loadingInteraction, [key]: true },
          };
        });

        const result = await api.toggleSave(contentId, contentType);

        set((state: any) => {
          const currentStats = state.contentStats[contentId];
          const updatedStats: ContentStats = {
            ...currentStats,
            contentId,
            likes: currentStats?.likes ?? options.initialLikes ?? 0,
            saves: result.totalSaves,
            shares: currentStats?.shares ?? options.initialShares ?? 0,
            views: currentStats?.views ?? options.initialViews ?? 0,
            comments: currentStats?.comments ?? options.initialComments ?? 0,
            userInteractions: {
              liked: currentStats?.userInteractions?.liked ?? options.initialLiked ?? false,
              saved: result.saved,
              shared: currentStats?.userInteractions?.shared ?? options.initialShared ?? false,
              viewed: currentStats?.userInteractions?.viewed ?? options.initialViewed ?? false,
            },
          };
          return {
            contentStats: { ...state.contentStats, [contentId]: updatedStats },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });

        if (result.saved) get().loadUserSavedContent();

        const latest = get().contentStats[contentId];
        return { saved: latest?.userInteractions?.saved ?? result.saved, totalSaves: latest?.saves ?? result.totalSaves };
      } catch (error) {
        console.error("Error toggling save:", error);
        set((state: any) => {
          const nextContentStats = { ...state.contentStats };
          if (previousStats) nextContentStats[contentId] = previousStats;
          else delete nextContentStats[contentId];
          return {
            contentStats: nextContentStats,
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });
        return { saved: previousSaved, totalSaves: previousSaves };
      }
    },
  };
}
