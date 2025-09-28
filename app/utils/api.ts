import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import { environmentManager } from "./environmentManager";
import TokenUtils from "./tokenUtils";

// Prioritize environment variable over environment manager
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || environmentManager.getCurrentUrl();

// Log the API URL source for debugging
if (process.env.EXPO_PUBLIC_API_URL) {
  console.log(
    "🌐 Using EXPO_PUBLIC_API_URL from environment:",
    process.env.EXPO_PUBLIC_API_URL
  );
} else {
  console.log(
    "🌐 Using API URL from environment manager:",
    environmentManager.getCurrentUrl()
  );
}

// Update API URL when environment changes (only if no environment variable is set)
if (!process.env.EXPO_PUBLIC_API_URL) {
  environmentManager.addListener((environment) => {
    // API_BASE_URL is now a const, so we can't reassign it
    // This logic should be handled differently if needed
    console.log(
      "🌐 Environment switched to:",
      environment,
      "URL:",
      API_BASE_URL
    );

    // Update axios base URL
    // apiAxios.defaults.baseURL is set at creation time
  });
}

// Log the current API URL for debugging
console.log("🌐 Final API Base URL:", API_BASE_URL);

// Configure axios defaults for better timeout handling
axios.defaults.timeout = 15000; // 15 seconds timeout

// Add retry interceptor with proper typing
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    if (!config) {
      return Promise.reject(error);
    }

    // Add retry configuration to config
    const retryConfig = config as any;
    retryConfig.retry = retryConfig.retry || 3;
    retryConfig.retryDelay = retryConfig.retryDelay || 1000;
    retryConfig.retryCount = retryConfig.retryCount || 0;

    if (retryConfig.retryCount >= retryConfig.retry) {
      return Promise.reject(error);
    }

    retryConfig.retryCount += 1;

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, retryConfig.retryDelay));

    return axios(config);
  }
);

// Create a configured axios instance for API calls
export const apiAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "expo-platform": Platform.OS,
  },
});

