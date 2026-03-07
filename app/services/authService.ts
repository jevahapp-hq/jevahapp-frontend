import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiBaseUrl } from "../utils/api";

class AuthService {
  private get baseURL(): string {
    const baseUrl = getApiBaseUrl();
    // Add /api/auth suffix if not already present
    return baseUrl.endsWith("/api/auth") ? baseUrl : `${baseUrl}/api/auth`;
  }

  // Forgot Password - Step 1: Send reset code to email
  async forgotPassword(email: string) {
    try {
      // console.log("🔍 Sending forgot password request for:", email);
      const endpoint = `${this.baseURL}/forgot-password`;
      // console.log("🔍 API URL:", endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // console.error("❌ Failed to parse response:", parseError);
        return {
          success: false,
          error: "Invalid server response",
          status: response.status,
          data: { message: "Server returned invalid response" },
        };
      }

      // console.log("📧 Forgot password response:", data);
      // console.log("📧 Response status:", response.status);
      // console.log("📧 Response ok:", response.ok);

      // Check both response.ok and data.success for proper error handling
      const isSuccess = response.ok && (data.success !== false);
      
      // Handle "User not found" as a special case - for security, we should still show success
      // This prevents email enumeration attacks
      const isUserNotFound = 
        data.message?.toLowerCase().includes("user not found") ||
        data.error?.toLowerCase().includes("user not found") ||
        data.message?.toLowerCase().includes("email not found") ||
        data.error?.toLowerCase().includes("email not found");

      if (isUserNotFound) {
        // Log as info, not error - this is expected behavior for security
        // console.log("ℹ️ User not found for password reset (security: showing success message)");
        // Return success to prevent email enumeration
        return {
          success: true,
          data: { 
            ...data, 
            message: "If an account exists with this email, a reset code has been sent."
          },
          status: response.status,
        };
      }
      
      if (!isSuccess) {
        const errorMessage = data.message || data.error || "Failed to send reset code";
        // Only log as error if it's not a user not found case
        // console.warn("⚠️ Forgot password failed:", errorMessage);
        return {
          success: false,
          error: errorMessage,
          status: response.status,
          data,
        };
      }

      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error: any) {
      // console.error("❌ Error in forgotPassword:", error);
      const errorMessage = error.message || "Network error occurred";
      return {
        success: false,
        error: errorMessage,
        status: 0,
        data: { message: errorMessage },
      };
    }
  }

  // Verify Reset Code - Step 2: Validate the 6-digit code
  async verifyResetCode(email: string, code: string) {
    try {
      // console.log("🔍 Verifying reset code for:", email);

      const response = await fetch(`${this.baseURL}/verify-reset-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });

      const data = await response.json();
      // console.log("✅ Verify reset code response:", data);

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error) {
      // console.error("❌ Error in verifyResetCode:", error);
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      };
    }
  }

  // Reset Password - Step 3: Reset password with email, token, and new password
  async resetPassword(email: string, token: string, newPassword: string) {
    try {
      // console.log("🔍 Resetting password for:", email);

      const response = await fetch(`${this.baseURL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          token: token.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await response.json();
      // console.log("✅ Reset password response:", data);

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error) {
      // console.error("❌ Error in resetPassword:", error);
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      };
    }
  }

  // Reset Password with Code - Backend contract: POST /reset-password-with-code
  async resetPasswordWithCode(
    email: string,
    code: string,
    newPassword: string
  ) {
    try {
      // console.log("🔍 Resetting password with code for:", email);

      const response = await fetch(`${this.baseURL}/reset-password-with-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await response.json();
      // console.log("✅ Reset password with code response:", data);

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error) {
      // console.error("❌ Error in resetPasswordWithCode:", error);
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      };
    }
  }

  // Login with Jevah backend
  async login(email: string, password: string, rememberMe: boolean = false) {
    try {
      // console.log("🔍 Logging in user:", email);
      // console.log("🧠 Remember Me flag:", rememberMe);

      const response = await fetch(`${this.baseURL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          rememberMe,
        }),
      });

      const data = await response.json();
      // console.log("✅ Login response:", data);

      if (response.ok && data.token) {
        await AsyncStorage.setItem("token", data.token);
        // console.log("💾 Token stored in AsyncStorage");

        // Also store user data if available
        if (data.user) {
          // console.log("🔍 Login user data:", {
          //   section: data.user.section,
          //   sectionType: typeof data.user.section,
          //   userKeys: Object.keys(data.user),
          //   fullUserData: data.user,
          // });
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
          // console.log("💾 User data stored in AsyncStorage");
        }

        // Preload content for all categories in background for instant navigation
        try {
          const { mediaApi } = await import("../../src/core/api/MediaApi");
          const { useContentCacheStore } = await import("../store/useContentCacheStore");
          const { useInteractionStore } = await import("../store/useInteractionStore");
          
          // Preload content for all major categories (non-blocking)
          Promise.all([
            mediaApi.getAllContentWithAuth().then(async (resp) => {
              if (resp.success && Array.isArray(resp.media)) {
                const items = resp.media as any[];
                useContentCacheStore.getState().set("ALL:first", {
                  items,
                  page: 1,
                  limit: resp.limit || 10,
                  total: resp.total || 0,
                  fetchedAt: Date.now(),
                });
                // Hydrate liked/saved from feed response for instant UI (before batch stats)
                const withInteractions = items
                  .filter((i) => i._id && (i.hasLiked === true || i.hasBookmarked === true))
                  .map((i) => ({ contentId: i._id, hasLiked: i.hasLiked, hasBookmarked: i.hasBookmarked }));
                if (withInteractions.length > 0) {
                  useInteractionStore.getState().hydrateUserInteractionsFromFeed(withInteractions);
                }
                // Fetch full stats from API (server source of truth)
                const ids = items.map((m) => m._id).filter(Boolean) as string[];
                if (ids.length > 0) {
                  try {
                    await useInteractionStore.getState().loadBatchContentStats(ids, "media", { forceRefresh: true });
                  } catch {}
                }
              }
            }).catch(() => {}),
            // Preload for different content types
            mediaApi.getDefaultContent({ page: 1, limit: 10, contentType: "ALL" }).then((resp) => {
              if (resp.success && Array.isArray(resp.media)) {
                useContentCacheStore.getState().set("ALL:page:1", {
                  items: resp.media as any,
                  page: 1,
                  limit: resp.limit || 10,
                  total: resp.total || 0,
                  fetchedAt: Date.now(),
                });
              }
            }).catch(() => {}),
            mediaApi.getDefaultContent({ page: 1, limit: 10, contentType: "sermon" }).then((resp) => {
              if (resp.success && Array.isArray(resp.media)) {
                useContentCacheStore.getState().set("sermon:page:1", {
                  items: resp.media as any,
                  page: 1,
                  limit: resp.limit || 10,
                  total: resp.total || 0,
                  fetchedAt: Date.now(),
                });
              }
            }).catch(() => {}),
            mediaApi.getDefaultContent({ page: 1, limit: 10, contentType: "music" }).then((resp) => {
              if (resp.success && Array.isArray(resp.media)) {
                useContentCacheStore.getState().set("music:page:1", {
                  items: resp.media as any,
                  page: 1,
                  limit: resp.limit || 10,
                  total: resp.total || 0,
                  fetchedAt: Date.now(),
                });
              }
            }).catch(() => {}),
          ]).catch(() => {});
        } catch (preloadError) {
          // Non-critical, continue with login
        }
      }

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error: any) {
      console.error("❌ Network error in login:", error);
      console.error("   Error name:", error.name);
      console.error("   Error message:", error.message);
      console.error("   Error stack:", error.stack);
      
      // Provide more specific error message
      let errorMessage = "Network error occurred";
      if (error.message?.includes("Network request failed")) {
        errorMessage = "Cannot connect to server. Please check your internet connection.";
      } else if (error.message?.includes("SSL")) {
        errorMessage = "Security certificate error. Please check your device date/time.";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Connection timed out. Server may be busy.";
      }
      
      return {
        success: false,
        error: errorMessage,
        status: 0,
      };
    }
  }

  // Register with Jevah backend
  async register(userData: any) {
    try {
      // console.log("🔍 Registering new user:", userData.email);

      const response = await fetch(`${this.baseURL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      // console.log("✅ Register response:", data);

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error) {
      // console.error("❌ Error in register:", error);
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      };
    }
  }

  // Verify Email Code - For email verification during signup
  async verifyEmailCode(email: string, code: string) {
    try {
      // console.log("🔍 Verifying email code for:", email);
      // console.log("🔍 Code being sent:", code);
      // console.log("🔍 Code length:", code.length);
      // console.log("🔍 API URL:", `${this.baseURL}/verify-email`);

      // Normalize to avoid server mismatches
      const normalizedEmail = (email || "").trim().toLowerCase();
      const normalizedCode = (code || "")
        .toString()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .trim();
      const requestBody: any = {
        email: normalizedEmail,
        code: normalizedCode,
        verificationCode: normalizedCode, // some backends accept this key
      };
      // console.log("🔍 Request body:", JSON.stringify(requestBody));

      const response = await fetch(`${this.baseURL}/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      // console.log("✅ Verify email response:", data);

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error: any) {
      // console.error("❌ Error in verifyEmailCode:", error);
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      };
    }
  }

  // Resend Email Verification Code
  async resendEmailVerification(email: string) {
    try {
      // console.log("🔍 Resending email verification for:", email);
      // console.log("🔍 Base URL:", this.baseURL);
      // console.log("🔍 Full URL:", `${this.baseURL}/resend-verification-email`);

      const response = await fetch(
        `${this.baseURL}/resend-verification-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "expo-platform": Platform.OS,
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();
      // console.log("✅ Resend email verification response:", data);

      return {
        success: response.ok,
        data,
        status: response.status,
      };
    } catch (error: any) {
      // console.error("❌ Error in resendEmailVerification:", error);
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      };
    }
  }

  // Get current user data
  async fetchMe() {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(`${this.baseURL}/me`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await response.json();
      if (response.ok && (data?.data || data)?.user) {
        const user = (data?.data || data).user;
        await AsyncStorage.setItem("user", JSON.stringify(user));
      }
      return { success: response.ok, data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      } as any;
    }
  }

  // Logout - Clear stored token
  async logout() {
    try {
      await AsyncStorage.removeItem("token");
      // console.log("🗑️ Token removed from AsyncStorage");
      return { success: true };
    } catch (error) {
      // console.error("❌ Error in logout:", error);
      return { success: false };
    }
  }

  // Get stored token
  async getToken() {
    try {
      const token = await AsyncStorage.getItem("token");
      // console.log(
      //   "🔑 Retrieved token from AsyncStorage:",
      //   token ? "exists" : "not found"
      // );
      return token;
    } catch (error) {
      // console.error("❌ Error getting token:", error);
      return null;
    }
  }
}

export default new AuthService();
