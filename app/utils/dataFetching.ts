import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { PerformanceMonitor, PerformanceOptimizer } from "./performance";

// API Configuration
const API_BASE_URL = "https://jevahapp-backend-rped.onrender.com/api";

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const AVATAR_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CacheItem {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  cache?: boolean;
  cacheDuration?: number;
  retryCount?: number;
  timeout?: number;
}

interface UserData {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  avatarUpload?: string;
  email?: string;
  section?: string;
  role?: string;
  isProfileComplete?: boolean;
  isEmailVerified?: boolean;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Cache management
class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheItem>();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, data: any, duration: number = CACHE_DURATION): void {
    const expiresAt = Date.now() + duration;
    this.cache.set(key, { data, timestamp: Date.now(), expiresAt });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  remove(key: string): void {
    this.cache.delete(key);
  }
}

// Token management
class TokenManager {
  static async getToken(): Promise<string | null> {
    try {
      // Try multiple token sources
      let token = await AsyncStorage.getItem("userToken");
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }
      if (!token) {
        token = await SecureStore.getItemAsync("jwt");
      }
      return token;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  static async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("token", token);
      await SecureStore.setItemAsync("jwt", token);
    } catch (error) {
      console.error("Error setting token:", error);
    }
  }

  static async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("token");
      await SecureStore.deleteItemAsync("jwt");
    } catch (error) {
      console.error("Error clearing token:", error);
    }
  }
}

// Enhanced fetch with retry logic and timeout
async function enhancedFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    method = "GET",
    body,
    headers = {},
    retryCount = 3,
    timeout = 8000, // Reduced timeout for faster response
  } = options;

  PerformanceMonitor.startTimer(`fetch-${method}-${url}`);

  let lastError: Error;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    // Create a fresh controller and timeout per attempt to avoid reusing aborted signals
    const controller = new AbortController();
    const attemptTimeoutId = setTimeout(() => controller.abort(), timeout);

    // Build fetch options per attempt so we attach the fresh signal
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
        ...headers,
      },
      signal: controller.signal,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(attemptTimeoutId);
      PerformanceMonitor.endTimer(`fetch-${method}-${url}`);
      return response;
    } catch (error) {
      clearTimeout(attemptTimeoutId);
      lastError = error as Error;
      console.warn(`Fetch attempt ${attempt} failed:`, error);

      if (attempt === retryCount) {
        PerformanceMonitor.endTimer(`fetch-${method}-${url}`);
        throw lastError;
      }

      // Reduced wait time for faster retry
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(1.5, attempt) * 500)
      );
    }
  }

  throw lastError!;
}

// Main API client
export class ApiClient {
  private cache = CacheManager.getInstance();
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  // Refresh authentication token
  private async refreshToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const currentToken = await TokenManager.getToken();
        if (!currentToken) {
          console.log("🔄 No token to refresh");
          return null;
        }

        console.log("🔄 Attempting to refresh token...");

