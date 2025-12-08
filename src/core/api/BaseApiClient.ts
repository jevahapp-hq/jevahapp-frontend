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

export class BaseApiClient {
  protected baseURL: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || API_BASE_URL || "http://localhost:3000";
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

          // If refresh fails with 401/402, clear tokens
          if (refreshResponse.status === 401 || refreshResponse.status === 402) {
            await TokenUtils.clearAuthTokens();
            console.log("Session expired, tokens cleared");
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
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(
          `❌ API Error: ${response.status} ${response.statusText}`,
          errorText
        );

        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
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
