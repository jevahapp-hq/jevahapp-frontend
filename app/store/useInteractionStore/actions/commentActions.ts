import type { ContentStats } from "../../../utils/contentInteractionAPI";
import { ensureAuthenticatedForInteraction } from "../../../utils/auth/requireAuthForInteraction";
import type { StoreSet } from "../types";

export function createCommentActions(set: StoreSet, api: any) {
  return {
    addComment: async (
      contentId: string,
      comment: string,
      contentType: string = "media",
      parentCommentId?: string
    ) => {
      const auth = await ensureAuthenticatedForInteraction({
        action: "comment",
      });
      if (!auth.ok) {
        const err = new Error("Authentication required") as Error & {
          authRequired?: boolean;
        };
        err.authRequired = true;
        throw err;
      }

      try {
        const newComment = await api.addComment(
          contentId,
          comment,
          contentType,
          parentCommentId
        );
        set((state: any) => {
          const currentComments = state.comments[contentId] || [];
          const updatedComments = [newComment, ...currentComments];
          const currentStats = state.contentStats[contentId];
          const nextTotal =
            typeof newComment?.totalComments === "number"
              ? newComment.totalComments
              : Math.max(0, (currentStats?.comments ?? 0) + 1);
          const updatedStats: ContentStats = {
            ...currentStats,
            contentId,
            likes: currentStats?.likes || 0,
            saves: currentStats?.saves || 0,
            shares: currentStats?.shares || 0,
            views: currentStats?.views || 0,
            comments: nextTotal,
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
        return newComment;
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
      set((state: any) => ({
        loadingComments: { ...state.loadingComments, [key]: true },
      }));

      try {
        const result = await api.getComments(contentId, contentType, page);
        set((state: any) => {
          const existingComments =
            page === 1 ? [] : state.comments[contentId] || [];
          const allComments = [...existingComments, ...result.comments];
          const currentStats = state.contentStats[contentId];
          const total =
            typeof result.totalComments === "number"
              ? result.totalComments
              : Math.max(currentStats?.comments ?? 0, allComments.length);
          const updatedStats: ContentStats = {
            ...currentStats,
            contentId,
            likes: currentStats?.likes || 0,
            saves: currentStats?.saves || 0,
            shares: currentStats?.shares || 0,
            views: currentStats?.views || 0,
            comments: total,
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
        set((state: any) => ({
          loadingComments: { ...state.loadingComments, [key]: false },
        }));
      }
    },

    toggleCommentLike: async (commentId: string, contentId: string) => {
      const auth = await ensureAuthenticatedForInteraction({ action: "like" });
      if (!auth.ok) return;

      try {
        const result = await api.toggleCommentLike(commentId);
        set((state: any) => {
          const contentComments = state.comments[contentId] || [];
          const updatedComments = contentComments.map((c: any) =>
            c.id === commentId ? { ...c, likes: result.totalLikes } : c
          );
          return {
            comments: { ...state.comments, [contentId]: updatedComments },
          };
        });
      } catch (error) {
        console.error("Error toggling comment like:", error);
      }
    },
  };
}
