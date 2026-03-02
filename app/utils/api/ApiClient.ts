import { Platform } from "react-native";
import { PerformanceOptimizer } from "../performance";
import { CacheManager } from "../cache/CacheManager";
import { TokenManager } from "./TokenManager";
import { enhancedFetch } from "./fetchUtils";
import {
  API_BASE_URL,
  FetchOptions,
  UserData,
  CACHE_DURATION,
  AVATAR_CACHE_DURATION,
} from "./types";
import { UserProfileCache } from "../cache/UserProfileCache";

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
    try {
      const result = await this.request("/auth/me", { cache: true });

      // Validate the response structure
      if (!result) {
        throw new Error("No response received from server");
      }

      if (!result.user) {
        throw new Error("User data not found in response");
      }

      // Cache user profile by userId for content enrichment
      const userId = result.user.id || result.user._id;
      if (userId && result.user) {
        const userCacheKey = `user:${userId}`;
        this.cache.set(userCacheKey, result.user, AVATAR_CACHE_DURATION); // Cache for 30 minutes
      }

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

  // Profile Settings API Methods
  async getProfileSettingsConfig(): Promise<{
    success: boolean;
    data: Record<string, any>;
  }> {
    return this.request("/user/profile/settings-config", {
      method: "GET",
      cache: true,
    });
  }

  async getProfile(): Promise<{
    success: boolean;
    data: { user: UserData };
  }> {
    return this.request("/user/profile", {
      method: "GET",
      cache: true,
    });
  }

  async uploadProfileAvatar(fileUri: string): Promise<{
    success: boolean;
    data: {
      avatar: string;
      avatarUpload: string;
      previewUrl?: string;
      message: string;
    };
  }> {
    const token = await TokenManager.getToken();
    if (!token) throw new Error("No authentication token");

    const formData = new FormData();
    formData.append("avatar", {
      uri: fileUri,
      type: "image/jpeg",
      name: "avatar.jpg",
    } as any);

    // Use direct fetch for FormData to avoid issues with request method
    const response = await enhancedFetch(`${API_BASE_URL}/user/profile/upload-avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
        "expo-platform": Platform.OS,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || "Failed to upload avatar");
    }

    return response.json();
  }

  async updateProfileName(firstName?: string, lastName?: string): Promise<{
    success: boolean;
    data: {
      user: {
        _id: string;
        firstName: string;
        lastName: string;
        updatedAt: string;
      };
      message: string;
    };
  }> {
    return this.request("/user/profile/update-name", {
      method: "PUT",
      body: { firstName, lastName },
    });
  }

  async updateProfileLock(profileLock: boolean): Promise<{
    success: boolean;
    data: {
      settings: { profileLock: boolean };
      message: string;
    };
  }> {
    return this.request("/user/profile/update-lock", {
      method: "PUT",
      body: { profileLock },
    });
  }

  async updatePushNotifications(pushNotifications: boolean): Promise<{
    success: boolean;
    data: {
      settings: { pushNotifications: boolean };
      message: string;
    };
  }> {
    return this.request("/user/profile/update-push-notifications", {
      method: "PUT",
      body: { pushNotifications },
    });
  }

  async updateRecommendations(recommendationSettings: boolean): Promise<{
    success: boolean;
    data: {
      settings: { recommendationSettings: boolean };
      message: string;
    };
  }> {
    return this.request("/user/profile/update-recommendations", {
      method: "PUT",
      body: { recommendationSettings },
    });
  }

  async updateLiveSettings(liveSettings: boolean): Promise<{
    success: boolean;
    error?: string;
    code?: string;
    comingSoon?: boolean;
  }> {
    return this.request("/user/profile/update-live-settings", {
      method: "PUT",
      body: { liveSettings },
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

    const result = await this.request(`/api/media?${queryParams.toString()}`, {
      cache: true,
      cacheDuration: 2 * 60 * 1000, // 2 minutes for media
    });

    // Enrich media array with cached user data (fullname and avatar)
    if (result.media && Array.isArray(result.media)) {
      result.media = UserProfileCache.enrichContentArray(result.media);
    }

    return result;
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

