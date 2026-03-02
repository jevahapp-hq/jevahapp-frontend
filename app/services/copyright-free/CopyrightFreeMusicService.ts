/**
 * Copyright-free music API service
 * Handles fetching, search, likes, saves, and view tracking for copyright-free songs.
 */
import { getApiBaseUrl } from "../../utils/api";
import TokenUtils from "../../utils/tokenUtils";
import type {
  CopyrightFreeSongResponse,
  CopyrightFreeSongsResponse,
  CopyrightFreeSongCategoriesResponse,
} from "./types";

class CopyrightFreeMusicAPI {
  private baseUrl: string;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private errorLogTimes: Map<string, number> = new Map();
  private readonly ERROR_LOG_THROTTLE = 10000; // 10 seconds between error logs

  constructor() {
    this.baseUrl = `${getApiBaseUrl()}/api/audio/copyright-free`;
  }

  private shouldLogError(key: string): boolean {
    const now = Date.now();
    const lastLogTime = this.errorLogTimes.get(key) || 0;
    if (now - lastLogTime > this.ERROR_LOG_THROTTLE) {
      this.errorLogTimes.set(key, now);
      return true;
    }
    return false;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    if (cached) this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.CACHE_TTL) this.cache.delete(key);
    }
  }

  async getAllSongs(options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: "popular" | "newest" | "oldest" | "title";
  } = {}): Promise<CopyrightFreeSongsResponse> {
    try {
      const { page = 1, limit = 20, category, search, sort = "popular" } = options;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sort,
      });
      if (category) params.append("category", category);
      if (search) params.append("search", search);

      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      let data: CopyrightFreeSongsResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        if (__DEV__) console.warn("Failed to parse JSON response:", parseError);
        return { success: false, data: { songs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } };
      }
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");

      if (isNetworkError && !__DEV__) {
        return { success: false, data: { songs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } };
      }
      if (__DEV__) console.error("Error fetching copyright-free songs:", error);
      throw error;
    }
  }

  async getSongById(songId: string): Promise<{
    success: boolean;
    data: CopyrightFreeSongResponse;
  }> {
    try {
      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${this.baseUrl}/${songId}`, { method: "GET", headers });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      let result: any;
      try {
        result = await response.json();
      } catch (parseError) {
        if (__DEV__) console.warn("Failed to parse JSON response:", parseError);
        return { success: false, data: {} as CopyrightFreeSongResponse };
      }
      return { success: result.success, data: result.data as CopyrightFreeSongResponse };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");

      if (isNetworkError && !__DEV__) {
        return { success: false, data: {} as CopyrightFreeSongResponse };
      }
      if (__DEV__) console.error(`Error fetching song ${songId}:`, error);
      throw error;
    }
  }

  async searchSongs(
    query: string,
    options: { category?: string; limit?: number; page?: number; sort?: "relevance" | "popular" | "newest" | "oldest" | "title" } = {}
  ): Promise<CopyrightFreeSongsResponse> {
    const requestKey = `searchSongs_${query}_${options.category || ""}_${options.page || 1}_${options.limit || 20}_${options.sort || "relevance"}`;

    const pendingRequest = this.pendingRequests.get(requestKey);
    if (pendingRequest) return pendingRequest;

    const requestPromise = this._searchSongsWithRetry(query, options, requestKey);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  private async _searchSongsWithRetry(
    query: string,
    options: { category?: string; limit?: number; page?: number; sort?: string },
    requestKey: string,
    retryCount = 0
  ): Promise<CopyrightFreeSongsResponse> {
    const maxRetries = 2;
    const retryableStatuses = [500, 502, 503, 504, 520];
    const { category, limit = 20, page = 1, sort = "relevance" } = options;

    try {
      const baseUrl = `${getApiBaseUrl()}/api/search`;
      const params = new URLSearchParams({
        q: query.trim(),
        contentType: "copyright-free",
        page: page.toString(),
        limit: limit.toString(),
        sort,
      });
      if (category) params.append("category", category);

      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${baseUrl}?${params.toString()}`, { method: "GET", headers });

      if (!response.ok) {
        const status = response.status;
        const isRetryable = retryableStatuses.includes(status) && retryCount < maxRetries;

        if (isRetryable) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          if (this.shouldLogError(`search_retry_${status}`)) {
            console.warn(`Search API returned ${status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          }
          await new Promise((r) => setTimeout(r, delay));
          return this._searchSongsWithRetry(query, options, requestKey, retryCount + 1);
        }

        if (this.shouldLogError(`search_error_${status}`)) console.error(`Error searching copyright-free songs: HTTP ${status}`);
        return { success: false, data: { songs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } };
      }

      let unifiedData: any;
      try {
        unifiedData = await response.json();
      } catch (parseError) {
        if (__DEV__) console.warn("Failed to parse JSON response:", parseError);
        return { success: false, data: { songs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } };
      }

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
          viewCount: Math.max(Number(item.viewCount ?? item.views ?? 0) || 0, Number(item.likeCount ?? item.likes ?? 0) || 0),
          views: Math.max(Number(item.views ?? item.viewCount ?? 0) || 0, Number(item.likes ?? item.likeCount ?? 0) || 0),
          likeCount: item.likeCount ?? item.likes ?? 0,
          likes: item.likes ?? item.likeCount ?? 0,
          isLiked: item.isLiked || false,
          isInLibrary: item.isInLibrary || false,
          isPublicDomain: item.isPublicDomain !== undefined ? item.isPublicDomain : true,
        }));

        return { success: true, data: { songs, pagination: unifiedData.data.pagination } };
      }

      return { success: false, data: { songs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");

      if (isNetworkError && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        if (this.shouldLogError(`search_network_retry`))
          console.warn(`Network error searching songs, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
        await new Promise((r) => setTimeout(r, delay));
        return this._searchSongsWithRetry(query, options, requestKey, retryCount + 1);
      }

      if (this.shouldLogError(`search_error`)) {
        if (isNetworkError) console.warn("Network error searching copyright-free songs (offline or server unreachable)");
        else console.error("Error searching copyright-free songs:", error);
      }

      return { success: false, data: { songs: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } };
    }
  }

  async getCategories(): Promise<CopyrightFreeSongCategoriesResponse> {
    const cacheKey = "categories";
    const requestKey = "getCategories";

    const cached = this.getCached<CopyrightFreeSongCategoriesResponse>(cacheKey);
    if (cached) return cached;

    const pendingRequest = this.pendingRequests.get(requestKey);
    if (pendingRequest) return pendingRequest;

    const requestPromise = this._fetchCategoriesWithRetry(cacheKey, requestKey);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
      this.clearExpiredCache();
    }
  }

  private async _fetchCategoriesWithRetry(
    cacheKey: string,
    requestKey: string,
    retryCount = 0
  ): Promise<CopyrightFreeSongCategoriesResponse> {
    const maxRetries = 2;
    const retryableStatuses = [500, 502, 503, 504, 520];

    try {
      const response = await fetch(`${this.baseUrl}/categories`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const status = response.status;
        const isRetryable = retryableStatuses.includes(status) && retryCount < maxRetries;

        if (isRetryable) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          if (this.shouldLogError(`categories_retry_${status}`)) {
            console.warn(`Categories API returned ${status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
          }
          await new Promise((r) => setTimeout(r, delay));
          return this._fetchCategoriesWithRetry(cacheKey, requestKey, retryCount + 1);
        }

        if (__DEV__ && this.shouldLogError(`categories_error_${status}`)) console.error(`Error fetching categories: HTTP ${status}`);
        return { success: false, data: { categories: [] } };
      }

      let data: CopyrightFreeSongCategoriesResponse;
      try {
        data = await response.json();
      } catch (parseError) {
        if (__DEV__) console.warn("Failed to parse JSON response:", parseError);
        return { success: false, data: { categories: [] } };
      }

      if (data.success) this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");

      if (isNetworkError && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        if (this.shouldLogError(`categories_network_retry`)) {
          console.warn(`Network error fetching categories, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
        }
        await new Promise((r) => setTimeout(r, delay));
        return this._fetchCategoriesWithRetry(cacheKey, requestKey, retryCount + 1);
      }

      if (this.shouldLogError(`categories_error`)) {
        if (isNetworkError) console.warn("Network error fetching categories (offline or server unreachable)");
        else console.error("Error fetching categories:", error);
      }

      return { success: false, data: { categories: [] } };
    }
  }

  async toggleLike(songId: string): Promise<{
    success: boolean;
    data: { liked: boolean; likeCount: number; viewCount: number; listenCount: number };
  }> {
    try {
      const token = await TokenUtils.getAuthToken();
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${this.baseUrl}/${songId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        if (__DEV__) console.warn("Failed to parse JSON response:", parseError);
        return { success: false, data: null };
      }
      return data;
    } catch (error) {
      console.error(`Error toggling like for song ${songId}:`, error);
      throw error;
    }
  }

  async toggleSave(songId: string): Promise<{
    success: boolean;
    data: { bookmarked: boolean; bookmarkCount: number };
  }> {
    try {
      const token = await TokenUtils.getAuthToken();
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${this.baseUrl}/${songId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      let data: any;
      try {
        data = await response.json();
      } catch (parseError) {
        if (__DEV__) console.warn("Failed to parse JSON response:", parseError);
        return { success: false, data: null };
      }
      return data;
    } catch (error) {
      console.error(`Error toggling save for song ${songId}:`, error);
      throw error;
    }
  }

  async recordView(
    songId: string,
    payload?: { durationMs?: number; progressPct?: number; isComplete?: boolean }
  ): Promise<{ success: boolean; data: { viewCount: number; hasViewed: boolean } }> {
    try {
      const token = await TokenUtils.getAuthToken();
      if (!token) throw new Error("Authentication required");

      const url = `${this.baseUrl}/${songId}/view`;
      if (__DEV__) console.log(`🌐 Calling POST ${url}`, { songId, payload, hasToken: !!token });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload || {}),
      });

      if (__DEV__) console.log(`📥 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        if (__DEV__) console.error(`❌ API Error Response:`, { status: response.status, body: errorText });
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      if (__DEV__) console.log(`✅ View API Success:`, { success: data.success, viewCount: data.data?.viewCount });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNetworkError =
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");

      if (isNetworkError) {
        if (__DEV__) {
          const errorKey = `network_error_view_${songId}_${Date.now()}`;
          if (!(global as any).__loggedNetworkErrors) (global as any).__loggedNetworkErrors = new Set();
          if (!(global as any).__loggedNetworkErrors.has(errorKey)) {
            (global as any).__loggedNetworkErrors.add(errorKey);
            setTimeout(() => (global as any).__loggedNetworkErrors?.delete(errorKey), 10000);
            console.warn(`⚠️ Network error recording view for song ${songId} (offline or server unreachable)`);
          }
        }
        return { success: false, data: { viewCount: 0, hasViewed: false } };
      }

      if (__DEV__) console.error(`❌ Error recording view for song ${songId}:`, error);
      return { success: false, data: { viewCount: 0, hasViewed: false } };
    }
  }
}

export default new CopyrightFreeMusicAPI();
