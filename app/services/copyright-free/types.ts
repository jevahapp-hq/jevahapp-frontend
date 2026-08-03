/**
 * Copyright-free music API types — aligned with BE Spotify/YTM-style payload (2026-08-02)
 */

export interface CopyrightFreeSongResponse {
  id?: string;
  _id?: string;
  title: string;
  artist?: string;
  artistName?: string;
  singer?: string;
  year?: number;
  audioUrl?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  category?: string;
  /** Seconds */
  duration?: number;
  durationSec?: number;
  contentType?: string;
  description?: string;
  speaker?: string;
  uploadedBy?: string | { _id: string; firstName: string; lastName: string };
  createdAt?: string;
  updatedAt?: string;
  views?: number;
  viewCount?: number;
  likes?: number;
  likeCount?: number;
  shareCount?: number;
  saveCount?: number;
  playCount?: number;
  isLiked?: boolean;
  isInLibrary?: boolean;
  isSaved?: boolean;
  shareUrl?: string;
  isPublicDomain?: boolean;
  processingStatus?: string;
  tags?: string[];
  fileSize?: number;
  bitrate?: number;
  format?: string;
  source?: "copyright-free" | "media" | string;
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

export interface AudioLibraryResponse {
  success: boolean;
  data: {
    items: CopyrightFreeSongResponse[];
    songs: CopyrightFreeSongResponse[];
    total: number;
  };
}
