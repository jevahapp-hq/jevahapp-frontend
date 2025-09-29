import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import TokenUtils from "../utils/tokenUtils";

// Jevah Backend API Base URL
const JEVAH_API_BASE_URL = "https://jevahapp-backend.onrender.com/api/auth";

class AuthService {
  private baseURL: string = JEVAH_API_BASE_URL;

  async login(email: string, password: string) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (response.ok && (data?.data?.token || data?.token)) {
        const token = data?.data?.token || data?.token;
        // Store token consistently in all places used across the app
        await TokenUtils.storeAuthToken(token);
        await AsyncStorage.setItem("userToken", token);
        const user = data?.data?.user || data?.user;
        if (user) await AsyncStorage.setItem("user", JSON.stringify(user));
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

  async register(userData: any) {
    try {
      const response = await fetch(`${this.baseURL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      return { success: response.ok, data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      } as any;
    }
  }

  async resendVerification(email: string) {
    try {
      const response = await fetch(`${this.baseURL}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      return { success: response.ok, data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      } as any;
    }
  }

  async verifyEmail(token: string) {
    try {
      const url = `https://jevahapp-backend.onrender.com/api/auth/verify-email?token=${encodeURIComponent(
        token
      )}`;
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();
      return { success: response.ok, data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: "Network error occurred",
        status: 0,
      } as any;
    }
  }

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

  async logout() {
    try {
      await TokenUtils.clearAuthTokens();
      await AsyncStorage.removeItem("user");
      try {
        const { useInteractionStore } = await import(
          "../store/useInteractionStore"
        );
        useInteractionStore.getState().clearCache();
      } catch {}
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async getToken() {
    try {
      const token = await AsyncStorage.getItem("token");
      return token;
    } catch {
      return null;
    }
  }
}

export default new AuthService();
