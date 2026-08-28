import type { CacheManager } from "../../cache/CacheManager";
import { TokenManager } from "../TokenManager";
import { AVATAR_CACHE_DURATION, UserData } from "../types";
import type { RequestFn } from "./types";

type SettingsResponse<K extends string> = {
  success: boolean;
  data: {
    settings: Record<K, boolean>;
    message: string;
  };
};

export async function getUserProfile(
  request: RequestFn,
  cache: CacheManager
): Promise<{ user: UserData }> {
  try {
    // Guest: skip /auth/me entirely — avoids noisy 401 "No token provided"
    const token = await TokenManager.getToken();
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    const result = await request("/auth/me", { cache: true });

    if (!result) {
      throw new Error("No response received from server");
    }
    if (!result.user) {
      throw new Error("User data not found in response");
    }

    // Cache user profile by userId for content enrichment
    const userId = result.user.id || result.user._id;
    if (userId) {
      cache.set(`user:${userId}`, result.user, AVATAR_CACHE_DURATION);
    }

    return result;
  } catch (error: any) {
    const msg: string = error?.message || "";
    const { isGuestNoTokenError } = await import("../../sessionExpired");

    if (isGuestNoTokenError(msg)) {
      // Expected when browsing logged out — no ERROR stack
      throw new Error("Unauthorized: No token provided");
    }

    console.error("❌ API: getUserProfile error:", error);

    if (
      msg.includes("401") ||
      msg.includes("402") ||
      msg.includes("Unauthorized")
    ) {
      throw new Error("Authentication failed. Please login again.");
    }
    if (msg.includes("404")) {
      throw new Error("User profile not found.");
    }
    if (
      msg.includes("Network") ||
      msg.includes("fetch") ||
      msg.includes("timeout") ||
      error?.name === "AbortError"
    ) {
      throw new Error("Network error. Please check your connection.");
    }
    throw new Error(msg || "Failed to fetch user profile");
  }
}

export function updateUserProfile(
  request: RequestFn,
  updates: Partial<UserData>
): Promise<{ user: UserData }> {
  return request("/auth/update-profile", { method: "PUT", body: updates });
}

export function getProfileSettingsConfig(request: RequestFn): Promise<{
  success: boolean;
  data: Record<string, any>;
}> {
  return request("/user/profile/settings-config", {
    method: "GET",
    cache: true,
  });
}

export function getProfile(request: RequestFn): Promise<{
  success: boolean;
  data: { user: UserData };
}> {
  return request("/user/profile", { method: "GET", cache: true });
}

export function updateProfileName(
  request: RequestFn,
  firstName?: string,
  lastName?: string
): Promise<{
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
  return request("/user/profile/update-name", {
    method: "PUT",
    body: { firstName, lastName },
  });
}

export function updateProfileLock(
  request: RequestFn,
  profileLock: boolean
): Promise<SettingsResponse<"profileLock">> {
  return request("/user/profile/update-lock", {
    method: "PUT",
    body: { profileLock },
  });
}

export function updatePushNotifications(
  request: RequestFn,
  pushNotifications: boolean
): Promise<SettingsResponse<"pushNotifications">> {
  return request("/user/profile/update-push-notifications", {
    method: "PUT",
    body: { pushNotifications },
  });
}

export function updateRecommendations(
  request: RequestFn,
  recommendationSettings: boolean
): Promise<SettingsResponse<"recommendationSettings">> {
  return request("/user/profile/update-recommendations", {
    method: "PUT",
    body: { recommendationSettings },
  });
}

export function updateLiveSettings(
  request: RequestFn,
  liveSettings: boolean
): Promise<{
  success: boolean;
  error?: string;
  code?: string;
  comingSoon?: boolean;
}> {
  return request("/user/profile/update-live-settings", {
    method: "PUT",
    body: { liveSettings },
  });
}
