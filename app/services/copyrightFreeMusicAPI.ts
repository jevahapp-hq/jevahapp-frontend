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
  // Request deduplication: track in-flight requests
  private pendingRequests: Map<string, Promise<any>> = new Map();
  // Cache: store successful responses temporarily
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
  // Error logging throttling
  private errorLogTimes: Map<string, number> = new Map();
  private readonly ERROR_LOG_THROTTLE = 10000; // 10 seconds between error logs

  constructor() {
    this.baseUrl = `${getApiBaseUrl()}/api/audio/copyright-free`;
  }

  /**
   * Check if we should log an error (throttle repeated errors)
   */
  private shouldLogError(key: string): boolean {
    const now = Date.now();
    const lastLogTime = this.errorLogTimes.get(key) || 0;
    
    if (now - lastLogTime > this.ERROR_LOG_THROTTLE) {
      this.errorLogTimes.set(key, now);
      return true;
    }
    return false;
  }

  /**
   * Get cached data if still valid
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key); // Expired cache
    }
    return null;
  }

  /**
   * Set cache data
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
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

      // Safe JSON parsing with error handling
      let data: CopyrightFreeSongsResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, return graceful error
        if (__DEV__) {
          console.warn("Failed to parse JSON response:", parseError);
        }
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

      // Safe JSON parsing
      let result: any;
      try {
        result = await response.json();
      } catch (parseError) {
        if (__DEV__) {
          console.warn("Failed to parse JSON response:", parseError);
        }
        return {
          success: false,
          data: null,
        };
      }
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
   * Includes request deduplication and improved error handling
   */
  async searchSongs(query: string, options: {
    category?: string;
    limit?: number;
    page?: number;
    sort?: "relevance" | "popular" | "newest" | "oldest" | "title";
  } = {}): Promise<CopyrightFreeSongsResponse> {
    const { category, limit = 20, page = 1, sort = "relevance" } = options;
    
    // Create unique request key for deduplication
    const requestKey = `searchSongs_${query}_${category || ""}_${page}_${limit}_${sort}`;

    // Check if there's already a pending request with same parameters
    const pendingRequest = this.pendingRequests.get(requestKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create new request
    const requestPromise = this._searchSongsWithRetry(query, options, requestKey);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request after completion
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Internal method to search songs with retry logic
   */
  private async _searchSongsWithRetry(
    query: string,
    options: {
      category?: string;
      limit?: number;
      page?: number;
      sort?: "relevance" | "popular" | "newest" | "oldest" | "title";
    },
    requestKey: string,
    retryCount = 0
  ): Promise<CopyrightFreeSongsResponse> {
    const maxRetries = 2;
    const retryableStatuses = [500, 502, 503, 504, 520]; // Server errors that might be transient

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
        const status = response.status;
        const isRetryable = retryableStatuses.includes(status) && retryCount < maxRetries;

        if (isRetryable) {
          // Exponential backoff: wait 1s, 2s, 4s...
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          if (this.shouldLogError(`search_retry_${status}`)) {
            console.warn(
              `Search API returned ${status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this._searchSongsWithRetry(query, options, requestKey, retryCount + 1);
        }

        // Non-retryable error or max retries reached
        if (this.shouldLogError(`search_error_${status}`)) {
          console.error(`Error searching copyright-free songs: HTTP ${status}`);
        }

        // Return graceful error response
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

      // Safe JSON parsing
      let unifiedData: any;
      try {
        unifiedData = await response.json();
      } catch (parseError) {
        if (__DEV__) {
          console.warn("Failed to parse JSON response:", parseError);
        }
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");

      // Retry network errors if we haven't exceeded max retries
      if (isNetworkError && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        if (this.shouldLogError(`search_network_retry`)) {
          console.warn(
            `Network error searching songs, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._searchSongsWithRetry(query, options, requestKey, retryCount + 1);
      }

      // Log error (throttled)
      if (this.shouldLogError(`search_error`)) {
        if (isNetworkError) {
          console.warn("Network error searching copyright-free songs (offline or server unreachable)");
        } else {
          console.error("Error searching copyright-free songs:", error);
        }
      }

      // Return graceful error response instead of throwing
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
  }

  /**
   * Get all categories
   * Uses request deduplication, caching, and improved error handling
   */
  async getCategories(): Promise<CopyrightFreeSongCategoriesResponse> {
    const cacheKey = "categories";
    const requestKey = "getCategories";

    // Check cache first
    const cached = this.getCached<CopyrightFreeSongCategoriesResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending request
    const pendingRequest = this.pendingRequests.get(requestKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create new request
    const requestPromise = this._fetchCategoriesWithRetry(cacheKey, requestKey);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request after completion
      this.pendingRequests.delete(requestKey);
      // Clean expired cache periodically
      this.clearExpiredCache();
    }
  }

  /**
   * Internal method to fetch categories with retry logic
   */
  private async _fetchCategoriesWithRetry(
    cacheKey: string,
    requestKey: string,
    retryCount = 0
  ): Promise<CopyrightFreeSongCategoriesResponse> {
    const maxRetries = 2;
    const retryableStatuses = [500, 502, 503, 504, 520]; // Server errors that might be transient

    try {
      const response = await fetch(`${this.baseUrl}/categories`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const status = response.status;
        const isRetryable = retryableStatuses.includes(status) && retryCount < maxRetries;

        if (isRetryable) {
          // Exponential backoff: wait 1s, 2s, 4s...
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          if (this.shouldLogError(`categories_retry_${status}`)) {
            console.warn(
              `Categories API returned ${status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this._fetchCategoriesWithRetry(cacheKey, requestKey, retryCount + 1);
        }

        // Non-retryable error or max retries reached
        // Only log in dev mode - HTTP 400/404 are expected for missing endpoints
        if (__DEV__ && this.shouldLogError(`categories_error_${status}`)) {
          console.error(`Error fetching categories: HTTP ${status}`);
        }

        // Return graceful error response instead of throwing
        return {
          success: false,
          data: {
            categories: [],
          },
        };
      }

      // Safe JSON parsing
      let data: CopyrightFreeSongCategoriesResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        if (__DEV__) {
          console.warn("Failed to parse JSON response:", parseError);
        }
        return {
          success: false,
          data: {
            categories: [],
          },
        };
      }

      // Cache successful response
      if (data.success) {
        this.setCache(cacheKey, data);
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");

      // Retry network errors if we haven't exceeded max retries
      if (isNetworkError && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        if (this.shouldLogError(`categories_network_retry`)) {
          console.warn(
            `Network error fetching categories, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._fetchCategoriesWithRetry(cacheKey, requestKey, retryCount + 1);
      }

      // Log error (throttled)
      if (this.shouldLogError(`categories_error`)) {
        if (isNetworkError) {
          console.warn("Network error fetching categories (offline or server unreachable)");
        } else {
          console.error("Error fetching categories:", error);
        }
      }

      // Return graceful error response instead of throwing
      return {
        success: false,
        data: {
          categories: [],
        },
      };
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

      // Safe JSON parsing
      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        if (__DEV__) {
          console.warn("Failed to parse JSON response:", parseError);
        }
        return {
          success: false,
          data: null,
        };
      }
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

      // Safe JSON parsing
      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        if (__DEV__) {
          console.warn("Failed to parse JSON response:", parseError);
        }
        return {
          success: false,
          data: null,
        };
      }
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

