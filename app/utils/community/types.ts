// Community API Types

// Prayer Wall Types
export interface PrayerRequest {
  _id: string;
  userId: string;
  prayerText: string;
  verse?: {
    text: string;
    reference: string;
  };
  color: string;
  shape:
    | "rectangle"
    | "circle"
    | "scalloped"
    | "square"
    | "square2"
    | "square3"
    | "square4";
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  userLiked?: boolean;
  author: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  anonymous?: boolean;
  media?: string[];
  relevanceScore?: number; // For search results
}

export interface CreatePrayerRequest {
  prayerText: string;
  verse?: {
    text: string;
    reference: string;
  };
  color: string;
  shape:
    | "rectangle"
    | "circle"
    | "scalloped"
    | "square"
    | "square2"
    | "square3"
    | "square4";
  anonymous?: boolean;
  media?: string[];
}

export interface PrayerComment {
  _id: string;
  userId: string;
  content: string;
  createdAt: string;
  likesCount: number;
  userLiked?: boolean;
  author: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  replies?: PrayerComment[];
  parentCommentId?: string;
}

// Forum Types
export interface Forum {
  _id: string;
  title: string;
  description: string;
  createdBy?:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        username: string;
      };
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  postsCount: number;
  participantsCount: number;
  isCategory?: boolean;
  categoryId?: string;
  category?: {
    id?: string;
    _id?: string;
    title: string;
    description?: string;
  };
  forumsCount?: number; // For category-level forum counts
}

export interface ForumPost {
  _id: string;
  forumId: string;
  userId?: string;
  content: string;
  embeddedLinks?: Array<{
    url: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    type: "video" | "article" | "resource" | "other";
  }>;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  likesCount: number;
  commentsCount: number;
  userLiked?: boolean;
  author?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  user?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  forum?: {
    _id: string;
    title: string;
  };
}

export interface ForumComment {
  _id: string;
  postId: string;
  userId?: string;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  likesCount: number;
  userLiked?: boolean;
  replies?: ForumComment[];
  author?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  user?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

// Groups Types
export interface Group {
  _id: string;
  name: string;
  description: string;
  profileImageUrl?: string;
  createdBy: string;
  isPublic: boolean;
  visibility?: "public" | "private";
  membersCount: number;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    _id: string;
    userId: string;
    role: "admin" | "member";
    joinedAt: string;
    user: {
      _id: string;
      username: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
  }>;
  creator?: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  isMember?: boolean;
  userRole?: "admin" | "member";
  role?: "admin" | "member"; // For my groups response
  joinedAt?: string;
}

// Polls Types
export interface PollOption {
  _id: string;
  text: string;
  votesCount: number;
  percentage: number;
}

export interface Poll {
  _id: string;
  id?: string; // Alias for _id
  question: string; // Primary field
  title?: string; // Fallback for backward compatibility
  description?: string;
  createdBy?: string;
  options: PollOption[];
  totalVotes: number;
  createdAt: string;
  expiresAt?: string;
  closesAt?: string; // Alias for expiresAt
  isActive: boolean;
  userVoted?: boolean;
  userVoteOptionId?: string | string[]; // Support single or multiple selections
  multiSelect?: boolean;
  createdByUser?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  author?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// Common Types
export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  details?: any;
}
