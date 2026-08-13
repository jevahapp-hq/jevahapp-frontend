import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE_URL } from "../api";
import { mapContentTypeForBackend } from "../engagementHelpers";
import { devLog, devWarn } from "./logging";

export type ContentInteractionClient = {
  baseURL: string;
  isValidObjectId: (id?: string) => boolean;
  getAuthHeaders: () => Promise<HeadersInit>;
  getCurrentUserId: () => Promise<string>;
  mapContentTypeToBackend: (contentType: string) => string;
};

export function createClient(): ContentInteractionClient {
  const baseURL = API_BASE_URL || "https://api.jevahapp.com"; // Fallback for development

  const isValidObjectId = (id?: string): boolean => {
    return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
  };

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    try {
      const TokenUtils = (await import("../tokenUtils")).default;
      const token = await TokenUtils.getAuthToken();

      if (token) {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "expo-platform": Platform.OS,
        };
      }

      devWarn("⚠️ No session token found");
      return {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
    } catch (error) {
      if (__DEV__) console.error("Error getting auth headers:", error);
      return {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
    }
  };

  const getCurrentUserId = async (): Promise<string> => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user._id || user.id || user.email || "anonymous";
      }
      return "anonymous";
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return "anonymous";
    }
  };

  const mapContentTypeToBackend = (contentType: string): string => {
    return mapContentTypeForBackend(contentType);
  };

  return {
    baseURL,
    isValidObjectId,
    getAuthHeaders,
    getCurrentUserId,
    mapContentTypeToBackend,
  };
}
