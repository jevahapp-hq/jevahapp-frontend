export interface AllMediaItem {
  _id: string;
  title: string;
  description?: string;
  contentType: "videos" | "music" | "books" | "live";
  category?: string;
  topics?: string[];
  fileUrl: string;
  thumbnailUrl?: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  duration?: number;
  viewCount?: number;
  listenCount?: number;
  readCount?: number;
  downloadCount?: number;
  favoriteCount?: number;
  shareCount?: number;
  commentCount?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AllMediaResponse {
  success: boolean;
  media: AllMediaItem[];
  pagination: Pagination;
}

/** Standard `{ success, data?, error? }` envelope used by the mutation calls. */
export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ContentListResult {
  success: boolean;
  media?: any[];
  total?: number;
  error?: string;
}

export interface DefaultContentResult {
  success: boolean;
  data: {
    content: any[];
    pagination: Pagination;
  };
  error?: string;
}

export const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
};
