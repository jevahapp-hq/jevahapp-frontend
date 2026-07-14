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
}
