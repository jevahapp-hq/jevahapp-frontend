import { CacheManager } from "./CacheManager";
import { ApiClient } from "../api/ApiClient";
import { API_BASE_URL, AVATAR_CACHE_DURATION } from "../api/types";

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

