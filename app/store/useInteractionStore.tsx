import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import contentInteractionAPI, {
    CommentData,
    ContentStats,
} from "../utils/contentInteractionAPI";

type ToggleSaveOptions = {
  initialSaves?: number;
  initialLikes?: number;
  initialViews?: number;
  initialComments?: number;
  initialShares?: number;
  initialLiked?: boolean;
  initialShared?: boolean;
  initialViewed?: boolean;
  initialSaved?: boolean;
};

// Types for the interaction store
interface InteractionState {
  // Content stats cache
  contentStats: Record<string, ContentStats>;

  // Loading states
  loadingStats: Record<string, boolean>;
  loadingInteraction: Record<string, boolean>;

  // Comments cache
  comments: Record<string, CommentData[]>;
  loadingComments: Record<string, boolean>;

  // User's saved content
  savedContent: any[];
  savedContentLoading: boolean;

  // Actions
  toggleLike: (contentId: string, contentType: string) => Promise<{ liked: boolean; totalLikes: number }>;
  toggleSave: (
    contentId: string,
    contentType: string,
    options?: ToggleSaveOptions
  ) => Promise<{ saved: boolean; totalSaves: number }>;
  recordShare: (
    contentId: string,
    contentType: string,
    shareMethod?: string
  ) => Promise<void>;
  recordView: (
    contentId: string,
    contentType: string,
    duration?: number
  ) => Promise<void>;

  // Comment actions
  addComment: (
    contentId: string,
    comment: string,
    contentType?: string,
    parentCommentId?: string
  ) => Promise<void>;
  loadComments: (
    contentId: string,
    contentType?: string,
    page?: number
  ) => Promise<void>;
  toggleCommentLike: (commentId: string, contentId: string) => Promise<void>;

  // Stats actions
  loadContentStats: (contentId: string, contentType?: string, options?: { forceRefresh?: boolean }) => Promise<void>;
  loadBatchContentStats: (
    contentIds: string[],
    contentType?: string,
    options?: { forceRefresh?: boolean }
  ) => Promise<void>;
  // Optimistic mutation helper
  mutateStats: (
    contentId: string,
    fn: (
      s: ContentStats
    ) => Partial<ContentStats | ContentStats["userInteractions"]>
  ) => void;

  // User content actions
  loadUserSavedContent: (contentType?: string, page?: number) => Promise<void>;

  // Utility actions
  getContentStat: (
    contentId: string,
    statType: keyof ContentStats["userInteractions"]
  ) => boolean;
  getContentCount: (
    contentId: string,
    countType: "likes" | "saves" | "shares" | "views" | "comments"
  ) => number;

  // Cache management
  clearCache: () => void;
  refreshContentStats: (contentId: string) => Promise<void>;
  refreshAllStatsAfterLogin: () => Promise<void>;
}

