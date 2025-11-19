import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Alert, Platform } from "react-native";

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_URL ||
  (__DEV__ ? "http://localhost:8081" : "https://jevahapp-backend-rped.onrender.com");

export interface UserInfo {
  firstName: string;
  lastName: string;
  avatar: string;
  email: string;
}

export const authUtils = {
  /**
   * Wait for user data to be available after OAuth flow
   */
  async waitForUserData(user: any, maxRetries: number = 20): Promise<any> {
    let retries = 0;

    while (retries < maxRetries) {
      if (user && user.firstName && user.lastName) {
        console.log("✅ User data available after", retries, "retries");
        return user;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      retries++;
      console.log(`⏳ Waiting for user data... retry ${retries}/${maxRetries}`);
    }

    throw new Error("User data not available after OAuth flow");
  },

  /**
   * Test minimal authentication request
   */
  async testMinimalAuthRequest() {
    try {
      const apiUrl = `${API_BASE_URL}/api/auth/clerk-login`;
      console.log("🧪 Testing minimal auth request to:", apiUrl);

      const testBody = {
        token: "test_token",
        userInfo: {
          firstName: "Test",
          lastName: "User",
          avatar: "",
          email: "test@example.com",
        },
      };

      console.log("🧪 Test request body:", JSON.stringify(testBody, null, 2));

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testBody),
      });

      const responseText = await response.text();
      console.log("🧪 Test response:", {
        status: response.status,
        statusText: response.statusText,
        text: responseText,
      });

      return {
        status: response.status,
        response: responseText,
      };
    } catch (error: any) {
      console.error("🧪 Test request failed:", error);
      return {
        status: 0,
        response: error.message,
      };
    }
  },

  /**
   * Debug authentication setup
   */
  async debugAuthSetup() {
    console.log("🔍 === AUTHENTICATION DEBUG INFO ===");
    console.log("📍 API_BASE_URL:", API_BASE_URL);
    console.log("🔧 Environment:", __DEV__ ? "Development" : "Production");

    // Test backend connectivity
    const backendAvailable = await this.testBackendConnection();
    console.log("🌐 Backend accessible:", backendAvailable);

    // Check stored tokens
    const storedToken = await this.getStoredToken();
    console.log("🔑 Stored token exists:", !!storedToken);
    if (storedToken) {
      console.log("🔑 Token preview:", storedToken.substring(0, 20) + "...");
    }

    // Check stored user data
    try {
      const userData = await AsyncStorage.getItem("user");
      console.log("👤 Stored user data exists:", !!userData);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log("👤 User data:", {
          firstName: parsedUser.firstName,
          lastName: parsedUser.lastName,
          hasEmail: !!parsedUser.email,
        });
      }
    } catch (error) {
      console.log("❌ Error reading stored user data:", error);
    }

    console.log("🔍 === END DEBUG INFO ===");
  },

  /**
   * Test backend connectivity
   */
  async testBackendConnection() {
    try {
      const apiUrl = `${API_BASE_URL}/api/auth/clerk-login`;
      console.log("🔍 Testing backend connection to:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });

      console.log("📡 Backend connection test result:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      return response.ok;
    } catch (error) {
      console.error("❌ Backend connection test failed:", error);
      return false;
    }
  },

  /**
   * Send authentication request to backend with fallback
   */
  async sendAuthRequest(token: string, userInfo: UserInfo) {
    const apiUrl = `${API_BASE_URL}/api/auth/clerk-login`;
    console.log("🚀 Making request to:", apiUrl);

    const requestBody = {
      token,
      userInfo,
    };

    console.log("📤 Request payload:", {
      token: token ? `${token.substring(0, 20)}...` : "null",
      userInfo: {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        avatar: userInfo.avatar
          ? `${userInfo.avatar.substring(0, 50)}...`
          : "null",
      },
    });

    console.log("📤 Full request body:", JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log("📥 Backend response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        text: responseText,
      });

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("❌ Failed to parse JSON response:", e);
        console.error("Raw response text:", responseText);
        throw new Error("Invalid JSON response from backend");
      }

      if (!response.ok) {
        console.error("❌ Backend returned error:", {
          status: response.status,
          result: result,
          errorDetails:
            result.error || result.details || "No additional error details",
        });

        // Check if it's a Clerk signing key error
        if (
          result.error &&
          result.error.includes("Failed to retrieve signing key from Clerk")
        ) {
          console.log(
            "🔧 Clerk signing key error detected. This is a backend configuration issue."
          );
          console.log("💡 Please check your backend Clerk configuration:");
          console.log("   1. Verify CLERK_SECRET_KEY is set correctly");
          console.log("   2. Check network connectivity to Clerk servers");
          console.log(
            "   3. Ensure Clerk environment variables match your app"
          );

          throw new Error(
            "Clerk configuration error: Please check your backend Clerk setup"
          );
        }

        // Provide more specific error messages based on the response
        if (response.status === 500) {
          throw new Error(
            `Server error: ${result.message || "Internal server error"}`
          );
        } else if (response.status === 400) {
          throw new Error(
            `Bad request: ${result.message || "Invalid request data"}`
          );
        } else if (response.status === 401) {
          throw new Error(`Unauthorized: ${result.message || "Invalid token"}`);
        } else {
          throw new Error(result.message || result.error || "Login failed");
        }
      }

      console.log("✅ Backend authentication successful:", result);
      return result;
    } catch (fetchError: any) {
      console.error("❌ Network or fetch error:", fetchError);
      throw new Error(`Network error: ${fetchError.message}`);
    }
  },

  /**
   * Store authentication tokens and user data
   */
  async storeAuthData(result: any, userInfo: UserInfo) {
    // Store the JWT token from your backend
    if (result.token) {
      await SecureStore.setItemAsync("jwt", result.token);
      await AsyncStorage.setItem("token", result.token);
      await AsyncStorage.setItem("userToken", result.token);
    }

    // Store user data
    if (result.user) {
      if (result.user.firstName && result.user.lastName) {
        await AsyncStorage.setItem("user", JSON.stringify(result.user));
        console.log("✅ User data saved from backend:", result.user);
      } else {
        throw new Error("Incomplete user data from backend");
      }
    } else {
      const userData = {
        firstName: userInfo.firstName || "Unknown",
        lastName: userInfo.lastName || "User",
        avatar: userInfo.avatar || "",
        email: userInfo.email || "",
      };
      if (userData.firstName && userData.firstName !== "Unknown") {
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        console.log("✅ Fallback user data saved:", userData);
      } else {
        throw new Error("Incomplete Clerk user data");
      }
    }
  },

  /**
   * Clear all authentication data
   */
  async clearAuthData() {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("user");
    await SecureStore.deleteItemAsync("jwt");

    // Clear user-specific interaction data
    try {
      const { useInteractionStore } = await import(
        "../store/useInteractionStore"
      );
      useInteractionStore.getState().clearCache();
      console.log("✅ Cleared interaction cache on logout");
    } catch (error) {
      console.warn("⚠️ Failed to clear interaction cache:", error);
    }
  },

  /**
   * Get stored token
   */
  async getStoredToken(): Promise<string | null> {
    let token = await AsyncStorage.getItem("userToken");
    if (!token) {
      token = await AsyncStorage.getItem("token");
    }
    if (!token) {
      try {
        token = await SecureStore.getItemAsync("jwt");
      } catch (error) {
        console.error("Error getting token from SecureStore:", error);
      }
    }
    return token;
  },

  /**
   * Handle authentication errors
   */
  handleAuthError(error: any) {
    console.error("Authentication error:", error);

    let message = "An unexpected error occurred during authentication.";

    if (error instanceof Error) {
      if (error.message.includes("User data not available")) {
        message = "Failed to retrieve user information. Please try again.";
      } else if (error.message.includes("OAuth flow failed")) {
        message = "Authentication flow failed. Please try again.";
      } else if (error.message.includes("Invalid JSON response")) {
        message = "Server response error. Please try again.";
      } else if (error.message.includes("Login failed")) {
        message = "Login failed. Please check your credentials and try again.";
      } else {
        message = error.message;
      }
    }

    Alert.alert("Authentication Error", message);
  },
};
