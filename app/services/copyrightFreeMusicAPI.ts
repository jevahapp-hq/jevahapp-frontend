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
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle network errors gracefully
      const isNetworkError = 
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");
      
      if (isNetworkError && !__DEV__) {
        // In production, don't log network errors (they're expected when offline)
        // Return empty result so frontend can use cached data
        return {
          success: false,
          data: {
            songs: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
            },
          },
        };
      }
      
      if (__DEV__) {
        console.error("Error fetching copyright-free songs:", error);
      }
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle network errors gracefully
      const isNetworkError = 
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");
      
      if (isNetworkError && !__DEV__) {
        // In production, return error result gracefully
        return {
          success: false,
          data: {} as CopyrightFreeSongResponse,
        };
      }
      
      if (__DEV__) {
        console.error(`Error fetching song ${songId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Search copyright-free songs
   * Uses unified search endpoint with contentType filter
   */
  async searchSongs(query: string, options: {
    category?: string;
    limit?: number;
    page?: number;
    sort?: "relevance" | "popular" | "newest" | "oldest" | "title";
  } = {}): Promise<CopyrightFreeSongsResponse> {
    try {
      const { category, limit = 20, page = 1, sort = "relevance" } = options;

      // Use unified search endpoint with copyright-free filter
      const baseUrl = `${getApiBaseUrl()}/api/search`;
      const params = new URLSearchParams({
        q: query.trim(),
        contentType: "copyright-free",
        page: page.toString(),
        limit: limit.toString(),
        sort,
      });

      if (category) {
        params.append("category", category);
      }

      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const unifiedData = await response.json();

      // Transform unified search response to CopyrightFreeSongsResponse format
      if (unifiedData.success && unifiedData.data) {
        const songs = unifiedData.data.results.map((item: any) => ({
          id: item.id || item._id,
          _id: item._id || item.id,
          title: item.title,
          artist: item.artist || item.singer,
          singer: item.singer || item.artist,
          year: item.year || new Date(item.createdAt).getFullYear(),
          audioUrl: item.audioUrl || item.fileUrl,
          fileUrl: item.fileUrl || item.audioUrl,
          thumbnailUrl: item.thumbnailUrl || "",
          category: item.category || "",
          duration: item.duration || 0,
          contentType: "copyright-free-music" as const,
          description: item.description || "",
          speaker: item.speaker,
          uploadedBy: item.uploadedBy || "system",
          createdAt: item.createdAt,
          viewCount: item.viewCount || item.views || 0,
          views: item.views || item.viewCount || 0,
          likeCount: item.likeCount || item.likes || 0,
          likes: item.likes || item.likeCount || 0,
          isLiked: item.isLiked || false,
          isInLibrary: item.isInLibrary || false,
          isPublicDomain: item.isPublicDomain !== undefined ? item.isPublicDomain : true,
        }));

        return {
          success: true,
          data: {
            songs,
            pagination: unifiedData.data.pagination,
          },
        };
      }

      // Fallback to empty response
      return {
        success: false,
        data: {
          songs: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        },
      };
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

  /**
   * Record a view for a song
   * Tracks user engagement (duration, progress, completion)
   */
  async recordView(
    songId: string,
    payload?: {
      durationMs?: number;
      progressPct?: number;
      isComplete?: boolean;
    }
  ): Promise<{
    success: boolean;
    data: {
      viewCount: number;
      hasViewed: boolean;
    };
  }> {
    try {
      const token = await TokenUtils.getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const url = `${this.baseUrl}/${songId}/view`;
      if (__DEV__) {
        console.log(`🌐 Calling POST ${url}`, {
          songId,
          payload,
          hasToken: !!token,
        });
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload || {}),
      });

      if (__DEV__) {
        console.log(`📥 Response status: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (__DEV__) {
          console.error(`❌ API Error Response:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
        }
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      if (__DEV__) {
        console.log(`✅ View API Success:`, {
          success: data.success,
          viewCount: data.data?.viewCount,
          hasViewed: data.data?.hasViewed,
        });
      }
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle network errors gracefully - don't spam logs
      const isNetworkError = 
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");
      
      if (isNetworkError) {
        // Only log network errors in development, and throttle them
        if (__DEV__) {
          const errorKey = `network_error_view_${songId}_${Date.now()}`;
          if (!(global as any).__loggedNetworkErrors) {
            (global as any).__loggedNetworkErrors = new Set();
          }
          if (!(global as any).__loggedNetworkErrors.has(errorKey)) {
            (global as any).__loggedNetworkErrors.add(errorKey);
            setTimeout(() => {
              (global as any).__loggedNetworkErrors?.delete(errorKey);
            }, 10000); // 10 second throttle
            console.warn(`⚠️ Network error recording view for song ${songId} (offline or server unreachable)`);
          }
        }
        
        // Return error result gracefully - view tracking failure shouldn't break the app
        return {
          success: false,
          data: {
            viewCount: 0,
            hasViewed: false,
          },
        };
      }
      
      // Log other errors normally in dev
      if (__DEV__) {
        console.error(`❌ Error recording view for song ${songId}:`, error);
      }
      
      // Return error result gracefully
      return {
        success: false,
        data: {
          viewCount: 0,
          hasViewed: false,
        },
      };
    }
  }
}

export default new CopyrightFreeMusicAPI();

