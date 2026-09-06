import { fetchWithTimeout } from "../../src/core/api/fetchWithTimeout";
import {
  clearAuthTokens as clearSecureAuthTokens,
  getAuthToken as getSecureAuthToken,
  getTokenSources,
  isValidJwtFormat,
  storeAuthToken as storeSecureAuthToken,
} from "../../src/core/auth/tokenStore";

/**
 * Centralized token management utilities
 * JWTs are stored in SecureStore only (legacy AsyncStorage copies are migrated off).
 */
export class TokenUtils {
  /**
   * Retrieve authentication token from SecureStore (migrating any legacy copies).
   */
  static async getAuthToken(): Promise<string | null> {
    try {
      return await getSecureAuthToken();
    } catch (error) {
      console.error("❌ Error retrieving auth token:", error);
      return null;
    }
  }

  /**
   * Validate if a token has the correct JWT format
   */
  static isValidJWTFormat(token: string): boolean {
    return isValidJwtFormat(token);
  }

  /**
   * Get token information for debugging (never includes the token value)
   */
  static async getTokenInfo(): Promise<{
    hasToken: boolean;
    tokenLength: number;
    tokenFormat: "JWT" | "Other" | "None";
    sources: string[];
  }> {
    const token = await this.getAuthToken();
    const sources = await getTokenSources();

    return {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenFormat: token
        ? this.isValidJWTFormat(token)
          ? "JWT"
          : "Other"
        : "None",
      sources,
    };
  }

  /**
   * Store authentication token in SecureStore only
   */
  static async storeAuthToken(token: string): Promise<void> {
    try {
      await storeSecureAuthToken(token);

      if (__DEV__) console.log("✅ Auth token stored successfully");
      try {
        const { markBackendSessionPresent } = require("./sessionAuth");
        markBackendSessionPresent();
      } catch {
        // no-op
      }
    } catch (error) {
      if (__DEV__) console.error("❌ Error storing auth token:", error);
      throw error;
    }
  }

  /**
   * Clear all authentication tokens from storage
   */
  static async clearAuthTokens(): Promise<void> {
    try {
      await clearSecureAuthTokens();

      if (__DEV__) console.log("✅ Auth tokens cleared successfully");
      try {
        const { clearBackendSessionPresent } = require("./sessionAuth");
        clearBackendSessionPresent();
      } catch {
        // no-op
      }
    } catch (error) {
      if (__DEV__) console.error("❌ Error clearing auth tokens:", error);
      throw error;
    }
  }

  /**
   * Validate token with backend (if endpoint exists)
   */
  static async validateTokenWithBackend(
    token: string,
    baseUrl?: string
  ): Promise<boolean> {
    try {
      if (!this.isValidJWTFormat(token)) {
        return false;
      }

      const { getApiBaseUrl } = await import("./environmentManager");
      const origin = baseUrl || getApiBaseUrl();

      const response = await fetchWithTimeout(
        `${origin}/api/auth/validate`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
        5000
      );

      return response.ok;
    } catch (error) {
      console.error("❌ Token validation failed:", error);
      return false;
    }
  }

  /**
   * Get a safe token preview for logging (first 10 chars + ...)
   */
  static getTokenPreview(token: string): string {
    if (!token) return "null";
    return token.length > 10 ? `${token.substring(0, 10)}...` : token;
  }
}

export default TokenUtils;