export const useInteractionStore = create<InteractionState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    contentStats: {},
    loadingStats: {},
    loadingInteraction: {},
    comments: {},
    loadingComments: {},
    savedContent: [],
    savedContentLoading: false,

    // ============= LIKE ACTIONS =============
    toggleLike: async (
      contentId: string,
      contentType: string
    ): Promise<{ liked: boolean; totalLikes: number }> => {
      const key = `${contentId}_like`;
      // Optimistic UI
      set((state) => {
        const s =
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

      try {
        const result = await contentInteractionAPI.toggleLike(
          contentId,
          contentType
        );
        // Reconcile with server
        set((state) => {
          const s = state.contentStats[contentId];
          if (!s) return state;
          return {
            contentStats: {
              ...state.contentStats,
              [contentId]: {
                ...s,
                likes: result.totalLikes,
                userInteractions: {
                  ...s.userInteractions,
                  liked: result.liked,
                },
              },
            },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });
        const latest = get().contentStats[contentId];
        return {
          liked: latest?.userInteractions?.liked ?? result.liked,
          totalLikes: latest?.likes ?? result.totalLikes,
        };
      } catch (error) {
        console.error("Error toggling like:", error);
        // Revert on failure
        set((state) => {
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
        // Return current state (may have been rolled back)
        const currentState = get().contentStats[contentId];
        return {
          liked: currentState?.userInteractions?.liked ?? false,
          totalLikes: currentState?.likes ?? 0,
        };
      }
    },

    // ============= SAVE ACTIONS =============
    toggleSave: async (
      contentId: string,
      contentType: string,
      options: ToggleSaveOptions = {}
    ): Promise<{ saved: boolean; totalSaves: number }> => {
      const key = `${contentId}_save`;
      const previousStats = get().contentStats[contentId];
      const previousSaved =
        previousStats?.userInteractions?.saved ?? options.initialSaved ?? false;
      const previousSaves =
        previousStats?.saves ?? options.initialSaves ?? 0;

      set((state) => ({
        loadingInteraction: { ...state.loadingInteraction, [key]: true },
      }));

      try {
        set((state) => {
          const existing = state.contentStats[contentId];
          const currentlySaved =
            existing?.userInteractions?.saved ??
            options.initialSaved ??
            false;
          const baseSaves =
            existing?.saves ?? options.initialSaves ?? 0;
          const baseLikes =
            existing?.likes ?? options.initialLikes ?? 0;
          const baseViews =
            existing?.views ?? options.initialViews ?? 0;
          const baseComments =
            existing?.comments ?? options.initialComments ?? 0;
          const baseShares =
            existing?.shares ?? options.initialShares ?? 0;
          const baseLiked =
            existing?.userInteractions?.liked ??
            options.initialLiked ??
            false;
          const baseShared =
            existing?.userInteractions?.shared ??
            options.initialShared ??
            false;
          const baseViewed =
            existing?.userInteractions?.viewed ??
            options.initialViewed ??
            false;

          const nextSaved = !currentlySaved;
          const nextSaves = Math.max(
            0,
            baseSaves + (nextSaved ? 1 : -1)
          );

          const baseStats: ContentStats =
            existing ||
            ({
              contentId,
              likes: baseLikes,
              saves: baseSaves,
              shares: baseShares,
              views: baseViews,
              comments: baseComments,
              userInteractions: {
                liked: baseLiked,
                saved: currentlySaved,
                shared: baseShared,
                viewed: baseViewed,
              },
            } as ContentStats);

          return {
            contentStats: {
              ...state.contentStats,
              [contentId]: {
                ...baseStats,
                saves: nextSaves,
                userInteractions: {
                  ...baseStats.userInteractions,
                  saved: nextSaved,
                },
              },
            },
            loadingInteraction: {
              ...state.loadingInteraction,
              [key]: true,
            },
          };
        });

        const result = await contentInteractionAPI.toggleSave(
          contentId,
          contentType
        );

        set((state) => {
          const currentStats = state.contentStats[contentId];
          const updatedStats: ContentStats = {
            ...currentStats,
            contentId,
            likes:
              currentStats?.likes ??
              options.initialLikes ??
              0,
            saves: result.totalSaves,
            shares:
              currentStats?.shares ??
              options.initialShares ??
              0,
            views:
              currentStats?.views ??
              options.initialViews ??
              0,
            comments:
              currentStats?.comments ??
              options.initialComments ??
              0,
            userInteractions: {
              liked:
                currentStats?.userInteractions?.liked ??
                options.initialLiked ??
                false,
              saved: result.saved,
              shared:
                currentStats?.userInteractions?.shared ??
                options.initialShared ??
                false,
              viewed:
                currentStats?.userInteractions?.viewed ??
                options.initialViewed ??
                false,
            },
          };

          return {
            contentStats: { ...state.contentStats, [contentId]: updatedStats },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });

        if (result.saved) {
          get().loadUserSavedContent();
        }

        const latest = get().contentStats[contentId];
        return {
          saved: latest?.userInteractions?.saved ?? result.saved,
          totalSaves: latest?.saves ?? result.totalSaves,
        };
      } catch (error) {
        console.error("Error toggling save:", error);
        set((state) => {
          const nextContentStats = { ...state.contentStats };
          if (previousStats) {
            nextContentStats[contentId] = previousStats;
          } else {
            delete nextContentStats[contentId];
          }
          return {
            contentStats: nextContentStats,
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });
        return {
          saved: previousSaved,
          totalSaves: previousSaves,
        };
      }
    },

    // ============= SHARE ACTIONS =============
    recordShare: async (
      contentId: string,
      contentType: string,
      shareMethod: string = "generic"
    ) => {
      try {
        const result = await contentInteractionAPI.recordShare(
          contentId,
          contentType,
          shareMethod
        );

        set((state) => {
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

          return {
            contentStats: { ...state.contentStats, [contentId]: updatedStats },
          };
        });
      } catch (error) {
        console.error("Error recording share:", error);
      }
    },

    // ============= VIEW ACTIONS =============
    recordView: async (
      contentId: string,
      contentType: string,
      duration?: number
    ) => {
      try {
        const payload =
          typeof duration === "number" ? { durationMs: duration } : undefined;
        const result = await contentInteractionAPI.recordView(
          contentId,
          contentType,
          payload
        );

        set((state) => {
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

          return {
            contentStats: { ...state.contentStats, [contentId]: updatedStats },
          };
        });
      } catch (error) {
        console.error("Error recording view:", error);
      }
    },

    // ============= COMMENT ACTIONS =============
    addComment: async (
      contentId: string,
      comment: string,
      contentType: string = "media",
      parentCommentId?: string
    ) => {
      try {
        const newComment = await contentInteractionAPI.addComment(
          contentId,
          comment,
          contentType,
          parentCommentId
        );

        set((state) => {
          const currentComments = state.comments[contentId] || [];
          const updatedComments = [newComment, ...currentComments];

          // Update comment count in stats
          const currentStats = state.contentStats[contentId];
          const updatedStats: ContentStats = {
            ...currentStats,
            contentId,
            likes: currentStats?.likes || 0,
            saves: currentStats?.saves || 0,
            shares: currentStats?.shares || 0,
            views: currentStats?.views || 0,
            comments: updatedComments.length,
            userInteractions: currentStats?.userInteractions || {
              liked: false,
              saved: false,
              shared: false,
              viewed: false,
            },
          };

          return {
            comments: { ...state.comments, [contentId]: updatedComments },
            contentStats: { ...state.contentStats, [contentId]: updatedStats },
          };
        });
      } catch (error) {
        console.error("Error adding comment:", error);
        throw error;
      }
    },

    loadComments: async (
      contentId: string,
      contentType: string = "media",
      page: number = 1
    ) => {
      if (!contentId) return;
      const key = `${contentId}_comments`;

      set((state) => ({
        loadingComments: { ...state.loadingComments, [key]: true },
      }));

      try {
        const result = await contentInteractionAPI.getComments(
          contentId,
          contentType,
          page
        );

        set((state) => {
          const existingComments =
            page === 1 ? [] : state.comments[contentId] || [];
          const allComments = [...existingComments, ...result.comments];

          // Update comment count in stats
          const currentStats = state.contentStats[contentId];
          const updatedStats: ContentStats = {
            ...currentStats,
            contentId,
            likes: currentStats?.likes || 0,
            saves: currentStats?.saves || 0,
            shares: currentStats?.shares || 0,
            views: currentStats?.views || 0,
            comments: result.totalComments,
            userInteractions: currentStats?.userInteractions || {
              liked: false,
              saved: false,
              shared: false,
              viewed: false,
            },
          };

          return {
            comments: { ...state.comments, [contentId]: allComments },
            contentStats: { ...state.contentStats, [contentId]: updatedStats },
            loadingComments: { ...state.loadingComments, [key]: false },
          };
        });
      } catch (error) {
        console.error("Error loading comments:", error);
        set((state) => ({
          loadingComments: { ...state.loadingComments, [key]: false },
        }));
      }
    },

    toggleCommentLike: async (commentId: string, contentId: string) => {
      try {
        const result = await contentInteractionAPI.toggleCommentLike(commentId);

        set((state) => {
          const contentComments = state.comments[contentId] || [];
          const updatedComments = contentComments.map((comment) =>
            comment.id === commentId
              ? { ...comment, likes: result.totalLikes }
              : comment
          );

          return {
            comments: { ...state.comments, [contentId]: updatedComments },
          };
        });
      } catch (error) {
        console.error("Error toggling comment like:", error);
      }
    },

    // ============= STATS ACTIONS =============
    loadContentStats: async (
      contentId: string,
      contentType: string = "media",
      options?: { forceRefresh?: boolean }
    ) => {
      const key = `${contentId}_stats`;
      set((state) => ({
        loadingStats: { ...state.loadingStats, [key]: true },
      }));

      try {
        const stats = await contentInteractionAPI.getContentMetadata(
          contentId,
          contentType
        );
        set((state) => {
          const existing = state.contentStats[contentId];

          // If forceRefresh is true OR this is a fresh load (no existing stats),
          // trust the backend as source of truth (ensures persistence after refresh)
          // Otherwise, use OR merge during active session to prevent flickering
          const isFreshLoad = !existing;
          const shouldTrustBackend = options?.forceRefresh || isFreshLoad;

          const existingLiked = existing?.userInteractions?.liked ?? false;
          const statsLiked = stats.userInteractions?.liked ?? false;
          const existingSaved = existing?.userInteractions?.saved ?? false;
          const statsSaved = stats.userInteractions?.saved ?? false;
          const existingShared = existing?.userInteractions?.shared ?? false;
          const statsShared = stats.userInteractions?.shared ?? false;
          const existingViewed = existing?.userInteractions?.viewed ?? false;
          const statsViewed = stats.userInteractions?.viewed ?? false;

          const merged: ContentStats = {
            contentId,
            // Counts: Use max during active session to prevent UI regression, but trust server on fresh load
            likes: shouldTrustBackend ? (stats.likes ?? 0) : Math.max(existing?.likes ?? 0, stats.likes ?? 0),
            saves: shouldTrustBackend ? (stats.saves ?? 0) : Math.max(existing?.saves ?? 0, stats.saves ?? 0),
            shares: shouldTrustBackend ? (stats.shares ?? 0) : Math.max(existing?.shares ?? 0, stats.shares ?? 0),
            views: shouldTrustBackend ? (stats.views ?? 0) : Math.max(existing?.views ?? 0, stats.views ?? 0),
            comments: shouldTrustBackend ? (stats.comments ?? 0) : Math.max(existing?.comments ?? 0, stats.comments ?? 0),
            // User interactions: ALWAYS trust server (ensures persistence after logout/login)
            // Server is source of truth - this is what makes heart stay red after login
            userInteractions: {
              liked: stats.userInteractions?.liked ?? false, // ⭐ Server is source of truth
              saved: stats.userInteractions?.saved ?? false, // ⭐ Server is source of truth
              shared: stats.userInteractions?.shared ?? false, // ⭐ Server is source of truth
              viewed: stats.userInteractions?.viewed ?? false, // ⭐ Server is source of truth
            },
          };

          return {
            contentStats: { ...state.contentStats, [contentId]: merged },
            loadingStats: { ...state.loadingStats, [key]: false },
          };
        });
      } catch (error) {
        console.warn(
          "⚠️ Error loading content stats, using safe merge:",
          error
        );
        set((state) => {
          // Keep existing stats if present; otherwise initialize to zeros
          const existing = state.contentStats[contentId];
          const fallback: ContentStats =
            existing ||
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
          return {
            contentStats: { ...state.contentStats, [contentId]: fallback },
            loadingStats: { ...state.loadingStats, [contentId]: false },
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
        const fromBatch = await contentInteractionAPI.getBatchMetadata(
          contentIds,
          contentType
        );
        if (Object.keys(fromBatch).length > 0) {
          set((state) => {
            const merged = { ...state.contentStats } as Record<
              string,
              ContentStats
            >;
            for (const [id, stats] of Object.entries(fromBatch)) {
              const existing = state.contentStats[id];
              
              // Trust backend on fresh loads or forced refresh (ensures persistence)
              const isFreshLoad = !existing;
              const shouldTrustBackend = options?.forceRefresh || isFreshLoad;

              const existingLiked = existing?.userInteractions?.liked ?? false;
              const statsLiked = stats.userInteractions?.liked ?? false;
              const existingSaved = existing?.userInteractions?.saved ?? false;
              const statsSaved = stats.userInteractions?.saved ?? false;
              const existingShared =
                existing?.userInteractions?.shared ?? false;
              const statsShared = stats.userInteractions?.shared ?? false;
              const existingViewed =
                existing?.userInteractions?.viewed ?? false;
              const statsViewed = stats.userInteractions?.viewed ?? false;

              merged[id] = {
                contentId: id,
                // Counts: Use max during active session to prevent UI regression, but trust server on fresh load
                likes: shouldTrustBackend ? (stats.likes ?? 0) : Math.max(existing?.likes ?? 0, stats.likes ?? 0),
                saves: shouldTrustBackend ? (stats.saves ?? 0) : Math.max(existing?.saves ?? 0, stats.saves ?? 0),
                shares: shouldTrustBackend ? (stats.shares ?? 0) : Math.max(existing?.shares ?? 0, stats.shares ?? 0),
                views: shouldTrustBackend ? (stats.views ?? 0) : Math.max(existing?.views ?? 0, stats.views ?? 0),
                comments: shouldTrustBackend ? (stats.comments ?? 0) : Math.max(existing?.comments ?? 0, stats.comments ?? 0),
                // User interactions: ALWAYS trust server (ensures persistence after logout/login)
                // Server is source of truth - this is what makes heart stay red after login
                userInteractions: {
                  liked: stats.userInteractions?.liked ?? false, // ⭐ Server is source of truth
                  saved: stats.userInteractions?.saved ?? false, // ⭐ Server is source of truth
                  shared: stats.userInteractions?.shared ?? false, // ⭐ Server is source of truth
                  viewed: stats.userInteractions?.viewed ?? false, // ⭐ Server is source of truth
                },
              } as ContentStats;
            }
            return { contentStats: merged };
          });
          return;
        }
        // Fallback to per-item
        for (const id of contentIds) {
          try {
            await get().loadContentStats(id, contentType, options);
          } catch {}
        }
      } catch (e) {
        console.warn("Batch metadata failed; falling back per-item", e);
        for (const id of contentIds) {
          try {
            await get().loadContentStats(id, contentType, options);
          } catch {}
        }
      }
    },

    mutateStats: (contentId, fn) => {
      set((state) => {
        const s = state.contentStats[contentId];
        if (!s) return state;
        const patch = fn(s) as any;
        return {
          contentStats: {
            ...state.contentStats,
            [contentId]: { ...s, ...patch },
          },
        };
      });
    },

    // ============= USER CONTENT ACTIONS =============
    loadUserSavedContent: async (contentType?: string, page: number = 1) => {
      set({ savedContentLoading: true });

      try {
        const result = await contentInteractionAPI.getUserSavedContent(
          contentType,
          page
        );

        set((state) => ({
          savedContent:
            page === 1
              ? result.content
              : [...state.savedContent, ...result.content],
          savedContentLoading: false,
        }));
      } catch (error) {
        console.error("Error loading saved content:", error);
        set({ savedContentLoading: false });
      }
    },

    // ============= UTILITY ACTIONS =============
    getContentStat: (
      contentId: string,
      statType: keyof ContentStats["userInteractions"]
    ) => {
      const stats = get().contentStats[contentId];
      return stats?.userInteractions?.[statType] || false;
    },

    getContentCount: (
      contentId: string,
      countType: "likes" | "saves" | "shares" | "views" | "comments"
    ) => {
      const stats = get().contentStats[contentId];
      return stats?.[countType] || 0;
    },

    refreshContentStats: async (contentId: string) => {
      await get().loadContentStats(contentId);
    },

    /**
     * Refresh interaction stats for all currently cached content after login
     * This ensures likes/bookmarks persist across logout/login sessions
     * @param contentIds Optional array of content IDs to refresh. If not provided, refreshes all cached content.
     */
    refreshAllStatsAfterLogin: async (contentIds?: string[]) => {
      const state = get();
      const idsToRefresh = contentIds || Object.keys(state.contentStats);
      
      if (idsToRefresh.length === 0) {
        return;
      }
      
      // Group by content type (we'll need to infer or use a default)
      // For now, refresh all as "media" type (most common)
      // Components can call loadBatchContentStats with proper types
      try {
        await state.loadBatchContentStats(idsToRefresh, "media");
      } catch (error) {
        console.warn("⚠️ Failed to refresh all stats after login, falling back to per-item:", error);
        // Fallback to per-item refresh
        for (const id of idsToRefresh) {
          try {
            await state.loadContentStats(id, "media");
          } catch (itemError) {
            console.warn(`⚠️ Failed to refresh stats for ${id}:`, itemError);
          }
        }
      }
    },

    clearCache: () => {
      set({
        contentStats: {},
        loadingStats: {},
        loadingInteraction: {},
        comments: {},
        loadingComments: {},
        savedContent: [],
      });
    },
  }))
);

// Selector hooks for better performance
export const useContentStats = (contentId: string) => {
  return useInteractionStore((state) => state.contentStats[contentId]);
};

export const useContentLoading = (contentId: string) => {
  return useInteractionStore((state) => state.loadingStats[contentId] || false);
};

export const useUserInteraction = (
  contentId: string,
  interactionType: keyof ContentStats["userInteractions"]
) => {
  return useInteractionStore((state) =>
    state.getContentStat(contentId, interactionType)
  );
};

export const useContentCount = (
  contentId: string,
  countType: "likes" | "saves" | "shares" | "views" | "comments"
) => {
  return useInteractionStore((state) =>
    state.getContentCount(contentId, countType)
  );
};

export const useComments = (contentId: string) => {
  return useInteractionStore((state) => state.comments[contentId] || []);
};

export const useCommentsLoading = (contentId: string) => {
  const key = `${contentId}_comments`;
  return useInteractionStore((state) => state.loadingComments[key] || false);
};

export default useInteractionStore;