        const refreshResponse = await enhancedFetch(
          `${API_BASE_URL}/api/auth/refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ token: currentToken }),
          }
        );

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text().catch(() => "");
          console.log(
            `🔄 Token refresh failed: ${refreshResponse.status}`,
            errorText
          );

          // If refresh fails with 401, clear tokens
          if (refreshResponse.status === 401) {
            await TokenManager.clearToken();
            console.log("🔄 Session expired, tokens cleared");
          }

          return null;
        }

        const refreshData = await refreshResponse.json();
        const newToken =
          refreshData?.data?.token || refreshData?.token || null;

        if (!newToken) {
          console.log("🔄 Token refresh succeeded but no token in response");
          return null;
        }

        // Validate and store the new token
        // Check if token has valid JWT format (3 parts separated by dots)
        const parts = newToken.split(".");
        if (parts.length !== 3) {
          console.log("🔄 New token has invalid format");
          return null;
        }

        await TokenManager.setToken(newToken);
        console.log("✅ Token refreshed successfully");

        return newToken;
      } catch (error) {
        console.log("🔄 Token refresh error:", error);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T = any>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const {
      method = "GET",
      body,
      headers = {},
      cache = false,
      cacheDuration = CACHE_DURATION,
    } = options;

    const url = `${API_BASE_URL}${endpoint}`;
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;

    console.log(`🔍 API: Making ${method} request to: ${url}`);

    // Use performance optimizer for caching and request deduplication
    return PerformanceOptimizer.optimizedFetch(
      cacheKey,
      async () => {
        // Check cache for GET requests
        if (cache && method === "GET") {
          const cachedData = this.cache.get(cacheKey);
          if (cachedData) {
            return cachedData;
          }
        }

        // Get authentication token
        const token = await TokenManager.getToken();
        console.log(`🔑 API: Token found: ${token ? "Yes" : "No"}`);
        const requestHeaders = { ...headers };
        if (token) {
          requestHeaders.Authorization = `Bearer ${token}`;
        }

        // Add platform header
        requestHeaders["expo-platform"] = Platform.OS;

        try {
          const response = await enhancedFetch(url, {
            method,
            body,
            headers: requestHeaders,
            ...options,
          });

          // Handle 401 and 402 errors with token refresh (402 is used for auth failures)
          if ((response.status === 401 || response.status === 402) && token) {
            console.log(`🔄 Received ${response.status}, attempting token refresh...`);
            const newToken = await this.refreshToken();

            if (newToken) {
              // Retry the request with the new token
              const retryHeaders = {
                ...requestHeaders,
                Authorization: `Bearer ${newToken}`,
              };

              console.log(
                `🔄 Retrying request with new token: ${method} ${url}`
              );

              const retryResponse = await enhancedFetch(url, {
                method,
                body,
                headers: retryHeaders,
                ...options,
              });

              if (!retryResponse.ok) {
                const errorText = await retryResponse.text().catch(() => "");
                console.error(
                  `❌ API: HTTP ${retryResponse.status}: ${retryResponse.statusText}`
                );
                let errorMessage = `HTTP ${retryResponse.status}: ${retryResponse.statusText}`;

                try {
                  const errorData = await retryResponse.json();
                  if (errorData.message) {
                    errorMessage = errorData.message;
                  }
                } catch (parseError) {
                  // If we can't parse the error response, use the default message
                }

                throw new Error(errorMessage);
              }

              const retryData = await retryResponse.json();
              console.log(`✅ API: Response data after refresh:`, retryData);

              // Cache successful GET responses
              if (cache && method === "GET") {
                this.cache.set(cacheKey, retryData, cacheDuration);
              }

              return retryData;
            } else {
              // Token refresh failed, return the original error
              const errorText = await response.text().catch(() => "");
              console.log(
                `❌ API: Token refresh failed, returning 401 error`
              );
              throw new Error("Authentication failed. Please log in again.");
            }
          }

          if (!response.ok) {
            console.error(
              `❌ API: HTTP ${response.status}: ${response.statusText}`
            );
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

            try {
              const errorData = await response.json();
              if (errorData.message) {
                errorMessage = errorData.message;
              }
            } catch (parseError) {
              // If we can't parse the error response, use the default message
            }

            throw new Error(errorMessage);
          }

          const data = await response.json();
          console.log(`✅ API: Response data:`, data);

          // Cache successful GET responses
          if (cache && method === "GET") {
            this.cache.set(cacheKey, data, cacheDuration);
          }

          return data;
        } catch (error) {
          console.error(`API request failed: ${method} ${endpoint}`, error);
          throw error;
        }
      },
      {
        cacheDuration: cache ? cacheDuration : 0,
        background: method === "GET", // Run GET requests in background
      }
    );
  }

  // User-related API methods
  async getUserProfile(): Promise<{ user: UserData }> {
    console.log("🔍 API: Calling getUserProfile endpoint: /auth/me");
    try {
      const result = await this.request("/auth/me", { cache: true });
      console.log("✅ API: getUserProfile response:", result);

      // Validate the response structure
      if (!result) {
        throw new Error("No response received from server");
      }

      if (!result.user) {
        throw new Error("User data not found in response");
      }

      // Debug the user data structure
      console.log("🔍 API: User data structure:", {
        section: result.user.section,
        sectionType: typeof result.user.section,
        userKeys: Object.keys(result.user),
        fullUserData: result.user,
      });

      return result;
    } catch (error: any) {
      console.error("❌ API: getUserProfile error:", error);

      // Provide more specific error messages
      const msg: string = error?.message || "";
      if (
        msg.includes("401") ||
        msg.includes("402") ||
        msg.includes("Unauthorized")
      ) {
        throw new Error("Authentication failed. Please login again.");
      } else if (msg.includes("404")) {
        throw new Error("User profile not found.");
      } else if (
        msg.includes("Network") ||
        msg.includes("fetch") ||
        msg.includes("timeout") ||
        error?.name === "AbortError"
      ) {
        throw new Error("Network error. Please check your connection.");
      } else {
        throw new Error(msg || "Failed to fetch user profile");
      }
    }
  }

  async updateUserProfile(
    updates: Partial<UserData>
  ): Promise<{ user: UserData }> {
    return this.request("/auth/update-profile", {
      method: "PUT",
      body: updates,
    });
  }

  async uploadAvatar(fileUri: string): Promise<{ avatarUrl: string }> {
    const token = await TokenManager.getToken();
    if (!token) throw new Error("No authentication token");

    const formData = new FormData();
    formData.append("avatar", {
      uri: fileUri,
      type: "image/jpeg",
      name: "avatar.jpg",
    } as any);

    const response = await fetch(`${API_BASE_URL}/auth/upload-avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
        "expo-platform": Platform.OS,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Avatar upload failed: ${response.status}`);
    }

    return response.json();
  }

  // ============= ACCOUNT & PROFILE API METHODS =============

  /**
   * Get user's posts
   * GET /api/users/:userId/posts
   */
  async getUserPosts(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; data?: { posts: any[]; pagination: any }; error?: string }> {
    try {
      const result = await this.request(`/users/${userId}/posts?page=${page}&limit=${limit}`, {
        cache: true,
      });
      
      // Handle different response formats
      if (result.data) {
        return { success: true, data: result.data };
      }
      
      // If response is direct, wrap it
      if (result.posts) {
        return {
          success: true,
          data: {
            posts: result.posts,
            pagination: result.pagination || {
              page,
              limit,
              total: result.posts?.length || 0,
              totalPages: 1,
              hasMore: false,
            },
          },
        };
      }
      
      return { success: true, data: { posts: [], pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } } };
    } catch (error: any) {
      console.error("Error fetching user posts:", error);
      return { success: false, error: error.message || "Failed to fetch posts" };
    }
  }

  /**
   * Get user's media (images)
   * GET /api/users/:userId/media
   */
  async getUserMedia(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: "image" | "video"
  ): Promise<{ success: boolean; data?: { media: any[]; pagination: any }; error?: string }> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (type) {
        queryParams.append("type", type);
      }
      
      const result = await this.request(`/users/${userId}/media?${queryParams.toString()}`, {
        cache: true,
      });
      
      if (result.data) {
        return { success: true, data: result.data };
      }
      
      if (result.media) {
        return {
          success: true,
          data: {
            media: result.media,
            pagination: result.pagination || {
              page,
              limit,
              total: result.media?.length || 0,
              totalPages: 1,
              hasMore: false,
            },
          },
        };
      }
      
      return { success: true, data: { media: [], pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } } };
    } catch (error: any) {
      console.error("Error fetching user media:", error);
      return { success: false, error: error.message || "Failed to fetch media" };
    }
  }

  /**
   * Get user's videos
   * GET /api/users/:userId/videos
   */
  async getUserVideos(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; data?: { videos: any[]; pagination: any }; error?: string }> {
    try {
      const result = await this.request(`/users/${userId}/videos?page=${page}&limit=${limit}`, {
        cache: true,
      });
      
      if (result.data) {
        return { success: true, data: result.data };
      }
      
      if (result.videos) {
        return {
          success: true,
          data: {
            videos: result.videos,
            pagination: result.pagination || {
              page,
              limit,
              total: result.videos?.length || 0,
              totalPages: 1,
              hasMore: false,
            },
          },
        };
      }
      
      return { success: true, data: { videos: [], pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } } };
    } catch (error: any) {
      console.error("Error fetching user videos:", error);
      return { success: false, error: error.message || "Failed to fetch videos" };
    }
  }

  /**
   * Get user analytics
   * GET /api/users/:userId/analytics
   */
  async getUserAnalytics(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.request(`/users/${userId}/analytics`, {
        cache: true,
        cacheDuration: 2 * 60 * 1000, // Cache for 2 minutes
      });
      
      if (result.data) {
        return { success: true, data: result.data };
      }
      
      // If response is direct analytics object
      if (result.posts || result.likes) {
        return { success: true, data: result };
      }
      
      return { success: true, data: null };
    } catch (error: any) {
      console.error("Error fetching user analytics:", error);
      return { success: false, error: error.message || "Failed to fetch analytics" };
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const result = await this.request("/auth/logout", {
        method: "POST",
      });
      
      // Clear cache after logout
      this.cache.clear();
      
      return { success: true, message: result.message || "Logged out successfully" };
    } catch (error: any) {
      console.error("Error logging out:", error);
      // Still clear cache even if API call fails
      this.cache.clear();
      return { success: false, error: error.message || "Failed to logout" };
    }
  }

  // Media-related API methods
  async getMediaList(
    params: {
      contentType?: string;
      search?: string;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ media: any[]; total: number }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request(`/api/media?${queryParams.toString()}`, {
      cache: true,
      cacheDuration: 2 * 60 * 1000, // 2 minutes for media
    });
  }

  async getMediaById(id: string): Promise<any> {
    return this.request(`/api/media/${id}`, { cache: true });
  }

  // Content interaction API methods
  async toggleFavorite(contentId: string): Promise<{ isFavorite: boolean }> {
    return this.request(`/api/content/${contentId}/favorite`, {
      method: "POST",
    });
  }

  async saveContent(contentId: string): Promise<{ isSaved: boolean }> {
    return this.request(`/api/content/${contentId}/save`, {
      method: "POST",
    });
  }

  async getContentStats(contentId: string): Promise<any> {
    return this.request(`/api/content/${contentId}/stats`, {
      cache: true,
      cacheDuration: 60 * 1000, // 1 minute
    });
  }
}

// Avatar URL utilities
export class AvatarManager {
  private static cache = CacheManager.getInstance();

  static normalizeAvatarUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // Handle MongoDB avatar URLs
    if (url.startsWith("http")) {
      return url.trim();
    }

    // Handle local file paths
    if (url.startsWith("file://")) {
      return url;
    }

    // Handle relative paths
    if (url.startsWith("/")) {
      return `${API_BASE_URL}${url}`;
    }

    return url;
  }

  static async getAvatarUrl(userId: string): Promise<string | null> {
    const cacheKey = `avatar:${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const apiClient = new ApiClient();
      const response = await apiClient.getUserProfile();
      const avatarUrl = this.normalizeAvatarUrl(response.user.avatar);

      if (avatarUrl) {
        this.cache.set(cacheKey, avatarUrl, AVATAR_CACHE_DURATION);
      }

      return avatarUrl;
    } catch (error) {
      console.error("Error fetching avatar URL:", error);
      return null;
    }
  }

