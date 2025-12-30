import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Centralized token management utilities
 * Provides consistent token retrieval, validation, and storage across the app
 */
export class TokenUtils {
  /**
   * Retrieve authentication token from multiple storage sources
   * Priority: userToken -> token -> jwt (SecureStore)
   */
  static async getAuthToken(): Promise<string | null> {
    try {
      // Try AsyncStorage first
      let token = await AsyncStorage.getItem("userToken");
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }

      // If not found in AsyncStorage, try SecureStore
      if (!token) {
        try {
          const { default: SecureStore } = await import("expo-secure-store");
          token = await SecureStore.getItemAsync("jwt");
        } catch (secureStoreError) {
          console.log("SecureStore not available or no JWT token");
        }
      }

      return token;
    } catch (error) {
      console.error("❌ Error retrieving auth token:", error);
      return null;
    }
  }

  /**
   * Validate if a token has the correct JWT format
   */
  static isValidJWTFormat(token: string): boolean {
    if (!token || token.trim() === "") {
      return false;
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split(".");
    return parts.length === 3;
  }

  /**
   * Get token information for debugging
   */
  static async getTokenInfo(): Promise<{
    hasToken: boolean;
    tokenLength: number;
    tokenFormat: "JWT" | "Other" | "None";
    sources: string[];
  }> {
    const sources: string[] = [];
    let token: string | null = null;

    // Check AsyncStorage sources
    const userToken = await AsyncStorage.getItem("userToken");
    const tokenStorage = await AsyncStorage.getItem("token");

    if (userToken) {
      sources.push("userToken");
      token = userToken;
    } else if (tokenStorage) {
      sources.push("token");
      token = tokenStorage;
    }

    // Check SecureStore
    if (!token) {
      try {
        const { default: SecureStore } = await import("expo-secure-store");
        const jwtToken = await SecureStore.getItemAsync("jwt");
        if (jwtToken) {
          sources.push("jwt");
          token = jwtToken;
        }
      } catch (error) {
        // SecureStore not available
      }
    }

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
   * Store authentication token in multiple storage locations
   */
  static async storeAuthToken(token: string): Promise<void> {
    try {
      // Store in AsyncStorage
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("token", token);

      // Store in SecureStore
      try {
        const { default: SecureStore } = await import("expo-secure-store");
        await SecureStore.setItemAsync("jwt", token);
      } catch (secureStoreError) {
        console.warn(
          "⚠️ Could not store token in SecureStore:",
          secureStoreError
        );
      }

      console.log("✅ Auth token stored successfully");
    } catch (error) {
      console.error("❌ Error storing auth token:", error);
      throw error;
    }
  }

  /**
   * Clear all authentication tokens from storage
   */
  static async clearAuthTokens(): Promise<void> {
    try {
      // Clear AsyncStorage
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("token");

      // Clear SecureStore
      try {
        const { default: SecureStore } = await import("expo-secure-store");
        await SecureStore.deleteItemAsync("jwt");
      } catch (secureStoreError) {
        console.warn(
          "⚠️ Could not clear token from SecureStore:",
          secureStoreError
        );
      }

      console.log("✅ Auth tokens cleared successfully");
    } catch (error) {
      console.error("❌ Error clearing auth tokens:", error);
      throw error;
    }
  }

  /**
   * Validate token with backend (if endpoint exists)
   */
  static async validateTokenWithBackend(
    token: string,
    baseUrl: string = "https://api.jevahapp.com"
  ): Promise<boolean> {
    try {
      if (!this.isValidJWTFormat(token)) {
        return false;
      }

      const response = await fetch(`${baseUrl}/api/auth/validate`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      });

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

