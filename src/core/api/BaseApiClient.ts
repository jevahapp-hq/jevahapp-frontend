/**
 * Base API Client - Unified API client for all services
 * This consolidates all API client implementations to avoid DRY violations
 */

import { Platform } from "react-native";
import { API_BASE_URL } from "../../../app/utils/api";
import TokenUtils from "../../../app/utils/tokenUtils";
import { ApiResponse } from "../../shared/types";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: HeadersInit;
  requireAuth?: boolean;
  timeoutMs?: number;
  retryOnAbort?: boolean;
  cache?: boolean;
  cacheDuration?: number;
}

// Shared (module-level) rate-limit circuit breaker. Every service extending
// BaseApiClient hits the same backend, so a 429 from one service (e.g. the
// Bible API) means the others (e.g. media) will likely be limited too.
// Sharing this state stops all of them from continuing to hammer the API
// and extending the rate-limit window instead of letting it recover.
const RATE_LIMIT_COOLDOWN_MS = 30_000;
const RATE_LIMIT_COOLDOWN_MAX_MS = 120_000;
let rateLimitedUntil = 0;
let rateLimitCooldownMs = RATE_LIMIT_COOLDOWN_MS;

function activateRateLimitCooldown(response: Response): void {
  let cooldownMs = rateLimitCooldownMs;

  const retryAfterHeader = response.headers?.get?.("Retry-After");
  const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
  if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
    cooldownMs = retryAfterSeconds * 1000;
  }

  rateLimitedUntil = Date.now() + cooldownMs;
  rateLimitCooldownMs = Math.min(rateLimitCooldownMs * 2, RATE_LIMIT_COOLDOWN_MAX_MS);
}

export class BaseApiClient {
  protected baseURL: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || API_BASE_URL || "https://api.jevahapp.com";
  }

  /**
   * Get authorization headers with token
   */
  protected async getAuthHeaders(): Promise<HeadersInit> {
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

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const currentToken = await TokenUtils.getAuthToken();
        if (!currentToken) {
          console.warn("No token to refresh");
          return null;
        }

        console.log("🔄 Attempting to refresh token...");

        const refreshResponse = await fetch(`${this.baseURL}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ token: currentToken }),
        });

        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text().catch(() => "");
          console.error(`Token refresh failed: ${refreshResponse.status}`, errorText);

          // Only clear tokens if refresh endpoint itself returns 401/402
          // This means the refresh token is also invalid
          if (refreshResponse.status === 401 || refreshResponse.status === 402) {
            console.log("⚠️ Refresh token also invalid, clearing tokens");
            await TokenUtils.clearAuthTokens();
            console.log("Session expired, tokens cleared");
          } else {
            // Other errors (network, server errors) - don't clear tokens
            // User might still be able to use the app with cached content
            console.log("⚠️ Token refresh failed but not due to auth, keeping tokens");
          }

          return null;
        }

        const refreshData = await refreshResponse.json();
        const newToken =
          refreshData?.data?.token || refreshData?.token || null;

        if (!newToken) {
          console.error("Token refresh succeeded but no token in response");
          return null;
        }

        // Validate and store the new token
        if (!TokenUtils.isValidJWTFormat(newToken)) {
          console.error("New token has invalid format");
          return null;
        }

        await TokenUtils.storeAuthToken(newToken);
        console.log("✅ Token refreshed successfully");

        return newToken;
      } catch (error) {
        console.error("Token refresh error:", error);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Generic API request method with automatic token refresh
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      body,
      headers: customHeaders = {},
      requireAuth = true,
      timeoutMs = 30000,
      retryOnAbort = false,
    } = options;

    if (Date.now() < rateLimitedUntil) {
      const secondsLeft = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      console.warn(
        `⏸️ Skipping request (rate limited for ${secondsLeft}s more): ${method} ${endpoint}`
      );
      return {
        success: false,
        error: "Too many requests. Please wait a moment and try again.",
      };
    }

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
      
      let response: Response;
      try {
        response = await fetch(`${this.baseURL}${endpoint}`, {
          ...config,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError" && retryOnAbort) {
          // Retry once on abort
          response = await fetch(`${this.baseURL}${endpoint}`, config);
        } else {
          throw fetchError;
        }
      }

      if (response.status === 429) {
        activateRateLimitCooldown(response);
        const errorText = await response.text().catch(() => "");
        console.error(`❌ API Error: 429 (rate limited, backing off)`, errorText);
        return {
          success: false,
          error: "Too many requests. Please wait a moment and try again.",
        };
      }

      // Handle 401/402 with token refresh
      if (
        (response.status === 401 || response.status === 402) &&
        requireAuth
      ) {
        console.log(`🔄 Received ${response.status}, attempting token refresh...`);
        const newToken = await this.refreshToken();

        if (newToken) {
          // Retry the request with the new token
          const retryHeaders = {
            ...authHeaders,
            Authorization: `Bearer ${newToken}`,
            ...customHeaders,
          };

          const retryConfig: RequestInit = {
            ...config,
            headers: retryHeaders,
          };

          response = await fetch(`${this.baseURL}${endpoint}`, retryConfig);
        } else {
          // Token refresh failed, but don't clear tokens here
          // Only clear if refresh endpoint itself returns 401/402
          console.log("⚠️ Token refresh failed, but keeping existing token for retry");
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(
          `❌ API Error: ${response.status} ${response.statusText}`,
          errorText
        );

        // Handle 401/402 errors with user-friendly messages
        if (response.status === 401 || response.status === 402) {
          return {
            success: false,
            error: "Session expired. Please login again.",
          };
        }

        // Try to parse error message from response
        let errorMessage = response.statusText || "An error occurred";
        try {
          if (errorText) {
            const errorData = JSON.parse(errorText);
            if (errorData.error || errorData.message) {
              errorMessage = errorData.error || errorData.message;
            }
          }
        } catch {
          // If parsing fails, use status text
        }

        return {
          success: false,
          error: errorMessage,
        };
      }

      const data = await response.json();

      // Successful request - reset the backoff multiplier
      rateLimitCooldownMs = RATE_LIMIT_COOLDOWN_MS;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`❌ API Exception: ${method} ${endpoint}`, error);

      let errorMessage = "Network error";
      if (error instanceof Error) {
        if (error.message.includes("Network request failed")) {
          errorMessage =
            "Unable to connect to server. Please check your internet connection.";
        } else if (error.message.includes("timeout") || error.name === "AbortError") {
          errorMessage = "Request timed out. The server may be experiencing issues.";
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage = "Server is unreachable. Please try again later.";
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * GET request helper
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { ...options, method: "GET" });
  }

  /**
   * POST request helper
   */
  protected async post<T>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data,
    });
  }

  /**
   * PUT request helper
   */
  protected async put<T>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data,
    });
  }

  /**
   * DELETE request helper
   */
  protected async delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }

  /**
   * PATCH request helper
   */
  protected async patch<T>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data,
    });
  }
}

export default BaseApiClient;

