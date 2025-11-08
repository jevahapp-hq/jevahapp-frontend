import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import contentInteractionAPI, {
    CommentData,
    ContentStats,
} from "../utils/contentInteractionAPI";

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
  toggleLike: (contentId: string, contentType: string) => Promise<void>;
  toggleSave: (contentId: string, contentType: string) => Promise<void>;
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
  loadContentStats: (contentId: string, contentType?: string) => Promise<void>;
  loadBatchContentStats: (
    contentIds: string[],
    contentType?: string
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
        return {
          liked:
            get().contentStats[contentId]?.userInteractions?.liked ?? false,
          totalLikes: get().contentStats[contentId]?.likes ?? 0,
        };
      }
    },

    // ============= SAVE ACTIONS =============
    toggleSave: async (
      contentId: string,
      contentType: string
    ): Promise<{ saved: boolean; totalSaves: number }> => {
      const key = `${contentId}_save`;

      set((state) => ({
        loadingInteraction: { ...state.loadingInteraction, [key]: true },
      }));

      try {
        const result = await contentInteractionAPI.toggleSave(
          contentId,
          contentType
        );

        set((state) => {
          const currentStats = state.contentStats[contentId];
          const updatedStats: ContentStats = {
            ...currentStats,
            contentId,
            likes: currentStats?.likes || 0,
            saves: result.totalSaves,
            shares: currentStats?.shares || 0,
            views: currentStats?.views || 0,
            comments: currentStats?.comments || 0,
            userInteractions: {
              ...currentStats?.userInteractions,
              liked: currentStats?.userInteractions?.liked || false,
              saved: result.saved,
              shared: currentStats?.userInteractions?.shared || false,
              viewed: currentStats?.userInteractions?.viewed || false,
            },
          };

          return {
            contentStats: { ...state.contentStats, [contentId]: updatedStats },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });

        // If item was saved, refresh saved content list
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
        set((state) => ({
          loadingInteraction: { ...state.loadingInteraction, [key]: false },
        }));
        return {
          saved:
            get().contentStats[contentId]?.userInteractions?.saved ?? false,
          totalSaves: get().contentStats[contentId]?.saves ?? 0,
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
      contentType: string = "media"
    ) => {
      set((state) => ({
        loadingStats: { ...state.loadingStats, [contentId]: true },
      }));

      try {
        const stats = await contentInteractionAPI.getContentMetadata(
          contentId,
          contentType
        );

        set((state) => {
          const existing = state.contentStats[contentId];
          const merged: ContentStats = {
            contentId,
            likes: Math.max(existing?.likes ?? 0, stats.likes ?? 0),
            saves: Math.max(existing?.saves ?? 0, stats.saves ?? 0),
            shares: Math.max(existing?.shares ?? 0, stats.shares ?? 0),
            views: Math.max(existing?.views ?? 0, stats.views ?? 0),
            comments: Math.max(existing?.comments ?? 0, stats.comments ?? 0),
            userInteractions: {
              liked:
                stats.userInteractions?.liked ??
                existing?.userInteractions?.liked ??
                false,
              saved:
                stats.userInteractions?.saved ??
                existing?.userInteractions?.saved ??
                false,
              shared:
                stats.userInteractions?.shared ??
                existing?.userInteractions?.shared ??
                false,
              viewed:
                stats.userInteractions?.viewed ??
                existing?.userInteractions?.viewed ??
                false,
            },
          };

          return {
            contentStats: { ...state.contentStats, [contentId]: merged },
            loadingStats: { ...state.loadingStats, [contentId]: false },
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
      contentType: string = "media"
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
              merged[id] = {
                contentId: id,
                likes: Math.max(existing?.likes ?? 0, stats.likes ?? 0),
                saves: Math.max(existing?.saves ?? 0, stats.saves ?? 0),
                shares: Math.max(existing?.shares ?? 0, stats.shares ?? 0),
                views: Math.max(existing?.views ?? 0, stats.views ?? 0),
                comments: Math.max(
                  existing?.comments ?? 0,
                  stats.comments ?? 0
                ),
                userInteractions: {
                  liked:
                    stats.userInteractions?.liked ??
                    existing?.userInteractions?.liked ??
                    false,
                  saved:
                    stats.userInteractions?.saved ??
                    existing?.userInteractions?.saved ??
                    false,
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
        // Fallback to per-item
        for (const id of contentIds) {
          try {
            await get().loadContentStats(id, contentType);
          } catch {}
        }
      } catch (e) {
        console.warn("Batch metadata failed; falling back per-item", e);
        for (const id of contentIds) {
          try {
            await get().loadContentStats(id, contentType);
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

    clearCache: () => {
      set({
        contentStats: {},
        loadingStats: {},
        loadingInteraction: {},
        comments: {},
        loadingComments: {},
        savedContent: [],
      });
      console.log("🗑️ Interaction store cache cleared");
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