  static async preloadAvatar(url: string): Promise<void> {
    if (!url) return;

    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        // Avatar is accessible, cache it
        this.cache.set(`avatar:${url}`, url, AVATAR_CACHE_DURATION);
      }
    } catch (error) {
      console.warn("Failed to preload avatar:", error);
    }
  }
}

// Data synchronization utilities
export class DataSyncManager {
  private static instance: DataSyncManager;
  private syncQueue: Array<() => Promise<void>> = [];
  private isSyncing = false;

  static getInstance(): DataSyncManager {
    if (!DataSyncManager.instance) {
      DataSyncManager.instance = new DataSyncManager();
    }
    return DataSyncManager.instance;
  }

  async queueSync(syncFunction: () => Promise<void>): Promise<void> {
    this.syncQueue.push(syncFunction);
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;

    try {
      while (this.syncQueue.length > 0) {
        const syncFunction = this.syncQueue.shift();
        if (syncFunction) {
          await syncFunction();
        }
      }
    } catch (error) {
      console.error("Data sync error:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncUserData(): Promise<void> {
    await this.queueSync(async () => {
      const apiClient = new ApiClient();
      const userData = await apiClient.getUserProfile();
      await AsyncStorage.setItem("user", JSON.stringify(userData.user));
    });
  }

  async syncMediaData(): Promise<void> {
    await this.queueSync(async () => {
      const apiClient = new ApiClient();
      const mediaData = await apiClient.getMediaList();
      await AsyncStorage.setItem("mediaList", JSON.stringify(mediaData.media));
    });
  }
}

// Error handling utilities
export class ErrorHandler {
  static handleApiError(error: any): string {
    if (error.message?.includes("401") || error.message?.includes("402")) {
      return "Authentication required. Please sign in again.";
    }
    if (error.message?.includes("403")) {
      return "Access denied. You don't have permission for this action.";
    }
    if (error.message?.includes("404")) {
      return "Resource not found.";
    }
    if (error.message?.includes("500")) {
      return "Server error. Please try again later.";
    }
    if (error.message?.includes("Network")) {
      return "Network error. Please check your connection.";
    }
    return error.message || "An unexpected error occurred.";
  }

  static isNetworkError(error: any): boolean {
    return (
      error.message?.includes("Network") ||
      error.message?.includes("fetch") ||
      error.message?.includes("timeout")
    );
  }

  static isAuthError(error: any): boolean {
    return error.message?.includes("401") || error.message?.includes("402") || error.message?.includes("403");
  }
}

// Export singleton instances
export const apiClient = new ApiClient();
export const avatarManager = AvatarManager;
export const dataSyncManager = DataSyncManager.getInstance();
export const tokenManager = TokenManager;
export const cacheManager = CacheManager.getInstance();

// Convenience functions
export const fetchUserProfile = () => apiClient.getUserProfile();
export const fetchMediaList = (params?: any) => apiClient.getMediaList(params);
export const getAvatarUrl = (userId: string) =>
  AvatarManager.getAvatarUrl(userId);
export const normalizeAvatarUrl = (url: string) =>
  AvatarManager.normalizeAvatarUrl(url);
export const handleApiError = (error: any) =>
  ErrorHandler.handleApiError(error);
