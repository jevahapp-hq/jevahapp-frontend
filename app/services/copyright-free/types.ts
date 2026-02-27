/**
 * Copyright-free music API types
 */

export interface CopyrightFreeSongResponse {
  id?: string;
  _id?: string;
  title: string;
  artist?: string;
  singer?: string;
  year: number;
  audioUrl?: string;
  fileUrl?: string;
  thumbnailUrl: string;
  category: string;
  duration: number;
  contentType: "copyright-free-music";
  description: string;
  speaker?: string;
  uploadedBy: string | { _id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt?: string;
  views?: number;
  viewCount?: number;
  likes?: number;
  likeCount?: number;
  isLiked?: boolean;
  isInLibrary?: boolean;
  isPublicDomain?: boolean;
  tags?: string[];
  fileSize?: number;
  bitrate?: number;
  format?: string;
}

export interface CopyrightFreeSongsResponse {
  success: boolean;
  data: {
    songs: CopyrightFreeSongResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message?: string;
}

export interface CopyrightFreeSongCategoriesResponse {
  success: boolean;
  data: {
    categories: Array<{
      name: string;
      count: number;
      icon?: string;
    }>;
  };
}
