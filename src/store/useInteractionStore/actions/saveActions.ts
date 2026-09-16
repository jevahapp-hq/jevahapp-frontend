import type { ContentStats } from "@/app/utils/contentInteractionAPI";
import {
  ensureAuthenticatedForInteraction,
  isAuthenticatedForInteractionSync,
  isGuestForInteractionSync,
  promptInteractionLogin,
} from "@/app/utils/auth/requireAuthForInteraction";
import { persistContentInteraction } from "@/app/utils/contentInteractionPersist";
import {
  baselineToggleCount,
  baselineToggleFlag,
  reconcileToggleCount,
  reconcileToggleFlag,
} from "@/shared/media/engagementToggle";
import type { ToggleSaveOptions } from "../types";
import type { StoreGet, StoreSet } from "../types";

/** Latest-wins: ignore stale API responses after rapid save/unsave. */
const saveGeneration = new Map<string, number>();

function rollbackOptimisticSave(
  set: StoreSet,
  contentId: string,
  key: string,
  previousStats: ContentStats | undefined
) {
  set((state: any) => {
    const nextContentStats = { ...state.contentStats };
    if (previousStats) nextContentStats[contentId] = previousStats;
    else delete nextContentStats[contentId];
    return {
      contentStats: nextContentStats,
      loadingInteraction: { ...state.loadingInteraction, [key]: false },
    };
  });
}

export function createSaveActions(set: StoreSet, get: StoreGet, api: any) {
  return {
    toggleSave: async (
      contentId: string,
      contentType: string,
      options: ToggleSaveOptions = {}
    ): Promise<{ saved: boolean; totalSaves: number; authRequired?: boolean }> => {
      const key = `${contentId}_save`;
      const previousStats = get().contentStats[contentId];
      const previousSaved = baselineToggleFlag(
        options.initialSaved,
        previousStats?.userInteractions?.saved
      );
      const previousSaves = baselineToggleCount(
        options.initialSaves,
        previousStats?.saves
      );

      if (isGuestForInteractionSync()) {
        promptInteractionLogin({ action: "save" });
        return {
          saved: previousSaved,
          totalSaves: previousSaves,
          authRequired: true,
        };
      }
      if (!isAuthenticatedForInteractionSync()) {
        const auth = await ensureAuthenticatedForInteraction({ action: "save" });
        if (!auth.ok) {
          return {
            saved: previousSaved,
            totalSaves: previousSaves,
            authRequired: true,
          };
        }
      }

      const generation = (saveGeneration.get(contentId) ?? 0) + 1;
      saveGeneration.set(contentId, generation);

      const existingBefore = get().contentStats[contentId];
      const baselineSaved = baselineToggleFlag(
        options.initialSaved,
        existingBefore?.userInteractions?.saved
      );
      const baselineSaves = baselineToggleCount(
        options.initialSaves,
        existingBefore?.saves
      );

      const defaultStats: ContentStats = {
        contentId,
        likes: existingBefore?.likes ?? options.initialLikes ?? 0,
        saves: baselineSaves,
        shares: existingBefore?.shares ?? options.initialShares ?? 0,
        views: existingBefore?.views ?? options.initialViews ?? 0,
        comments: existingBefore?.comments ?? options.initialComments ?? 0,
        userInteractions: {
          liked: existingBefore?.userInteractions?.liked ?? options.initialLiked ?? false,
          saved: baselineSaved,
          shared: existingBefore?.userInteractions?.shared ?? options.initialShared ?? false,
          viewed: existingBefore?.userInteractions?.viewed ?? options.initialViewed ?? false,
        },
      };

      set((state: any) => {
        const existing = state.contentStats[contentId];
        const s: ContentStats = existing
          ? {
              ...existing,
              saves: baselineSaves,
              userInteractions: {
                ...existing.userInteractions,
                saved: baselineSaved,
              },
            }
          : defaultStats;

        const saved = !s.userInteractions.saved;
        const saves = Math.max(0, (s.saves || 0) + (saved ? 1 : -1));
        return {
          contentStats: {
            ...state.contentStats,
            [contentId]: {
              ...s,
              saves,
              userInteractions: { ...s.userInteractions, saved },
            },
          },
          loadingInteraction: { ...state.loadingInteraction, [key]: true },
        };
      });

      const optimistic = get().contentStats[contentId];
      if (optimistic) {
        void persistContentInteraction(contentId, {
          saves: optimistic.saves,
          saved: optimistic.userInteractions?.saved,
          likes: optimistic.likes,
          comments: optimistic.comments,
          views: optimistic.views,
        });
      }

      try {
        const result = await api.toggleSave(contentId, contentType);

        if (saveGeneration.get(contentId) !== generation) {
          return {
            saved: Boolean(get().contentStats[contentId]?.userInteractions?.saved),
            totalSaves: get().contentStats[contentId]?.saves ?? previousSaves,
          };
        }

        if (result?.offlineQueued || result?.offlineCancelled) {
          set((state: any) => ({
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          }));
          return {
            saved: Boolean(result.saved ?? optimistic?.userInteractions?.saved),
            totalSaves: Number(result.totalSaves) || optimistic?.saves || previousSaves,
          };
        }

        const optimisticSaved = Boolean(optimistic?.userInteractions?.saved);
        const saved = reconcileToggleFlag({
          optimistic: optimisticSaved,
          server: result?.saved,
        });
        const flagMismatch = saved !== Boolean(result?.saved);
        const nextSaves = reconcileToggleCount({
          optimisticCount: optimistic?.saves ?? 0,
          serverCount: result?.totalSaves,
          flagMismatch,
        });

        set((state: any) => {
          const s = state.contentStats[contentId];
          if (!s) return state;
          return {
            contentStats: {
              ...state.contentStats,
              [contentId]: {
                ...s,
                saves: nextSaves,
                userInteractions: {
                  ...s.userInteractions,
                  saved,
                },
              },
            },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });

        if (saved) get().loadUserSavedContent();

        const latest = get().contentStats[contentId];
        if (latest) {
          void persistContentInteraction(contentId, {
            saves: latest.saves,
            saved: latest.userInteractions?.saved,
            likes: latest.likes,
            comments: latest.comments,
            views: latest.views,
          });
        }
        return {
          saved: latest?.userInteractions?.saved ?? saved,
          totalSaves: latest?.saves ?? nextSaves,
        };
      } catch (error) {
        if (saveGeneration.get(contentId) !== generation) {
          return {
            saved: Boolean(get().contentStats[contentId]?.userInteractions?.saved),
            totalSaves: get().contentStats[contentId]?.saves ?? previousSaves,
          };
        }
        console.error("Error toggling save:", error);
        rollbackOptimisticSave(set, contentId, key, previousStats);
        const rolledBack = get().contentStats[contentId];
        void persistContentInteraction(contentId, {
          saves: rolledBack?.saves ?? previousSaves,
          saved: rolledBack?.userInteractions?.saved ?? previousSaved,
        });
        throw error instanceof Error
          ? error
          : new Error(typeof error === "string" ? error : "Save failed");
      }
    },
  };
}
