import type SocketManager from "../../services/SocketManager";

export interface ContentCardContent {
  _id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  contentType: "video" | "audio" | "image";
  duration?: number;
  author: { _id: string; firstName: string; lastName: string; avatar?: string };
  authorInfo?: { _id: string; firstName: string; lastName: string; avatar?: string };
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  createdAt: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isLive?: boolean;
  liveViewers?: number;
}

export interface ContentCardProps {
  content: ContentCardContent;
  onLike: (contentId: string, liked: boolean) => Promise<void>;
  onComment: (contentId: string) => void;
  onShare: (contentId: string) => Promise<void>;
  onAuthorPress: (authorId: string) => void;
  onSaveToLibrary?: (contentId: string, isBookmarked: boolean) => Promise<void>;
  socketManager?: SocketManager | null;
}

export interface MappedContent extends ContentCardContent {
  mediaUrl: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  author: { _id: string; firstName: string; lastName: string; avatar?: string };
}
