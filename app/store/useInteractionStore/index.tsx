/**
 * useInteractionStore - Modular interaction store for likes, saves, comments, stats.
 * Actions are split into separate modules for maintainability.
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import contentInteractionAPI from "../../utils/contentInteractionAPI";
import type { ContentStats } from "../../utils/contentInteractionAPI";
import type { InteractionState } from "./types";
import { createLikeActions } from "./actions/likeActions";
import { createSaveActions } from "./actions/saveActions";
import { createShareViewActions } from "./actions/shareViewActions";
import { createCommentActions } from "./actions/commentActions";
import { createStatsActions } from "./actions/statsActions";
import { createCacheActions } from "./actions/cacheActions";

export const useInteractionStore = create<InteractionState>()(
  subscribeWithSelector((set, get) => {
    const api = contentInteractionAPI;
    return {
      contentStats: {},
      loadingStats: {},
      loadingInteraction: {},
      comments: {},
      loadingComments: {},
      savedContent: [],
      savedContentLoading: false,

      ...createLikeActions(set as any, get, api),
      ...createSaveActions(set as any, get, api),
      ...createShareViewActions(set as any, api),
      ...createCommentActions(set as any, api),
      ...createStatsActions(set as any, get, api),
      ...createCacheActions(set as any, get),

      getContentStat: (contentId: string, statType: keyof ContentStats["userInteractions"]) => {
        const stats = get().contentStats[contentId];
        return stats?.userInteractions?.[statType] || false;
      },

      getContentCount: (
        contentId: string,
        countType: "likes" | "saves" | "shares" | "views" | "comments"
      ) => {
        const stats = get().contentStats[contentId];
        return stats?.[countType] ?? 0;
      },
    };
  })
);

export const useContentStats = (contentId: string) =>
  useInteractionStore((state) => state.contentStats[contentId]);

export const useContentLoading = (contentId: string) =>
  useInteractionStore((state) => state.loadingStats[contentId] || false);

export const useUserInteraction = (
  contentId: string,
  interactionType: keyof ContentStats["userInteractions"]
) => useInteractionStore((state) => state.getContentStat(contentId, interactionType));

export const useContentCount = (
  contentId: string,
  countType: "likes" | "saves" | "shares" | "views" | "comments"
) => useInteractionStore((state) => state.getContentCount(contentId, countType));

export const useComments = (contentId: string) =>
  useInteractionStore((state) => state.comments[contentId] || []);

export const useCommentsLoading = (contentId: string) => {
  const key = `${contentId}_comments`;
  return useInteractionStore((state) => state.loadingComments[key] || false);
};

export default useInteractionStore;
