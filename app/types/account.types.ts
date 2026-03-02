// User Profile Types
export interface User {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string | null;
  avatarUpload?: string | null;
  bio?: string | null;
  section?: string;
  role?: string;
  isProfileComplete?: boolean;
  isEmailVerified?: boolean;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  section?: string;
}

// Content Types
export interface Post {
  _id: string;
  userId: string;
  content?: string;
  media: MediaItem[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  _id: string;
  userId: string;
  url: string;
  thumbnail: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  title?: string;
  description?: string;
  viewsCount?: number;
  likesCount?: number;
  createdAt: string;
}

export interface Video extends MediaItem {
  type: "video";
  duration: number;
  title: string;
  description?: string;
  viewsCount: number;
  likesCount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PostsResponse {
  posts: Post[];
  pagination: Pagination;
}

export interface MediaResponse {
  media: MediaItem[];
  pagination: Pagination;
}

export interface VideosResponse {
  videos: Video[];
  pagination: Pagination;
}

// Analytics Types
export interface UserAnalytics {
  posts: {
    total: number;
    published: number;
    drafts: number;
  };
  likes: {
    total: number;
    received: number;
  };
  liveSessions: {
    total: number;
    totalDuration: number;
  };
  comments: {
    total: number;
    received: number;
  };
  drafts: {
    total: number;
    posts: number;
    videos: number;
  };
  shares: {
    total: number;
    received: number;
  };
}

