export type { BatchMetadataItem } from "../engagementHelpers";

// Types for content interactions
export interface ContentInteraction {
  contentId: string;
  contentType: "video" | "audio" | "ebook" | "sermon" | "live";
  userId: string;
  interactionType: "like" | "save" | "share" | "view" | "comment";
  timestamp: string;
}

export interface ContentStats {
  contentId: string;
  likes: number;
  saves: number;
  shares: number;
  views: number;
  comments: number;
  /**
   * Set true after a successful comments list GET.
   * List `total` is badge truth — do not Math.max back up from stale feed/cache.
   */
  commentsConfirmed?: boolean;
  userInteractions: {
    liked: boolean;
    saved: boolean;
    shared: boolean;
    viewed: boolean;
  };
}

export interface CommentData {
  id: string;
  contentId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  comment: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean; // Whether current user liked this comment
  replies?: CommentData[];
  imageUrl?: string;
  mentions?: { userId: string; displayName: string }[];
  /** TikTok-style “Edited” badge */
  isEdited?: boolean;
  editedAt?: string;
}

export type AddCommentOptions = {
  parentCommentId?: string;
  mentions?: { userId: string; displayName: string }[];
  /** Remote URL after upload */
  imageUrl?: string;
  /** Local file for multipart create */
  localImage?: { uri: string; type: string; name: string } | null;
};

/** PATCH /api/content/comments/:id — any combination */
export type EditCommentOptions = {
  content?: string;
  imageUrl?: string;
  /** true removes attachment; keep non-empty text */
  clearImage?: boolean;
  /** multipart replace attachment */
  localImage?: { uri: string; type: string; name: string } | null;
};
