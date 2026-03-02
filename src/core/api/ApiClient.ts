import { API_CONFIG } from "../../shared/constants";
import { ApiResponse } from "../../shared/types";

class ApiClient {
  private baseURL: string;
  private timeout: number;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Add auth token if available
    const authToken = await this.getAuthToken();
    if (authToken) {
      defaultHeaders["Authorization"] = `Bearer ${authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      timeout: this.timeout,
    };

    try {
      console.log(`🌐 API Request: ${options.method || "GET"} ${url}`);

      const response = await fetch(url, config);

      // Handle 401 and 402 errors with token refresh (402 is used for auth failures)
      if ((response.status === 401 || response.status === 402) && authToken) {
        console.log(`🔄 Received ${response.status}, attempting token refresh...`);
        const newToken = await this.refreshToken();

        if (newToken) {
          // Retry the request with the new token
          const retryHeaders = {
            ...defaultHeaders,
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          };

          const retryConfig: RequestInit = {
            ...options,
            headers: retryHeaders,
            timeout: this.timeout,
          };

          console.log(
            `🔄 Retrying request with new token: ${options.method || "GET"} ${url}`
          );

          const retryResponse = await fetch(url, retryConfig);

          if (!retryResponse.ok) {
            const errorText = await retryResponse.text();
            console.error(
              `❌ API Error after refresh: ${retryResponse.status} ${retryResponse.statusText}`,
              errorText
            );

            return {
              success: false,
              error: `HTTP ${retryResponse.status}: ${retryResponse.statusText}`,
            };
          }

          const retryData = await retryResponse.json();
          return {
            success: true,
            data: retryData,
          };
        } else {
          // Token refresh failed, return the original error
          const errorText = await response.text();
          console.error(
            `❌ API Error (token refresh failed): ${response.status} ${response.statusText}`,
            errorText
          );

          return {
            success: false,
            error: "Session expired. Please login again.",
          };
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
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
          const errorData = JSON.parse(errorText);
          if (errorData.error || errorData.message) {
            errorMessage = errorData.error || errorData.message;
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

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(
        `❌ API Exception: ${options.method || "GET"} ${url}`,
        error
      );

      // Enhanced error handling for network failures
      let errorMessage = "Network error";
      if (error instanceof Error) {
        if (error.message.includes("Network request failed")) {
          errorMessage =
            "Unable to connect to server. Please check your internet connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Request timed out. The server may be experiencing issues.";
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

  // Get authentication token
  private async getAuthToken(): Promise<string | null> {
    try {
      // Import TokenUtils dynamically to avoid circular dependencies
      const TokenUtils = await import("../../../app/utils/tokenUtils");
      return await TokenUtils.default.getAuthToken();
    } catch (error) {
      console.warn("Failed to get auth token:", error);
      return null;
    }
  }

  // Refresh authentication token
  private async refreshToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const currentToken = await this.getAuthToken();
        if (!currentToken) {
          console.error("❌ No token to refresh");
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
          const errorText = await refreshResponse.text();
          console.error(
            `❌ Token refresh failed: ${refreshResponse.status}`,
            errorText
          );

          // Only clear tokens if refresh endpoint itself returns 401/402
          // This means the refresh token is also invalid
          if (refreshResponse.status === 401 || refreshResponse.status === 402) {
            console.log("⚠️ Refresh token also invalid, clearing tokens");
            const TokenUtils = await import("../../../app/utils/tokenUtils");
            await TokenUtils.default.clearAuthTokens();
            console.log("🔄 Session expired, tokens cleared");
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
          console.error("❌ Token refresh succeeded but no token in response");
          return null;
        }

        // Validate and store the new token
        const TokenUtils = await import("../../../app/utils/tokenUtils");
        if (!TokenUtils.default.isValidJWTFormat(newToken)) {
          console.error("❌ New token has invalid format");
          return null;
        }

        await TokenUtils.default.storeAuthToken(newToken);
        console.log("✅ Token refreshed successfully");

        return newToken;
      } catch (error) {
        console.error("❌ Token refresh error:", error);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // GET request
  async get<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(url.pathname + url.search, {
      method: "GET",
    });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }

  // Upload file
  async upload<T>(
    endpoint: string,
    file: any,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const authToken = await this.getAuthToken();

    const formData = new FormData();
    formData.append("file", file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers: Record<string, string> = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      console.log(`📤 Upload Request: POST ${url}`);

      let response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        timeout: this.timeout,
      });

      // Handle 401 and 402 errors with token refresh (402 is used for auth failures)
      if ((response.status === 401 || response.status === 402) && authToken) {
        console.log(`🔄 Upload received ${response.status}, attempting token refresh...`);
        const newToken = await this.refreshToken();

        if (newToken) {
          // Retry the upload with the new token
          headers["Authorization"] = `Bearer ${newToken}`;
          console.log(`🔄 Retrying upload with new token: POST ${url}`);
          
          response = await fetch(url, {
            method: "POST",
            headers,
            body: formData,
            timeout: this.timeout,
          });
        } else {
          // Token refresh failed
          const errorText = await response.text();
          console.error(
            `❌ Upload Error (token refresh failed): ${response.status} ${response.statusText}`,
            errorText
          );

          return {
            success: false,
            error: `HTTP ${response.status}: Authentication failed. Please log in again.`,
          };
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ Upload Error: ${response.status} ${response.statusText}`,
          errorText
        );

        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log(`✅ Upload Success: POST ${url}`);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`❌ Upload Exception: POST ${url}`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  // Test endpoint availability
  async testEndpoint(endpoint: string): Promise<boolean> {
    try {
      const response = await this.get(endpoint);
      return response.success;
    } catch (error) {
      console.warn(`Endpoint test failed for ${endpoint}:`, error);
      return false;
    }
  }

  // Check server health
  async checkServerHealth(): Promise<{
    isHealthy: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Try a simple health check endpoint first
      const healthResponse = await fetch(`${this.baseURL}/health`, {
        method: "GET",
        timeout: 5000, // 5 second timeout for health check
      });

      const responseTime = Date.now() - startTime;

      if (healthResponse.ok) {
        return {
          isHealthy: true,
          responseTime,
        };
      }

      // If health endpoint doesn't exist, try the main API
      const apiResponse = await fetch(`${this.baseURL}/api`, {
        method: "GET",
        timeout: 5000,
      });

      const responseTime2 = Date.now() - startTime;

      return {
        isHealthy: apiResponse.ok,
        responseTime: responseTime2,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.warn("Server health check failed:", error);

      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Retry with exponential backoff
  async retry<T>(
    fn: () => Promise<ApiResponse<T>>,
    maxAttempts: number = API_CONFIG.RETRY_ATTEMPTS
  ): Promise<ApiResponse<T>> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error;
      }

      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(
          `⏳ Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
