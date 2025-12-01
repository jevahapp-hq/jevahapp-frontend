import { getApiBaseUrl } from "../utils/api";
import TokenUtils from "../utils/tokenUtils";

export interface CopyrightFreeSongResponse {
  // Support both id and _id from backend
  id?: string;
  _id?: string;
  title: string;
  // Backend may use either artist or singer
  artist?: string;
  singer?: string;
  year: number;
  // Support both fileUrl and audioUrl
  audioUrl?: string;
  fileUrl?: string;
  thumbnailUrl: string;
  category: string;
  duration: number;
  contentType: "copyright-free-music";
  description: string;
  speaker?: string;
  // uploadedBy can be string or populated object
  uploadedBy: string | { _id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt?: string;
  // Support both views and viewCount
  views?: number;
  viewCount?: number;
  // Support both likes and likeCount
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

class CopyrightFreeMusicAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${getApiBaseUrl()}/api/audio/copyright-free`;
  }

  /**
   * Get all copyright-free songs with pagination and filters
   */
  async getAllSongs(options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: "popular" | "newest" | "oldest" | "title";
  } = {}): Promise<CopyrightFreeSongsResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        sort = "popular",
      } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sort, // backend expects sortBy
      });

      if (category) params.append("category", category);
      if (search) params.append("search", search);

      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CopyrightFreeSongsResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching copyright-free songs:", error);
      throw error;
    }
  }

  /**
   * Get a single copyright-free song by ID
   */
  async getSongById(songId: string): Promise<{
    success: boolean;
    data: CopyrightFreeSongResponse;
  }> {
    try {
      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/${songId}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Backend returns { success: true, data: Song }
      return {
        success: result.success,
        data: result.data as CopyrightFreeSongResponse,
      };
    } catch (error) {
      console.error(`Error fetching song ${songId}:`, error);
      throw error;
    }
  }

  /**
   * Search copyright-free songs
   */
  async searchSongs(query: string, options: {
    category?: string;
    limit?: number;
  } = {}): Promise<CopyrightFreeSongsResponse> {
    try {
      const { category, limit = 20 } = options;

      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
      });

      if (category) params.append("category", category);

      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CopyrightFreeSongsResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error searching copyright-free songs:", error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<CopyrightFreeSongCategoriesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/categories`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CopyrightFreeSongCategoriesResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  }

  /**
   * Toggle like/unlike for a song (single POST endpoint)
   */
  async toggleLike(songId: string): Promise<{
    success: boolean;
    data: {
      liked: boolean;
      likeCount: number;
      viewCount: number;
      listenCount: number;
    };
  }> {
    try {
      const token = await TokenUtils.getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`${this.baseUrl}/${songId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error toggling like for song ${songId}:`, error);
      throw error;
    }
  }

  /**
   * Toggle save/unsave for a song (single POST endpoint)
   */
  async toggleSave(songId: string): Promise<{
    success: boolean;
    data: {
      bookmarked: boolean;
      bookmarkCount: number;
    };
  }> {
    try {
      const token = await TokenUtils.getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`${this.baseUrl}/${songId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error toggling save for song ${songId}:`, error);
      throw error;
    }
  }
}

export default new CopyrightFreeMusicAPI();

