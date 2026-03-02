import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE_URL, APIClient } from "../utils/api";
import { TokenUtils } from "../utils/tokenUtils";

export interface Notification {
  _id: string;
  user: string;
  title: string;
  message: string;
  isRead: boolean;
  type: NotificationType;
  metadata: {
    actorName?: string;
    actorAvatar?: string;
    contentTitle?: string;
    contentType?: string;
    thumbnailUrl?: string;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    [key: string]: any;
  };
  priority: "low" | "medium" | "high";
  relatedId?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | "follow" // User followed you
  | "like" // Someone liked your content
  | "comment" // Someone commented on your content
  | "share" // Someone shared your content
  | "mention" // Someone mentioned you
  | "download" // Someone downloaded your content
  | "bookmark" // Someone saved your content
  | "milestone" // Achievement unlocked
  | "public_activity" // Public activity from followed users
  | "system" // System notifications
  | "security" // Security alerts
  | "live_stream" // Live stream notifications
  | "merch_purchase"; // Merchandise purchase

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  types: {
    [key: string]: boolean;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: { [key: string]: number };
}

class NotificationAPIService {
  private baseURL: string;
  private static instance: NotificationAPIService;
  private api: APIClient;
  private cacheKeys = {
    list: "cache.notifications.list",
    stats: "cache.notifications.stats",
  } as const;

  private async getUserScopedKey(baseKey: string): Promise<string> {
    try {
      const userStr = await AsyncStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?._id || user?.id || "anonymous";
      return `${baseKey}:${userId}`;
    } catch {
      return `${baseKey}:anonymous`;
    }
  }

  constructor() {
    // Align with centralized API base URL configuration
    this.baseURL = API_BASE_URL;
    this.api = new APIClient(this.baseURL);
  }

  static getInstance(): NotificationAPIService {
    if (!NotificationAPIService.instance) {
      NotificationAPIService.instance = new NotificationAPIService();
    }
    return NotificationAPIService.instance;
  }

  private async getAuthHeaders(tokenOverride?: string): Promise<HeadersInit> {
    const token = tokenOverride || (await TokenUtils.getAuthToken());
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "expo-platform": Platform.OS as any,
    };
    if (token) {
      (headers as any).Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  // All requests are routed via APIClient which handles 401 refresh automatically.

  async getNotifications(
    page: number = 1,
    limit: number = 20,
    type?: string,
    unreadOnly?: boolean
  ): Promise<NotificationResponse> {
    try {
      const token = await TokenUtils.getAuthToken();
      console.log(
        "🔎 Notifications API: token sources/preview",
        await TokenUtils.getTokenInfo()
      );
      const headers = await this.getAuthHeaders(token || undefined);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(type && { type }),
        ...(unreadOnly && { unreadOnly: "true" }),
      });

      const result = await this.api.request<{
        success: boolean;
        data: NotificationResponse;
      }>(`/api/notifications?${params}`, {
        headers,
        timeoutMs: 30000, // longer first-load tolerance
        retryOnAbort: true,
      });
      if (page === 1 && !type && !unreadOnly) {
        try {
          const key = await this.getUserScopedKey(this.cacheKeys.list);
          await AsyncStorage.setItem(key, JSON.stringify(result.data));
        } catch {}
      }
      return result.data;
    } catch (error) {
      if ((error as any)?.name === "AbortError") {
        console.warn(
          "⏱️ Notifications request aborted (timeout). Returning empty."
        );
        return { notifications: [], total: 0, unreadCount: 0 };
      }
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders();
      await this.api.request(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<number> {
    try {
      const headers = await this.getAuthHeaders();
      const result = await this.api.request<{
        success: boolean;
        count: number;
      }>(`/api/notifications/mark-all-read`, {
        method: "PATCH",
        headers,
      });
      return result.count;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const headers = await this.getAuthHeaders();
      const result = await this.api.request<{
        success: boolean;
        data: NotificationPreferences;
      }>(`/api/notifications/preferences`, { headers });
      return result.data;
    } catch (error) {
      if ((error as any)?.name === "AbortError") {
        console.warn(
          "⏱️ Preferences request aborted (timeout). Returning defaults."
        );
        return { pushEnabled: true, emailEnabled: false, types: {} };
      }
      console.error("Error fetching notification preferences:", error);
      throw error;
    }
  }

  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const headers = await this.getAuthHeaders();
      const result = await this.api.request<{
        success: boolean;
        data: NotificationPreferences;
      }>(`/api/notifications/preferences`, {
        method: "PUT",
        headers,
        body: JSON.stringify(preferences),
      });
      return result.data;
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      throw error;
    }
  }

  async getStats(): Promise<NotificationStats> {
    try {
      const headers = await this.getAuthHeaders();
      const result = await this.api.request<{
        success: boolean;
        data: NotificationStats;
      }>(`/api/notifications/stats`, {
        headers,
        timeoutMs: 30000,
        retryOnAbort: true,
      });
      try {
        const key = await this.getUserScopedKey(this.cacheKeys.stats);
        await AsyncStorage.setItem(key, JSON.stringify(result.data));
      } catch {}
      return result.data;
    } catch (error) {
      if ((error as any)?.name === "AbortError") {
        console.warn("⏱️ Stats request aborted (timeout). Returning zeros.");
        return { total: 0, unread: 0, byType: {} };
      }
      console.error("Error fetching notification stats:", error);
      throw error;
    }
  }

  async getCachedNotifications(): Promise<NotificationResponse | null> {
    try {
      const key = await this.getUserScopedKey(this.cacheKeys.list);
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as NotificationResponse) : null;
    } catch {
      return null;
    }
  }

  async getCachedStats(): Promise<NotificationStats | null> {
    try {
      const key = await this.getUserScopedKey(this.cacheKeys.stats);
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as NotificationStats) : null;
    } catch {
      return null;
    }
  }

  // Utility methods for UI
  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}HRS AGO`;
    } else if (diffInDays < 7) {
      return `${diffInDays} DAYS AGO`;
    } else {
      return `${Math.floor(diffInDays / 7)} WEEKS AGO`;
    }
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      like: "❤️",
      comment: "💬",
      follow: "👥",
      share: "📤",
      download: "⬇️",
      bookmark: "🔖",
      milestone: "🎉",
      public_activity: "📢",
      system: "⚙️",
      security: "🔒",
      live_stream: "📺",
      merch_purchase: "🛒",
    };
    return icons[type] ?? "🔔";
  }

  getNotificationColor(type: string): string {
    const colors: Record<string, string> = {
      like: "#e91e63",
      comment: "#2196f3",
      share: "#4caf50",
      follow: "#ff9800",
      download: "#9c27b0",
      bookmark: "#ff5722",
      milestone: "#ffeb3b",
      public_activity: "#00bcd4",
      system: "#9e9e9e",
      security: "#f44336",
      live_stream: "#e91e63",
      merch_purchase: "#4caf50",
    };
    return colors[type] ?? "#9e9e9e";
  }
}

export const notificationAPIService = new NotificationAPIService();
