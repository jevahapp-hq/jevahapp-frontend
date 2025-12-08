/**
 * Shared Comment Types
 * Centralized type definitions for comment-related functionality
 */

export interface Comment {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
  parentId?: string;
  userId?: string;
}

export interface CommentIconProps {
  comments: Comment[];
  size?: number;
  color?: string;
  showCount?: boolean;
  count?: number;
  layout?: "horizontal" | "vertical";
  contentId?: string;
  onPress?: () => void;
  style?: any;
  useAnimatedButton?: boolean;
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
  replies?: CommentData[];
  firstName?: string;
  lastName?: string;
  userFirstName?: string;
  userLastName?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  isLiked?: boolean;
}
