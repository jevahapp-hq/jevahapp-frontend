// Content Interaction API Service
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE_URL } from "./api";

// Perf: avoid console overhead in production (73+ logs per session)
const devLog = __DEV__ ? (...a: any[]) => console.log(...a) : () => {};
const devWarn = __DEV__ ? (...a: any[]) => console.warn(...a) : () => {};

const RECORD_VIEW_MIN_INTERVAL_MS = 2500;
const recordViewThrottle: { lastTime?: number; backoffUntil?: number } = {};

// Types for content interactions
export interface ContentInteraction {
  contentId: string;
  contentType: "video" | "audio" | "ebook" | "sermon" | "live";
  userId: string;
  interactionType: "like" | "save" | "share" | "view" | "comment";
  timestamp: string;
}

export interface ContentStats {
  contentId: string;
  likes: number;
  saves: number;
  shares: number;
  views: number;
  comments: number;
  userInteractions: {
    liked: boolean;
    saved: boolean;
    shared: boolean;
    viewed: boolean;
  };
}

export interface CommentData {
  id: string;
  contentId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  comment: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean; // Whether current user liked this comment
  replies?: CommentData[];
}

class ContentInteractionService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL || "https://api.jevahapp.com"; // Fallback for development
  }

  private isValidObjectId(id?: string): boolean {
    return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
  }

  // Get authorization header with user token
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const userStr = await AsyncStorage.getItem("user");

      // Try multiple token keys since your app uses different ones
      let token = await AsyncStorage.getItem("userToken"); // From api.ts
      if (!token) {
        token = await AsyncStorage.getItem("token"); // From login.tsx, codeVerification.tsx
      }
      if (!token) {
        // Try SecureStore for OAuth tokens
        try {
          const { default: SecureStore } = await import("expo-secure-store");
          token = await SecureStore.getItemAsync("jwt"); // From OAuth flow
        } catch (secureStoreError) {
          devLog("SecureStore not available or no JWT token");
        }
      }

      if (token) {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "expo-platform": Platform.OS,
        };
      }

      devWarn("⚠️ No token found in AsyncStorage or SecureStore");
      return {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
    } catch (error) {
      console.error("Error getting auth headers:", error);
      return {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
    }
  }

  // Get current user ID
  private async getCurrentUserId(): Promise<string> {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user._id || user.id || user.email || "anonymous";
      }
      return "anonymous";
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return "anonymous";
    }
  }

  // Map frontend content types to backend expected types
  // Per Like State Persistence Integration Guide (backend supports: media, devotional, artist, merch, ebook, podcast)
  private mapContentTypeToBackend(contentType: string): string {
    const normalized = (contentType || "").toLowerCase();

    if (normalized === "artist") return "artist";
    if (normalized === "merch") return "merch";
    if (normalized === "devotional" || normalized === "sermon" || normalized === "sermons")
      return "devotional";
    if (
      normalized === "ebook" ||
      normalized === "e-books" ||
      normalized === "ebooks" ||
      normalized === "books"
    )
      return "ebook";
    if (normalized === "podcast" || normalized === "podcasts") return "podcast";

    // video, videos, audio, music, live, image, teachings, etc. → media
    return "media";
  }

  // ============= LIKE INTERACTIONS =============
  async toggleLike(
    contentId: string,
    contentType: string
  ): Promise<{ liked: boolean; totalLikes: number }> {
    // Map content types to backend expected types (move outside try block)
    const backendContentType = this.mapContentTypeToBackend(contentType);

    try {
      if (!this.isValidObjectId(contentId)) {
        return this.fallbackToggleLike(contentId);
      }
      const headers = await this.getAuthHeaders();

      const requestUrl = `${this.baseURL}/api/content/${backendContentType}/${contentId}/like`;
      devLog(
        "📡 TOGGLE LIKE: Making request",
        JSON.stringify(
          {
            url: requestUrl,
            method: "POST",
            hasAuth: Boolean((headers as any)?.Authorization),
            contentTypeHeader: (headers as any)?.["Content-Type"],
            contentType: backendContentType,
            contentId,
          },
          null,
          2
        )
      );

      // Use the correct endpoint from backend docs
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      });

      devLog(
        "📡 TOGGLE LIKE: Response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use text as message
        }
        
        // Handle specific error codes per guide
        if (response.status === 401) {
          // Token expired or invalid - should trigger token refresh
          throw new Error("Authentication required. Please log in again.");
        }
        
        if (response.status === 400) {
          // Invalid content type or content ID
          // If backend says "Invalid content type: devotional", it means mapping failed
          if (errorData.message?.includes("Invalid content type")) {
            console.error(
              `❌ TOGGLE LIKE: Backend rejected contentType "${backendContentType}". ` +
              `Original contentType was "${contentType}". ` +
              `This should have been mapped to "media".`
            );
          }
          throw new Error(errorData.message || `Invalid request: ${errorText}`);
        }
        
        if (response.status === 404) {
          // Content not found
          devWarn(
            `⚠️ TOGGLE LIKE: Content not found (404) for ${backendContentType}/${contentId}`
          );
          throw new Error("Content not found");
        }
        
        if (response.status === 429) {
          // Rate limited - don't rollback, user's action was valid
          throw new Error("Too many requests. Please wait a moment before liking again.");
        }
        
        // Other errors
        console.error(
          "❌ TOGGLE LIKE: Request failed",
          response.status,
          errorText
        );
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      devLog(`✅ Like toggled successfully for ${contentId}:`, result);

      // FIXED: Parse response strictly per backend format
      const liked = result.data?.liked ?? false;
      const totalLikes = result.data?.likeCount ?? 0;

      // Track analytics for backend consolidation
      const analyticsData = {
        action: "like_toggle",
        contentId,
        contentType: backendContentType,
        liked,
        totalLikes,
        endpoint: `/api/content/${backendContentType}/${contentId}/like`,
        responseTime: Date.now(),
        success: true,
        rawResponse: result, // Include full response for debugging
      };
      devLog(
        "📊 USER_INTERACTION:",
        JSON.stringify(analyticsData, null, 2)
      );

      return {
        liked,
        totalLikes,
      };
    } catch (error) {
      console.error("Error toggling like:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Track error analytics for backend consolidation
      const errorAnalyticsData = {
        action: "like_toggle_error",
        contentId,
        contentType: backendContentType,
        error: errorMessage || "Unknown error",
        endpoint: `/api/content/${backendContentType}/${contentId}/like`,
        responseTime: Date.now(),
        success: false,
      };
      devLog(
        "📊 USER_INTERACTION_ERROR:",
        JSON.stringify(errorAnalyticsData, null, 2)
      );

      // Fallback to local storage if API fails
      return this.fallbackToggleLike(contentId);
    }
  }

  // ============= SAVE INTERACTIONS =============
  async toggleSave(
    contentId: string,
    contentType: string
  ): Promise<{ saved: boolean; totalSaves: number }> {
    devLog("🔍 TOGGLE SAVE: Starting toggle save for:", {
      contentId,
      contentType,
    });

    try {
      const headers = await this.getAuthHeaders();
      const backendContentType = this.mapContentTypeToBackend(contentType);

      devLog(`🔄 Attempting to toggle bookmark for ${contentId} (contentType: ${backendContentType})`);
      devLog(
        `📡 TOGGLE SAVE: Making request to: ${this.baseURL}/api/bookmark/${contentId}/toggle`
      );

      // Backend may require contentType in body to resolve content (e.g. sermons in media collection)
      const response = await fetch(
        `${this.baseURL}/api/bookmark/${contentId}/toggle`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contentType: backendContentType }),
        }
      );

      devLog(
        "📡 TOGGLE SAVE: Response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Bookmark toggle failed:`, response.status, errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const result = await response.json();
      devLog(
        `📡 TOGGLE SAVE: API Response:`,
        JSON.stringify(result, null, 2)
      );

      // FIXED: Parse response strictly per backend format
      const isSaved = result.data?.bookmarked ?? false;
      const bookmarkCount = result.data?.bookmarkCount ?? 0;

      devLog(`✅ TOGGLE SAVE: Parsed result:`, { isSaved, bookmarkCount });

      // Track analytics for backend consolidation
      const analyticsData = {
        action: "save_toggle",
        contentId,
        contentType,
        saved: isSaved,
        totalSaves: bookmarkCount,
        endpoint: `/api/bookmark/${contentId}/toggle`,
        responseTime: Date.now(),
        success: true,
      };
      devLog(
        "📊 USER_INTERACTION:",
        JSON.stringify(analyticsData, null, 2)
      );

      // Sync with library store - this will handle user-specific saves
      await this.syncWithLibraryStore(contentId, isSaved);

      return {
        saved: isSaved,
        totalSaves: bookmarkCount,
      };
    } catch (error) {
      console.error("❌ TOGGLE SAVE: Error toggling save:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Track error analytics for backend consolidation
      const errorAnalyticsData = {
        action: "save_toggle_error",
        contentId,
        contentType,
        error: errorMessage || "Unknown error",
        endpoint: `/api/bookmark/${contentId}/toggle`,
        responseTime: Date.now(),
        success: false,
      };
      devLog(
        "📊 USER_INTERACTION_ERROR:",
        JSON.stringify(errorAnalyticsData, null, 2)
      );

      return this.fallbackToggleSave(contentId);
    }
  }

  // Add method to get initial save state from backend
  async getContentSaveState(
    contentId: string
  ): Promise<{ saved: boolean; totalSaves: number }> {
    try {
      const headers = await this.getAuthHeaders();

      // DEBUG: Log the request details
      devLog(
        `🔍 GET SAVE STATE: Making request to ${this.baseURL}/api/bookmark/${contentId}/status`
      );
      devLog(`🔍 GET SAVE STATE: Headers:`, headers);

      const response = await fetch(
        `${this.baseURL}/api/bookmark/${contentId}/status`,
        {
          headers,
        }
      );

      // DEBUG: Log response details
      devLog(`🔍 GET SAVE STATE: Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔍 GET SAVE STATE: Error response body:`, errorText);

        // If it's a 500 error, use fallback
        if (response.status === 500) {
          return this.fallbackGetSaveState(contentId);
        }

        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      devLog(`🔍 GET SAVE STATE: Success response:`, data);
      // FIXED: Use correct response structure
      return {
        saved: data.data?.isBookmarked ?? false,
        totalSaves: data.data?.bookmarkCount ?? 0,
      };
    } catch (error) {
      console.error("Error getting save state:", error);
      return this.fallbackGetSaveState(contentId);
    }
  }

  // Fallback method for getting save state when backend fails
  private async fallbackGetSaveState(
    contentId: string
  ): Promise<{ saved: boolean; totalSaves: number }> {
    try {
      const userId = await this.getCurrentUserId();
      const key = `userSaves_${userId}`;
      const savesStr = await AsyncStorage.getItem(key);
      const saves = savesStr ? JSON.parse(savesStr) : {};

      const isSaved = saves[contentId] || false;
      const totalSaves = Object.values(saves).filter(Boolean).length;

      devLog(
        `🔍 FALLBACK SAVE STATE: User ${userId}, content ${contentId}, saved: ${isSaved}, totalSaves: ${totalSaves}`
      );

      return {
        saved: isSaved,
        totalSaves: totalSaves,
      };
    } catch (error) {
      console.error("Fallback get save state failed:", error);
      return { saved: false, totalSaves: 0 };
    }
  }

  // Synchronize save state with library store
  private async syncWithLibraryStore(
    contentId: string,
    isSaved: boolean
  ): Promise<void> {
    try {
      const { useLibraryStore } = await import("../store/useLibraryStore");
      const libraryStore = useLibraryStore.getState();

      if (isSaved) {
        // Item was saved but library store management is handled in components
        // This ensures the API and library store stay in sync
        devLog(
          `✅ Content ${contentId} saved - library sync handled by component`
        );
      } else {
        // Item was unsaved, remove from library store
        await libraryStore.removeFromLibrary(contentId);
        devLog(`🗑️ Content ${contentId} removed from library`);
      }
    } catch (error) {
      console.error("Error syncing with library store:", error);
    }
  }

  // ============= CONTENT METADATA =============
  async getBatchMetadata(
    contentIds: string[],
    contentType: string = "media"
  ): Promise<Record<string, ContentStats>> {
    try {
      const ids = (contentIds || []).filter((id) => this.isValidObjectId(id));
      if (ids.length === 0) return {};

      const headers = await this.getAuthHeaders();
      const backendContentType = this.mapContentTypeToBackend(contentType);

      const response = await fetch(
        `${this.baseURL}/api/content/batch-metadata`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            contentIds: ids,
            contentType: backendContentType,
          }),
        }
      );

      if (!response.ok) {
        devWarn(
          `⚠️ batch-metadata failed (${response.status}), falling back to per-item`
        );
        return {};
      }

      const payload = await response.json();
      const data = payload?.data;
      if (!payload?.success || !data) return {};

      // Backend contract: object keyed by contentId { "id1": {...}, "id2": {...} }
      // Fallback: array format from older/alternate backends
      const entries = Array.isArray(data)
        ? data
            .map((i: any) => [i.contentId || i.id, i] as const)
            .filter(([id]) => id)
        : Object.entries(data);

      const result: Record<string, ContentStats> = {};
      for (const [id, item] of entries) {
        const contentId = String(id);
        if (!contentId || contentId === "undefined") continue;
        const stat = item as any;
        result[contentId] = {
          contentId,
          likes: Number(stat?.likes ?? stat?.likeCount ?? 0),
          saves: Number(stat?.saves ?? stat?.bookmarkCount ?? 0),
          shares: Number(stat?.shares ?? stat?.shareCount ?? 0),
          views: Number(stat?.views ?? stat?.viewCount ?? 0),
          comments: Number(stat?.comments ?? stat?.commentCount ?? 0),
          userInteractions: {
            liked: Boolean(stat?.userInteractions?.liked ?? stat?.hasLiked ?? false),
            saved: Boolean(stat?.userInteractions?.saved ?? stat?.hasBookmarked ?? false),
            shared: Boolean(stat?.userInteractions?.shared ?? stat?.hasShared ?? false),
            viewed: Boolean(stat?.userInteractions?.viewed ?? stat?.hasViewed ?? false),
          },
        };
      }
      return result;
    } catch (error) {
      devWarn("⚠️ Error in getBatchMetadata, falling back:", error);
      return {};
    }
  }

  async getContentMetadata(
    contentId: string,
    contentType: string
  ): Promise<ContentStats> {
    try {
      const headers = await this.getAuthHeaders();
      const backendContentType = this.mapContentTypeToBackend(contentType);

      devLog(
        `🔍 Getting metadata for ${contentId} (${backendContentType})`
      );

      const response = await fetch(
        `${this.baseURL}/api/content/${backendContentType}/${contentId}/metadata`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        devWarn(
          `⚠️ Metadata endpoint failed (${response.status}), using fallback`
        );
        return this.fallbackGetStats(contentId);
      }

      const result = await response.json();

      // Backend contract: { data: { likes, saves, userInteractions: { liked, saved, ... } } }
      // Fallback: legacy formats (userInteraction.hasLiked, stats.likes, etc.)
      const data = result.data || {};
      const ui = data.userInteractions || {};
      const userInteraction = data.userInteraction || {};
      const stats = data.stats || {};

      return {
        contentId,
        likes: data.likes ?? stats.likes ?? data.likeCount ?? 0,
        saves: data.saves ?? stats.saves ?? data.bookmarkCount ?? 0,
        shares: data.shares ?? stats.shares ?? data.shareCount ?? 0,
        views: data.views ?? stats.views ?? data.viewCount ?? 0,
        comments: data.comments ?? stats.comments ?? data.commentCount ?? 0,
        userInteractions: {
          liked: Boolean(ui.liked ?? userInteraction.hasLiked ?? data.hasLiked ?? false),
          saved: Boolean(ui.saved ?? userInteraction.hasBookmarked ?? data.hasBookmarked ?? false),
          shared: Boolean(ui.shared ?? userInteraction.hasShared ?? data.hasShared ?? false),
          viewed: Boolean(ui.viewed ?? userInteraction.hasViewed ?? data.hasViewed ?? false),
        },
      };
    } catch (error) {
      devWarn("⚠️ Error getting content metadata, using fallback:", error);
      return this.fallbackGetStats(contentId);
    }
  }

  // ============= SHARE INTERACTIONS =============
  async recordShare(
    contentId: string,
    contentType: string,
    shareMethod: string = "generic",
    message?: string
  ): Promise<{ totalShares: number }> {
    try {
      if (!this.isValidObjectId(contentId)) {
        // No server call; just return 0 to avoid noise
        return { totalShares: 0 };
      }
      const headers = await this.getAuthHeaders();

      devLog(`🔄 Attempting to record share for ${contentId}`);

      // Use the correct backend endpoint from documentation
      const response = await fetch(`${this.baseURL}/api/interactions/share`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          contentId,
          contentType: contentType === "videos" ? "media" : contentType,
          platform: shareMethod === "generic" ? "internal" : "external",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      devLog(`✅ Share recorded successfully for ${contentId}:`, result);

      return { totalShares: result.data?.shareCount || 0 };
    } catch (error) {
      console.error("Error recording share:", error);
      return { totalShares: 0 };
    }
  }

  // ============= VIEW INTERACTIONS =============
  async recordView(
    contentId: string,
    contentType: string,
    payload?: {
      durationMs?: number;
      progressPct?: number;
      isComplete?: boolean;
    }
  ): Promise<{ totalViews: number; hasViewed?: boolean }> {
    const now = Date.now();
    if (now - (recordViewThrottle.lastTime || 0) < RECORD_VIEW_MIN_INTERVAL_MS) {
      return { totalViews: 0 };
    }
    if (recordViewThrottle.backoffUntil && now < recordViewThrottle.backoffUntil) {
      return { totalViews: 0 };
    }
    recordViewThrottle.lastTime = now;

    try {
      const headers = await this.getAuthHeaders();
      const backendContentType = this.mapContentTypeToBackend(contentType);
      const response = await fetch(
        `${this.baseURL}/api/content/${backendContentType}/${contentId}/view`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload || {}),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const viewCount = data?.data?.viewCount ?? data?.totalViews ?? 0;
      const hasViewed = data?.data?.hasViewed ?? undefined;

      // Track view analytics for backend consolidation
      const viewAnalyticsData = {
        action: "view_record",
        contentId,
        contentType: backendContentType,
        totalViews: Number(viewCount) || 0,
        hasViewed,
        durationMs: payload?.durationMs,
        progressPct: payload?.progressPct,
        isComplete: payload?.isComplete,
        endpoint: `/api/content/${backendContentType}/${contentId}/view`,
        responseTime: Date.now(),
        success: true,
      };
      return { totalViews: Number(viewCount) || 0, hasViewed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const is429 = errorMessage.includes("429");
      if (is429) {
        recordViewThrottle.backoffUntil = Date.now() + 60000;
      }
      
      // Handle network errors gracefully - don't spam logs
      const isNetworkError = 
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError");
      
      if (isNetworkError) {
        // Only log network errors in development, and throttle them
        if (__DEV__) {
          const errorKey = `network_error_view_${contentId}_${Date.now()}`;
          if (!(global as any).__loggedNetworkErrors) {
            (global as any).__loggedNetworkErrors = new Set();
          }
          if (!(global as any).__loggedNetworkErrors.has(errorKey)) {
            (global as any).__loggedNetworkErrors.add(errorKey);
            setTimeout(() => {
              (global as any).__loggedNetworkErrors?.delete(errorKey);
            }, 10000); // 10 second throttle
            devWarn("⚠️ Network error recording view (offline or server unreachable)");
          }
        }
      } else if (__DEV__ && !is429) {
        // Log non-network, non-429 errors in dev (429 is rate limit, expected when scrolling fast)
        console.error("Error recording view:", error);
      }
      
      // Return gracefully - view tracking failure shouldn't break the app
      return { totalViews: 0 };
    }
  }

  // ============= COMMENT INTERACTIONS =============
  async addComment(
    contentId: string,
    comment: string,
    contentType: string = "media",
    parentCommentId?: string
  ): Promise<CommentData> {
    try {
      if (!this.isValidObjectId(contentId)) {
        throw new Error("Invalid content ID");
      }
      const headers = await this.getAuthHeaders();
      const backendContentType = this.mapContentTypeToBackend(contentType);

      // New unified comments endpoint: POST /api/comments
      const response = await fetch(`${this.baseURL}/api/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          contentId,
          contentType: backendContentType,
          content: comment,
          parentCommentId,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create comment";
        let errorBody: any = {};
        
        try {
          const errorText = await response.text();
          errorBody = JSON.parse(errorText);
          errorMessage = errorBody?.message || errorBody?.error || errorMessage;
        } catch {
          // If error text is not JSON, use the raw text
        }
        
        // Create a more descriptive error with status code
        const error = new Error(errorMessage) as Error & { 
          status: number; 
          statusText: string;
          body?: any;
        };
        error.status = response.status;
        error.statusText = response.statusText;
        error.body = errorBody;
        
        // Log detailed error info for debugging (only in dev)
        if (__DEV__) {
          console.error("❌ Comment submission failed:", {
            status: response.status,
            statusText: response.statusText,
            message: errorMessage,
            body: errorBody,
            contentId,
            contentType: backendContentType,
          });
        }
        
        throw error;
      }

      const raw = await response.json();
      // Backend spec: { success, message, data: { ...comment } }
      const data = raw?.data || raw;
      const user = data?.user || {};

      const firstName =
        user.firstName || user.given_name || user.first_name || "";
      const lastName =
        user.lastName || user.family_name || user.last_name || "";
      const fullName = `${String(firstName).trim()} ${String(
        lastName
      ).trim()}`.trim();

      const transformed: CommentData = {
        id: String(data?.id || data?._id),
        contentId: String(contentId),
        userId: String(user.id || user._id || data?.userId || ""),
        username:
          fullName ||
          user.username ||
          data?.username ||
          user.email ||
          "User",
        userAvatar: user.avatar || user.avatarUrl || data?.avatar || "",
        comment: String(data?.content || data?.comment || ""),
        timestamp: String(data?.createdAt || data?.timestamp || new Date().toISOString()),
        likes: Number(data?.likesCount ?? data?.likes ?? data?.reactionsCount ?? 0),
        isLiked: Boolean(data?.isLiked || false),
        replies: [], // replies are loaded separately when needed
      };
      return transformed;
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }

  async getComments(
    contentId: string,
    contentType: string = "media",
    page: number = 1,
    limit: number = 20,
    sortBy: "newest" | "oldest" | "top" = "newest"
  ): Promise<{
    comments: CommentData[];
    totalComments: number;
    hasMore: boolean;
  }> {
    try {
      if (!this.isValidObjectId(contentId)) {
        return { comments: [], totalComments: 0, hasMore: false };
      }
      
      // GET comments is PUBLIC - token is optional (only for isLiked status)
      // Try to get token but don't fail if not available
      let headers: HeadersInit = {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
      
      try {
        const token = await AsyncStorage.getItem("userToken") || 
                     await AsyncStorage.getItem("token");
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } catch (e) {
        // Token not available - that's fine, comments are public
      }
      
      const backendContentType = this.mapContentTypeToBackend(contentType);

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (sortBy) {
        params.append("sortBy", sortBy);
      }

      const response = await fetch(
        `${this.baseURL}/api/content/${backendContentType}/${contentId}/comments?${params.toString()}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const payload = raw && raw.data ? raw.data : raw;
      const serverComments: any[] =
        payload?.comments || payload?.items || payload?.data || [];
      const total = Number(
        payload?.total || payload?.totalCount || serverComments.length || 0
      );
      const hasMore = Boolean(payload?.hasMore || page * limit < total);
      
      // Helper function to transform a single comment (including nested replies)
      const transformComment = (c: any): CommentData => {
        // Extract user name - support multiple formats from backend
        const firstName = c?.user?.firstName || c?.author?.firstName || c?.userFirstName || "";
        const lastName = c?.user?.lastName || c?.author?.lastName || c?.userLastName || "";
        const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`.trim();
        const username = fullName || c?.username || c?.user?.username || "User";
        
        return {
          id: String(c?._id || c?.id),
          contentId: String(contentId),
          userId: String(c?.userId || c?.user?._id || c?.author?._id || c?.authorId || ""),
          username: username,
          userAvatar: c?.userAvatar || c?.user?.avatar || c?.user?.avatarUrl || c?.author?.avatar || "",
          comment: String(c?.content || c?.comment || ""),
          timestamp: String(
            c?.createdAt || c?.timestamp || new Date().toISOString()
          ),
          likes: Number(c?.likesCount || c?.likes || c?.reactionsCount || 0),
          isLiked: Boolean(c?.isLiked || false), // Backend should provide this
          replies: Array.isArray(c?.replies)
            ? c.replies.map((r: any) => transformComment(r))
            : undefined,
        };
      };

      const comments: CommentData[] = serverComments.map(transformComment);
      return { comments, totalComments: total, hasMore };
    } catch (error) {
      console.error("Error getting comments:", error);
      return { comments: [], totalComments: 0, hasMore: false };
    }
  }

  async toggleCommentLike(
    commentId: string
  ): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      if (!this.isValidObjectId(commentId)) {
        return { liked: false, totalLikes: 0 };
      }
      const headers = await this.getAuthHeaders();
      // New spec: POST /api/comments/:commentId/like
      const response = await fetch(
        `${this.baseURL}/api/comments/${commentId}/like`,
        {
          method: "POST",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const data = raw && raw.data ? raw.data : raw;
      return {
        liked: Boolean(data?.liked ?? false),
        totalLikes: Number(
          data?.likesCount ?? data?.totalLikes ?? data?.reactionsCount ?? 0
        ),
      };
    } catch (error) {
      console.error("Error toggling comment like:", error);
      return { liked: false, totalLikes: 0 };
    }
  }

  // ============= GET CONTENT STATS =============
  async getContentStats(contentId: string): Promise<ContentStats> {
    try {
      // If ID is not a valid ObjectId, skip server call and use fallback
      if (!this.isValidObjectId(contentId)) {
        return this.fallbackGetStats(contentId);
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/content/${contentId}/stats`,
        {
          headers,
        }
      );

      if (response.ok) {
        return await response.json();
      }

      // Gracefully fallback on 404 or any non-OK
      if (response.status === 404) {
        devWarn(
          `⚠️ content stats 404 for ${contentId}. Falling back to local stats.`
        );
      }
      return this.fallbackGetStats(contentId);
    } catch (error) {
      console.error("Error getting content stats:", error);
      return this.fallbackGetStats(contentId);
    }
  }

  // ============= BATCH OPERATIONS =============
  async getBatchContentStats(
    contentIds: string[]
  ): Promise<Record<string, ContentStats>> {
    try {
      // Filter to valid IDs only; if none, return empty to avoid server errors
      const validIds = (contentIds || []).filter((id) =>
        this.isValidObjectId(id)
      );
      if (validIds.length === 0) {
        return {};
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/content/batch-stats`, {
        method: "POST",
        headers,
        body: JSON.stringify({ contentIds: validIds }),
      });

      if (response.ok) {
        return await response.json();
      }

      // If endpoint not found or other non-OK, gracefully fall back to per-id fetches
      if (response.status === 404) {
        devWarn(
          "⚠️ batch-stats endpoint not found (404). Falling back to individual stats requests."
        );
      } else {
        devWarn(
          `⚠️ batch-stats request failed with status ${response.status}. Falling back.`
        );
      }

      const entries = await Promise.all(
        validIds.map(async (id) => {
          try {
            const stats = await this.getContentStats(id);
            return [id, stats] as [string, ContentStats];
          } catch {
            return [id, undefined] as unknown as [string, ContentStats];
          }
        })
      );

      return entries.reduce((acc, [id, stats]) => {
        if (stats) acc[id] = stats;
        return acc;
      }, {} as Record<string, ContentStats>);
    } catch (error) {
      console.error("Error getting batch content stats:", error);
      return {};
    }
  }

  // ============= USER'S SAVED CONTENT =============
  async getUserSavedContent(
    contentType?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    content: any[];
    totalCount: number;
    hasMore: boolean;
  }> {
    devLog("🔍 Getting user saved content with params:", {
      contentType,
      page,
      limit,
    });

    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(contentType && { contentType }),
      });

      devLog("📡 Using endpoint: /api/bookmark/user");
      devLog("📡 Request headers:", headers);
      devLog("📡 Query params:", queryParams.toString());

      const response = await fetch(
        `${this.baseURL}/api/bookmark/user?${queryParams}`,
        {
          headers,
        }
      );

      devLog("📡 Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", response.status, errorText);

        // Handle 500 errors gracefully - don't crash the app
        if (response.status === 500) {
          devWarn(
            "⚠️ Backend server error (500) - returning empty saved content"
          );
          devWarn("⚠️ This usually means:");
          devWarn("   - Database connection issues");
          devWarn("   - User authentication problems");
          devWarn("   - Backend code errors in bookmark retrieval");
          return { content: [], totalCount: 0, hasMore: false };
        }

        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const payload = await response.json();
      devLog("📡 API Response:", JSON.stringify(payload, null, 2));

      const items: any[] =
        payload?.data?.media || payload?.data || payload?.media || [];
      const total: number =
        payload?.data?.pagination?.total || payload?.total || items.length || 0;
      const totalPages: number =
        payload?.data?.pagination?.totalPages ||
        Math.ceil(total / Math.max(limit, 1));

      devLog("✅ Parsed saved content:", {
        itemCount: items.length,
        total,
        totalPages,
      });

      return {
        content: items,
        totalCount: total,
        hasMore: page < totalPages,
      };
    } catch (error) {
      console.error("❌ Error getting user saved content:", error);

      // Don't crash the app - return empty result
      devWarn("⚠️ Returning empty saved content to prevent app crash");
      return { content: [], totalCount: 0, hasMore: false };
    }
  }

  // ============= ANALYTICS =============
  async getUserInteractionHistory(
    page: number = 1,
    limit: number = 50,
    interactionType?: string
  ): Promise<{
    interactions: ContentInteraction[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(interactionType && { interactionType }),
      });

      const response = await fetch(
        `${this.baseURL}/api/user/interaction-history?${queryParams}`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting interaction history:", error);
      return { interactions: [], totalCount: 0, hasMore: false };
    }
  }

  // ============= FALLBACK METHODS (LOCAL STORAGE) =============
  private async fallbackToggleLike(
    contentId: string
  ): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      const userId = await this.getCurrentUserId();
      const key = `userLikes_${userId}`;
      const likesStr = await AsyncStorage.getItem(key);
      const likes = likesStr ? JSON.parse(likesStr) : {};

      const isLiked = likes[contentId] || false;
      likes[contentId] = !isLiked;

      await AsyncStorage.setItem(key, JSON.stringify(likes));

      return {
        liked: !isLiked,
        totalLikes: Object.values(likes).filter(Boolean).length,
      };
    } catch (error) {
      console.error("Fallback like toggle failed:", error);
      return { liked: false, totalLikes: 0 };
    }
  }

  private async fallbackToggleSave(
    contentId: string
  ): Promise<{ saved: boolean; totalSaves: number }> {
    try {
      const userId = await this.getCurrentUserId();
      const key = `userSaves_${userId}`;
      const savesStr = await AsyncStorage.getItem(key);
      const saves = savesStr ? JSON.parse(savesStr) : {};

      const isSaved = saves[contentId] || false;
      const newSavedState = !isSaved;
      saves[contentId] = newSavedState;

      await AsyncStorage.setItem(key, JSON.stringify(saves));

      // Sync with library store
      await this.syncWithLibraryStore(contentId, newSavedState);

      return {
        saved: newSavedState,
        totalSaves: Object.values(saves).filter(Boolean).length,
      };
    } catch (error) {
      console.error("Fallback save toggle failed:", error);
      return { saved: false, totalSaves: 0 };
    }
  }

  private async fallbackGetStats(contentId: string): Promise<ContentStats> {
    try {
      const userId = await this.getCurrentUserId();
      const likesStr = await AsyncStorage.getItem(`userLikes_${userId}`);
      const savesStr = await AsyncStorage.getItem(`userSaves_${userId}`);

      const likes = likesStr ? JSON.parse(likesStr) : {};
      const saves = savesStr ? JSON.parse(savesStr) : {};

      return {
        contentId,
        likes: 0,
        saves: 0,
        shares: 0,
        views: 0,
        comments: 0,
        userInteractions: {
          liked: likes[contentId] || false,
          saved: saves[contentId] || false,
          shared: false,
          viewed: false,
        },
      };
    } catch (error) {
      console.error("Fallback get stats failed:", error);
      return {
        contentId,
        likes: 0,
        saves: 0,
        shares: 0,
        views: 0,
        comments: 0,
        userInteractions: {
          liked: false,
          saved: false,
          shared: false,
          viewed: false,
        },
      };
    }
  }
}

// Export singleton instance
export const contentInteractionAPI = new ContentInteractionService();
export default contentInteractionAPI;