// Add request interceptor to automatically add auth token
apiAxios.interceptors.request.use(
  async (config) => {
    try {
      const token =
        (await AsyncStorage.getItem("token")) ||
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("authToken"));

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Failed to get auth token:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced API utility functions
export class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Get authorization header with user token
  async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const token = await TokenUtils.getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      return headers;
    } catch (error) {
      console.error("Error getting auth headers:", error);
      return {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
    }
  }

  // Refresh token once using backend contract: POST /api/auth/refresh { token }
  private async refreshToken(): Promise<string> {
    const current = await TokenUtils.getAuthToken();
    if (!current) {
      throw new Error("No token to refresh");
    }

    const res = await fetch(`${this.baseURL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${current}`,
      },
      body: JSON.stringify({ token: current }),
    });

    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
    }

    const newToken = (json as any)?.data?.token || (json as any)?.token;
    if (!newToken) {
      throw new Error("Refresh succeeded but no token in response");
    }

    await TokenUtils.storeAuthToken(newToken);
    return newToken;
  }

  // Generic API request method
  async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      body?: any;
      headers?: HeadersInit;
      requireAuth?: boolean;
      timeoutMs?: number;
      retryOnAbort?: boolean;
    } = {}
  ): Promise<T> {
    const {
      method = "GET",
      body,
      headers: customHeaders = {},
      requireAuth = true,
      timeoutMs = 15000,
      retryOnAbort = false,
    } = options;

    try {
      const authHeaders = requireAuth
        ? await this.getAuthHeaders()
        : { "Content-Type": "application/json", "expo-platform": Platform.OS };
      const headers = { ...authHeaders, ...customHeaders };

      const config: RequestInit = {
        method,
        headers,
      };

      if (body && method !== "GET") {
        config.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      // First attempt with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const first = await fetch(`${this.baseURL}${endpoint}`, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (requireAuth && first.status === 401) {
        try {
          const newToken = await this.refreshToken();
          const retryHeaders: HeadersInit = {
            ...customHeaders,
            "Content-Type": "application/json",
            "expo-platform": Platform.OS,
            Authorization: `Bearer ${newToken}`,
          };
          const retryConfig: RequestInit = {
            method,
            headers: retryHeaders,
          };
          if (body && method !== "GET") {
            retryConfig.body =
              typeof body === "string" ? body : JSON.stringify(body);
          }
          // Retry with a fresh timeout
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(
            () => retryController.abort(),
            15000
          );
          const retry = await fetch(`${this.baseURL}${endpoint}`, {
            ...retryConfig,
            signal: retryController.signal,
          });
          clearTimeout(retryTimeoutId);
          if (!retry.ok) {
            const errorData = await retry.text();
            throw new Error(`HTTP ${retry.status}: ${errorData}`);
          }
          const retryContentType = retry.headers.get("content-type");
          if (
            retryContentType &&
            retryContentType.includes("application/json")
          ) {
            return (await retry.json()) as T;
          }
          return (await retry.text()) as unknown as T;
        } catch (refreshErr) {
          console.error("Token refresh failed:", refreshErr);
        }
      }

      if (!first.ok) {
        const errorData = await first.text();
        throw new Error(`HTTP ${first.status}: ${errorData}`);
      }

      const contentType = first.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return (await first.json()) as T;
      } else {
        return (await first.text()) as unknown as T;
      }
    } catch (error) {
      // Swallow AbortError if caller wants retry-on-abort
      if ((error as any)?.name === "AbortError" && retryOnAbort) {
        try {
          // Single retry with same options but without changing auth/headers
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(
            () => retryController.abort(),
            timeoutMs
          );
          const authHeaders = requireAuth
            ? await this.getAuthHeaders()
            : {
                "Content-Type": "application/json",
                "expo-platform": Platform.OS,
              };
          const headers = { ...authHeaders, ...customHeaders };
          const config: RequestInit = { method, headers };
          if (body && method !== "GET") {
            config.body =
              typeof body === "string" ? body : JSON.stringify(body);
          }
          const retryResp = await fetch(`${this.baseURL}${endpoint}`, {
            ...config,
            signal: retryController.signal,
          });
          clearTimeout(retryTimeoutId);
          if (!retryResp.ok) {
            const errorData = await retryResp.text();
            throw new Error(`HTTP ${retryResp.status}: ${errorData}`);
          }
          const contentType = retryResp.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return (await retryResp.json()) as T;
          }
          return (await retryResp.text()) as unknown as T;
        } catch (retryErr) {
          console.error(
            `API retry after abort failed for ${endpoint}:`,
            retryErr
          );
          throw retryErr;
        }
      }

      if ((error as any)?.name === "AbortError") {
        // Suppress noisy stack; let caller handle
        console.warn(`API request aborted (timeout) for ${endpoint}`);
        throw error;
      }

      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Authentication methods
  async login(
    email: string,
    password: string
  ): Promise<{ user: any; token: string }> {
    const response = await this.request<{ user: any; token: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: { email, password },
        requireAuth: false,
      }
    );

    // Store token and user data (single source of truth)
    await TokenUtils.storeAuthToken(response.token);
    await AsyncStorage.setItem("user", JSON.stringify(response.user));

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
  }): Promise<{ user: any; token: string }> {
    const response = await this.request<{ user: any; token: string }>(
      "/api/auth/register",
      {
        method: "POST",
        body: userData,
        requireAuth: false,
      }
    );

    // Store token and user data (single source of truth)
    await TokenUtils.storeAuthToken(response.token);
    await AsyncStorage.setItem("user", JSON.stringify(response.user));

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.warn("Logout API call failed:", error);
    } finally {
      // Clear local storage regardless of API success
      await TokenUtils.clearAuthTokens();
      await AsyncStorage.removeItem("user");

      // Clear user-scoped notification caches
      try {
        await AsyncStorage.removeItem("cache.notifications.list:anonymous");
        await AsyncStorage.removeItem("cache.notifications.stats:anonymous");
        // Also attempt to clear for known user if present
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const uid = user?._id || user?.id;
          if (uid) {
            await AsyncStorage.removeItem(`cache.notifications.list:${uid}`);
            await AsyncStorage.removeItem(`cache.notifications.stats:${uid}`);
          }
        }
      } catch {}

      // Clear user-specific interaction data
      try {
        const { useInteractionStore } = await import(
          "../store/useInteractionStore"
        );
        useInteractionStore.getState().clearCache();
        console.log("✅ Cleared interaction cache on logout");
      } catch (cacheError) {
        console.warn("⚠️ Failed to clear interaction cache:", cacheError);
      }
    }
  }

  // No refresh implementation on frontend; backend may add later.

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem("userToken");
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Get current user data
  async getCurrentUser(): Promise<any> {
    try {
      const userStr = await AsyncStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;
