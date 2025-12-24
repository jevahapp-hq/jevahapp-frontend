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

// Canonical interaction key (professional): `${contentType}:${contentId}`
// We will write both canonical and legacy keys for backward compatibility.
const makeContentKey = (contentId: string, contentType?: string) =>
  `${String(contentType || "media")}:${String(contentId)}`;

// Types for the interaction store
interface InteractionState {
  // Content stats cache
  contentStats: Record<string, ContentStats>;

  // Loading states
  loadingStats: Record<string, boolean>;
  loadingInteraction: Record<string, boolean>;

  // Last local mutation timestamps (used to prevent immediate flicker when the server
  // metadata endpoint is briefly stale right after a user action).
  // Keyed by contentId (simple) for now; if we later support multi-type keys, this should become likeKey.
  lastLikeMutationAt: Record<string, number>;
  lastSaveMutationAt: Record<string, number>;

  // Legacy contentId -> latest known canonical key
  keyById: Record<string, string>;

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
  refreshAllStatsAfterLogin: () => Promise<void>;
}

export const useInteractionStore = create<InteractionState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    contentStats: {},
    loadingStats: {},
    loadingInteraction: {},
    lastLikeMutationAt: {},
    lastSaveMutationAt: {},
    keyById: {},
    comments: {},
    loadingComments: {},
    savedContent: [],
    savedContentLoading: false,

    // ============= LIKE ACTIONS =============
    toggleLike: async (
      contentId: string,
      contentType: string
    ): Promise<{ liked: boolean; totalLikes: number }> => {
      const contentKey = makeContentKey(contentId, contentType);
      const key = `${contentKey}_like`;
      const legacyKey = `${contentId}_like`;
      // Mark mutation time so metadata fetched right after the toggle doesn't fight UI.
      set((state) => ({
        lastLikeMutationAt: {
          ...state.lastLikeMutationAt,
          [contentId]: Date.now(),
          [contentKey]: Date.now(),
        },
        keyById: { ...state.keyById, [contentId]: contentKey },
      }));
      // Optimistic UI
      set((state) => {
        const s =
          state.contentStats[contentKey] ||
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
        const next: ContentStats = {
          ...s,
          contentId,
          likes,
          userInteractions: { ...s.userInteractions, liked },
        };
        return {
          contentStats: {
            ...state.contentStats,
            [contentKey]: next,
            [contentId]: next, // legacy write
          },
          loadingInteraction: {
            ...state.loadingInteraction,
            [key]: true,
            [legacyKey]: true,
          },
        };
      });

      try {
        const result = await contentInteractionAPI.toggleLike(
          contentId,
          contentType
        );
        // Reconcile with server
        set((state) => {
          const s = state.contentStats[contentKey] || state.contentStats[contentId];
          if (!s) return state;
          const next: ContentStats = {
            ...s,
            contentId,
            likes: result.totalLikes,
            userInteractions: {
              ...s.userInteractions,
              liked: result.liked,
            },
          };
          return {
            contentStats: {
              ...state.contentStats,
              [contentKey]: next,
              [contentId]: next,
            },
            loadingInteraction: {
              ...state.loadingInteraction,
              [key]: false,
              [legacyKey]: false,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
          };
        });
        const latest = get().contentStats[contentKey] || get().contentStats[contentId];
        return {
          liked: latest?.userInteractions?.liked ?? result.liked,
          totalLikes: latest?.likes ?? result.totalLikes,
        };
      } catch (error) {
        console.error("Error toggling like:", error);
        // Revert on failure
        set((state) => {
          const s = state.contentStats[contentKey] || state.contentStats[contentId];
          if (!s) return state;
          const liked = !s.userInteractions.liked;
          const likes = Math.max(0, (s.likes || 0) + (liked ? 1 : -1));
          const next: ContentStats = {
            ...s,
            contentId,
            likes,
            userInteractions: { ...s.userInteractions, liked },
          };
          return {
            contentStats: {
              ...state.contentStats,
              [contentKey]: next,
              [contentId]: next,
            },
            loadingInteraction: {
              ...state.loadingInteraction,
              [key]: false,
              [legacyKey]: false,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
          };
        });
        const latest = get().contentStats[contentKey] || get().contentStats[contentId];
        return {
          liked: latest?.userInteractions?.liked ?? false,
          totalLikes: latest?.likes ?? 0,
        };
      }
    },

    // ============= SAVE ACTIONS =============
    toggleSave: async (
      contentId: string,
      contentType: string,
      options: ToggleSaveOptions = {}
    ): Promise<{ saved: boolean; totalSaves: number }> => {
      const contentKey = makeContentKey(contentId, contentType);
      const key = `${contentKey}_save`;
      const legacyKey = `${contentId}_save`;
      set((state) => ({
        lastSaveMutationAt: {
          ...state.lastSaveMutationAt,
          [contentId]: Date.now(),
          [contentKey]: Date.now(),
        },
        keyById: { ...state.keyById, [contentId]: contentKey },
      }));
      const previousStats =
        get().contentStats[contentKey] || get().contentStats[contentId];
      const previousSaved =
        previousStats?.userInteractions?.saved ?? options.initialSaved ?? false;
      const previousSaves =
        previousStats?.saves ?? options.initialSaves ?? 0;

      set((state) => ({
        loadingInteraction: {
          ...state.loadingInteraction,
          [key]: true,
          [legacyKey]: true,
        },
      }));

      try {
        set((state) => {
          const existing =
            state.contentStats[contentKey] || state.contentStats[contentId];
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
              [contentKey]: {
                ...baseStats,
                saves: nextSaves,
                userInteractions: {
                  ...baseStats.userInteractions,
                  saved: nextSaved,
                },
              },
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
              [legacyKey]: true,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
          };
        });

        const result = await contentInteractionAPI.toggleSave(
          contentId,
          contentType
        );

        set((state) => {
          const currentStats =
            state.contentStats[contentKey] || state.contentStats[contentId];
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
            contentStats: {
              ...state.contentStats,
              [contentKey]: updatedStats,
              [contentId]: updatedStats,
            },
            loadingInteraction: {
              ...state.loadingInteraction,
              [key]: false,
              [legacyKey]: false,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
          };
        });

        if (result.saved) {
          get().loadUserSavedContent();
        }

        const latest =
          get().contentStats[contentKey] || get().contentStats[contentId];
        return {
          saved: latest?.userInteractions?.saved ?? result.saved,
          totalSaves: latest?.saves ?? result.totalSaves,
        };
      } catch (error) {
        console.error("Error toggling save:", error);
        set((state) => {
          const nextContentStats = { ...state.contentStats };
          if (previousStats) {
            nextContentStats[contentKey] = previousStats;
            nextContentStats[contentId] = previousStats;
          } else {
            delete nextContentStats[contentKey];
            delete nextContentStats[contentId];
          }
          return {
            contentStats: nextContentStats,
            loadingInteraction: {
              ...state.loadingInteraction,
              [key]: false,
              [legacyKey]: false,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
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
          const contentKey = makeContentKey(contentId, contentType);
          const currentStats =
            state.contentStats[contentKey] || state.contentStats[contentId];
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
            contentStats: {
              ...state.contentStats,
              [contentKey]: updatedStats,
              [contentId]: updatedStats,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
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
          const contentKey = makeContentKey(contentId, contentType);
          const currentStats =
            state.contentStats[contentKey] || state.contentStats[contentId];
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
            contentStats: {
              ...state.contentStats,
              [contentKey]: updatedStats,
              [contentId]: updatedStats,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
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
          const contentKey = makeContentKey(contentId, contentType);
          const currentComments = state.comments[contentId] || [];
          const updatedComments = [newComment, ...currentComments];

          // Update comment count in stats
          const currentStats =
            state.contentStats[contentKey] || state.contentStats[contentId];
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
            contentStats: {
              ...state.contentStats,
              [contentKey]: updatedStats,
              [contentId]: updatedStats,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
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
          const contentKey = makeContentKey(contentId, contentType);
          const existingComments =
            page === 1 ? [] : state.comments[contentId] || [];
          const allComments = [...existingComments, ...result.comments];

          // Update comment count in stats
          const currentStats =
            state.contentStats[contentKey] || state.contentStats[contentId];
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
            contentStats: {
              ...state.contentStats,
              [contentKey]: updatedStats,
              [contentId]: updatedStats,
            },
            loadingComments: { ...state.loadingComments, [key]: false },
            keyById: { ...state.keyById, [contentId]: contentKey },
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
      const contentKey = makeContentKey(contentId, contentType);
      set((state) => ({
        loadingStats: { ...state.loadingStats, [contentKey]: true, [contentId]: true },
        keyById: { ...state.keyById, [contentId]: contentKey },
      }));

      try {
        const stats = await contentInteractionAPI.getContentMetadata(
          contentId,
          contentType
        );
        set((state) => {
          const existing =
            state.contentStats[contentKey] || state.contentStats[contentId];
          const now = Date.now();
          const likeBusy =
            Boolean(state.loadingInteraction[`${contentKey}_like`]) ||
            Boolean(state.loadingInteraction[`${contentId}_like`]);
          const saveBusy =
            Boolean(state.loadingInteraction[`${contentKey}_save`]) ||
            Boolean(state.loadingInteraction[`${contentId}_save`]);
          const likeRecentlyMutated =
            now -
              (state.lastLikeMutationAt[contentKey] ??
                state.lastLikeMutationAt[contentId] ??
                0) <
            3000;
          const saveRecentlyMutated =
            now -
              (state.lastSaveMutationAt[contentKey] ??
                state.lastSaveMutationAt[contentId] ??
                0) <
            3000;

          const existingLiked = existing?.userInteractions?.liked ?? false;
          const existingSaved = existing?.userInteractions?.saved ?? false;
          const existingShared = existing?.userInteractions?.shared ?? false;
          const existingViewed = existing?.userInteractions?.viewed ?? false;

          const statsLiked = stats.userInteractions?.liked ?? false;
          const statsSaved = stats.userInteractions?.saved ?? false;
          const statsShared = stats.userInteractions?.shared ?? false;
          const statsViewed = stats.userInteractions?.viewed ?? false;

          const merged: ContentStats = {
            contentId,
            // Prefer server truth, except in the short window right after a local mutation
            // (or while request is in-flight), where server caches may lag briefly.
            likes:
              likeBusy || likeRecentlyMutated
                ? Math.max(existing?.likes ?? 0, stats.likes ?? 0)
                : stats.likes ?? existing?.likes ?? 0,
            saves:
              saveBusy || saveRecentlyMutated
                ? Math.max(existing?.saves ?? 0, stats.saves ?? 0)
                : stats.saves ?? existing?.saves ?? 0,
            shares: stats.shares ?? existing?.shares ?? 0,
            views: stats.views ?? existing?.views ?? 0,
            comments: stats.comments ?? existing?.comments ?? 0,
            userInteractions: {
              liked:
                likeBusy || likeRecentlyMutated ? existingLiked || statsLiked : statsLiked,
              saved:
                saveBusy || saveRecentlyMutated ? existingSaved || statsSaved : statsSaved,
              shared: statsShared ?? existingShared,
              viewed: statsViewed ?? existingViewed,
            },
          };

          return {
            contentStats: {
              ...state.contentStats,
              [contentKey]: merged,
              [contentId]: merged,
            },
            loadingStats: {
              ...state.loadingStats,
              [contentKey]: false,
              [contentId]: false,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
          };
        });
      } catch (error) {
        console.warn(
          "⚠️ Error loading content stats, using safe merge:",
          error
        );
        set((state) => {
          // Keep existing stats if present; otherwise initialize to zeros
          const contentKey = makeContentKey(contentId, contentType);
          const existing =
            state.contentStats[contentKey] || state.contentStats[contentId];
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
            contentStats: {
              ...state.contentStats,
              [contentKey]: fallback,
              [contentId]: fallback,
            },
            loadingStats: {
              ...state.loadingStats,
              [contentKey]: false,
              [contentId]: false,
            },
            keyById: { ...state.keyById, [contentId]: contentKey },
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
              const contentKey = makeContentKey(id, contentType);
              const existing = state.contentStats[id];
              const now = Date.now();
              const likeBusy =
                Boolean(state.loadingInteraction[`${contentKey}_like`]) ||
                Boolean(state.loadingInteraction[`${id}_like`]);
              const saveBusy =
                Boolean(state.loadingInteraction[`${contentKey}_save`]) ||
                Boolean(state.loadingInteraction[`${id}_save`]);
              const likeRecentlyMutated =
                now -
                  (state.lastLikeMutationAt[contentKey] ??
                    state.lastLikeMutationAt[id] ??
                    0) <
                3000;
              const saveRecentlyMutated =
                now -
                  (state.lastSaveMutationAt[contentKey] ??
                    state.lastSaveMutationAt[id] ??
                    0) <
                3000;

              const existingLiked = existing?.userInteractions?.liked ?? false;
              const existingSaved = existing?.userInteractions?.saved ?? false;
              const existingShared = existing?.userInteractions?.shared ?? false;
              const existingViewed = existing?.userInteractions?.viewed ?? false;

              const statsLiked = stats.userInteractions?.liked ?? false;
              const statsSaved = stats.userInteractions?.saved ?? false;
              const statsShared = stats.userInteractions?.shared ?? false;
              const statsViewed = stats.userInteractions?.viewed ?? false;

              merged[id] = {
                contentId: id,
                likes:
                  likeBusy || likeRecentlyMutated
                    ? Math.max(existing?.likes ?? 0, stats.likes ?? 0)
                    : stats.likes ?? existing?.likes ?? 0,
                saves:
                  saveBusy || saveRecentlyMutated
                    ? Math.max(existing?.saves ?? 0, stats.saves ?? 0)
                    : stats.saves ?? existing?.saves ?? 0,
                shares: stats.shares ?? existing?.shares ?? 0,
                views: stats.views ?? existing?.views ?? 0,
                comments: stats.comments ?? existing?.comments ?? 0,
                userInteractions: {
                  liked:
                    likeBusy || likeRecentlyMutated
                      ? existingLiked || statsLiked
                      : statsLiked,
                  saved:
                    saveBusy || saveRecentlyMutated
                      ? existingSaved || statsSaved
                      : statsSaved,
                  shared: statsShared ?? existingShared,
                  viewed: statsViewed ?? existingViewed,
                },
              } as ContentStats;
              // Backward compatible dual-key write
              merged[contentKey] = merged[id];
            }
            return {
              contentStats: merged,
              keyById: {
                ...state.keyById,
                ...Object.fromEntries(
                  Object.keys(fromBatch).map((id) => [
                    id,
                    makeContentKey(id, contentType),
                  ])
                ),
              },
            };
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
        const resolvedKey = state.keyById[contentId] || contentId;
        const s = state.contentStats[resolvedKey] || state.contentStats[contentId];
        if (!s) return state;
        const patch = fn(s) as any;
        const next = { ...s, ...patch };
        return {
          contentStats: {
            ...state.contentStats,
            [resolvedKey]: next,
            [contentId]: next, // legacy mirror
          },
          keyById: { ...state.keyById, [contentId]: resolvedKey },
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
      const state = get();
      const resolvedKey = state.keyById[contentId] || contentId;
      const stats =
        state.contentStats[resolvedKey] || state.contentStats[contentId];
      return stats?.userInteractions?.[statType] || false;
    },

    getContentCount: (
      contentId: string,
      countType: "likes" | "saves" | "shares" | "views" | "comments"
    ) => {
      const state = get();
      const resolvedKey = state.keyById[contentId] || contentId;
      const stats =
        state.contentStats[resolvedKey] || state.contentStats[contentId];
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
        console.log("🔄 No content to refresh after login");
        return;
      }

      console.log(`🔄 Refreshing interaction stats for ${idsToRefresh.length} items after login...`);
      
      // Group by content type (we'll need to infer or use a default)
      // For now, refresh all as "media" type (most common)
      // Components can call loadBatchContentStats with proper types
      try {
        await state.loadBatchContentStats(idsToRefresh, "media");
        console.log("✅ Successfully refreshed interaction stats after login");
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
        lastLikeMutationAt: {},
        lastSaveMutationAt: {},
        keyById: {},
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
  return useInteractionStore((state) => {
    const key = state.keyById[contentId] || contentId;
    return state.contentStats[key] || state.contentStats[contentId];
  });
};

export const useContentLoading = (contentId: string) => {
  return useInteractionStore((state) => {
    const key = state.keyById[contentId] || contentId;
    return Boolean(state.loadingStats[key] || state.loadingStats[contentId]);
  });
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
