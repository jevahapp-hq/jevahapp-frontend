import type { ContentStats } from "../../utils/contentInteractionAPI";
import type { StoreSet } from "../types";

const VIEW_RECORD_MIN_INTERVAL_MS = 2500;
const viewRecordThrottleRef: { lastTime?: number; backoffUntil?: number } = {};

export function createShareViewActions(set: StoreSet, api: any) {
  return {
    recordShare: async (contentId: string, contentType: string, shareMethod: string = "generic") => {
      try {
        const result = await api.recordShare(contentId, contentType, shareMethod);
        set((state: any) => {
          const currentStats = state.contentStats[contentId];
          const updatedStats: ContentStats = {
            ...currentStats,
            contentId,
            likes: currentStats?.likes || 0,
            saves: currentStats?.saves || 0,
            shares: result.totalShares,
            views: currentStats?.views || 0,
            comments: currentStats?.comments || 0,
            userInteractions: {
              ...currentStats?.userInteractions,
              liked: currentStats?.userInteractions?.liked || false,
              saved: currentStats?.userInteractions?.saved || false,
              shared: true,
              viewed: currentStats?.userInteractions?.viewed || false,
            },
          };
          return { contentStats: { ...state.contentStats, [contentId]: updatedStats } };
        });
      } catch (error) {
        console.error("Error recording share:", error);
      }
    },

    recordView: async (contentId: string, contentType: string, duration?: number) => {
      const now = Date.now();
      if (now - (viewRecordThrottleRef.lastTime || 0) < VIEW_RECORD_MIN_INTERVAL_MS) return;
      if (viewRecordThrottleRef.backoffUntil && now < viewRecordThrottleRef.backoffUntil) return;
      viewRecordThrottleRef.lastTime = now;

      try {
        const payload = typeof duration === "number" ? { durationMs: duration } : undefined;
        const result = await api.recordView(contentId, contentType, payload);
        set((state: any) => {
          const currentStats = state.contentStats[contentId];
          const updatedStats: ContentStats = {
            ...currentStats,
            contentId,
            likes: currentStats?.likes || 0,
            saves: currentStats?.saves || 0,
            shares: currentStats?.shares || 0,
            views: result.totalViews,
            comments: currentStats?.comments || 0,
            userInteractions: {
              ...currentStats?.userInteractions,
              liked: currentStats?.userInteractions?.liked || false,
              saved: currentStats?.userInteractions?.saved || false,
              shared: currentStats?.userInteractions?.shared || false,
              viewed: true,
            },
          };
          return { contentStats: { ...state.contentStats, [contentId]: updatedStats } };
        });
      } catch (error) {
        const is429 = error instanceof Error && (String(error.message).includes("429") || (error as any).status === 429);
        if (is429) viewRecordThrottleRef.backoffUntil = Date.now() + 60000;
        if (__DEV__) console.error("Error recording view:", error instanceof Error ? error.message : error);
      }
    },
  };
}
