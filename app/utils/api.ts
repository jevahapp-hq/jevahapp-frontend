import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import { environmentManager } from "./environmentManager";
import TokenUtils from "./tokenUtils";

// Prioritize environment variable over environment manager
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || environmentManager.getCurrentUrl();

// Function to get API base URL (for use in services)
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

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
axios.defaults.timeout = 30000; // 30 seconds timeout to handle Render cold starts

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
  timeout: 30000, // 30 seconds for Render cold starts
  headers: {
    "Content-Type": "application/json",
    "expo-platform": Platform.OS,
  },
});

// Add request interceptor to automatically add auth token
apiAxios.interceptors.request.use(
  async (config) => {
    try {
      // Skip interceptor if token is already set manually (e.g., after refresh)
      if (config.headers.Authorization && config._skipInterceptor) {
        return config;
      }
      
      // Use TokenUtils to get token from all sources (AsyncStorage + SecureStore)
      const token = await TokenUtils.getAuthToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("⚠️ No auth token found in interceptor");
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

// Add response interceptor to handle 401 errors and refresh token
apiAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log("🔄 Token expired, attempting to refresh...");
        
        // Get current token
        const currentToken = await TokenUtils.getAuthToken();
        if (!currentToken) {
          console.error("❌ No token to refresh");
          throw new Error("No token to refresh");
        }

        console.log("🔄 Refreshing token:", {
          currentTokenPreview: TokenUtils.getTokenPreview(currentToken),
          refreshEndpoint: `${API_BASE_URL}/api/auth/refresh`,
        });

        // Try to refresh the token
        const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ token: currentToken }),
        });

        console.log("🔄 Refresh response:", {
          status: refreshResponse.status,
          ok: refreshResponse.ok,
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newToken = refreshData?.data?.token || refreshData?.token;
          
          console.log("🔄 Refresh data:", {
            hasNewToken: !!newToken,
            newTokenPreview: newToken ? TokenUtils.getTokenPreview(newToken) : "none",
            refreshDataKeys: Object.keys(refreshData),
            fullResponse: refreshData,
          });
          
          if (newToken) {
            // Validate the new token format
            if (!TokenUtils.isValidJWTFormat(newToken)) {
              console.error("❌ New token has invalid format");
              throw new Error("Token refresh returned invalid token format");
            }
            
            // Store the new token
            await TokenUtils.storeAuthToken(newToken);
            
            // Verify the token was stored
            const verifyToken = await TokenUtils.getAuthToken();
            console.log("✅ Token stored and verified:", {
              stored: !!verifyToken,
              matches: verifyToken === newToken,
              tokenPreview: verifyToken ? TokenUtils.getTokenPreview(verifyToken) : "none",
            });
            
            if (verifyToken !== newToken) {
              console.error("❌ Token mismatch after storage");
              throw new Error("Token storage verification failed");
            }
            
            // Update the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // Mark that we've already set the token manually
            originalRequest._skipInterceptor = true;
            
            console.log("✅ Token refreshed successfully, retrying request with new token...");
            console.log("🔄 Retry request config:", {
              url: originalRequest.url,
              method: originalRequest.method,
              hasAuthHeader: !!originalRequest.headers.Authorization,
              authHeaderPreview: originalRequest.headers.Authorization 
                ? originalRequest.headers.Authorization.substring(0, 30) + "..." 
                : "none",
            });
            
            // Retry the original request with the new token
            // Create a new config to ensure the token is used
            const retryConfig = {
              ...originalRequest,
              headers: {
                ...originalRequest.headers,
                Authorization: `Bearer ${newToken}`,
              },
            };
            
            return apiAxios(retryConfig);
          } else {
            console.error("❌ Token refresh succeeded but no token in response");
            console.error("❌ Refresh response data:", refreshData);
            throw new Error("Token refresh succeeded but no token in response");
          }
        } else {
          const errorText = await refreshResponse.text().catch(() => "Could not read error");
          console.error("❌ Token refresh failed:", {
            status: refreshResponse.status,
            statusText: refreshResponse.statusText,
            error: errorText,
          });
          
          // If refresh fails with 401, the session is truly invalid
          if (refreshResponse.status === 401) {
            console.error("❌ Token refresh also returned 401 - session is invalid");
            await TokenUtils.clearAuthTokens();
            throw new Error("Session expired. Please log in again.");
          }
          
          throw new Error(`Token refresh failed: ${refreshResponse.status}`);
        }
      } catch (refreshError) {
        console.error("❌ Token refresh error:", refreshError);
        // Clear tokens and redirect to login if needed
        await TokenUtils.clearAuthTokens();
        return Promise.reject(error);
      }
    }

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
      timeoutMs = 30000, // 30 seconds for Render cold starts
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
            30000
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
