import type { CommentData, ContentStats } from "../../utils/contentInteractionAPI";

export type ToggleSaveOptions = {
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

export interface InteractionState {
  contentStats: Record<string, ContentStats>;
  loadingStats: Record<string, boolean>;
  loadingInteraction: Record<string, boolean>;
  comments: Record<string, CommentData[]>;
  loadingComments: Record<string, boolean>;
  savedContent: any[];
  savedContentLoading: boolean;

  toggleLike: (
    contentId: string,
    contentType: string,
    options?: { initialLikes?: number; initialLiked?: boolean }
  ) => Promise<{ liked: boolean; totalLikes: number }>;
  toggleSave: (contentId: string, contentType: string, options?: ToggleSaveOptions) => Promise<{ saved: boolean; totalSaves: number }>;
  recordShare: (contentId: string, contentType: string, shareMethod?: string) => Promise<void>;
  recordView: (
    contentId: string,
    contentType: string,
    payload?: {
      durationMs?: number;
      progressPct?: number;
      isComplete?: boolean;
      source?: string;
    }
  ) => Promise<void>;

  addComment: (contentId: string, comment: string, contentType?: string, parentCommentId?: string) => Promise<void>;
  loadComments: (contentId: string, contentType?: string, page?: number) => Promise<void>;
  toggleCommentLike: (commentId: string, contentId: string) => Promise<void>;

  loadContentStats: (contentId: string, contentType?: string, options?: { forceRefresh?: boolean }) => Promise<void>;
  loadBatchContentStats: (
    idsOrItems: string[] | import("../../../utils/engagementHelpers").BatchMetadataItem[],
    contentType?: string,
    options?: { forceRefresh?: boolean }
  ) => Promise<void>;
  mutateStats: (contentId: string, fn: (s: ContentStats) => Partial<ContentStats | ContentStats["userInteractions"]>) => void;

  loadUserSavedContent: (contentType?: string, page?: number) => Promise<void>;

  getContentStat: (contentId: string, statType: keyof ContentStats["userInteractions"]) => boolean;
  getContentCount: (contentId: string, countType: "likes" | "saves" | "shares" | "views" | "comments") => number;

  clearCache: () => void;
  refreshContentStats: (contentId: string) => Promise<void>;
  refreshAllStatsAfterLogin: (contentIds?: string[]) => Promise<void>;
  hydrateUserInteractionsFromFeed: (items: Array<{
    contentId: string;
    hasLiked?: boolean;
    hasBookmarked?: boolean;
    likes?: number;
    saves?: number;
    comments?: number;
    views?: number;
  }>) => void;
}

export type StoreSet = (fn: (state: any) => any) => void;
export type StoreGet = () => any;
