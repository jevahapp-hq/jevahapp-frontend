// Community API Client — shared base URL, auth, and helpers
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE_URL } from "../api";
import type { ApiResponse, Group } from "./types";

export class CommunityAPIClient {
  /** Shared by domain API modules (prayer/forum/groups/polls). */
  baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL || "https://api.jevahapp.com";
  }

  isValidObjectId(id?: string): boolean {
    return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
  }

  normalizeGroup(group: Partial<Group> & Record<string, any>): Group {
    const id = group._id || group.id || group.groupId;
    const resolvedProfileImage =
      group.profileImageUrl ||
      group.profileImage ||
      group.imageUrl ||
      group.image ||
      group.coverImageUrl ||
      group.displayImageUrl ||
      group.avatarUrl ||
      group.thumbnailUrl ||
      group.logoUrl ||
      group.photoUrl;

    return {
      _id: String(id || ""),
      name: group.name || "Untitled Group",
      description: group.description || "",
      profileImageUrl: resolvedProfileImage || undefined,
      createdBy: group.createdBy || group.ownerId || "",
      isPublic:
        typeof group.isPublic === "boolean"
          ? group.isPublic
          : (group.visibility || "public") === "public",
      visibility: group.visibility || (group.isPublic ? "public" : "private"),
      membersCount: group.membersCount ?? group.totalMembers ?? 0,
      createdAt: group.createdAt || new Date().toISOString(),
      updatedAt: group.updatedAt || group.createdAt || new Date().toISOString(),
      members: group.members || [],
      creator: group.creator || group.owner,
      isMember: group.isMember ?? true,
      userRole: group.userRole || group.role,
      role: group.role,
      joinedAt: group.joinedAt,
    };
  }

  // Get authorization header with user token
  async getAuthHeaders(): Promise<HeadersInit> {
    try {
      let token = await AsyncStorage.getItem("userToken");
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }
      if (!token) {
        token = await AsyncStorage.getItem("authToken");
      }
      if (!token) {
        try {
          const { default: SecureStore } = await import("expo-secure-store");
          token = await SecureStore.getItemAsync("jwt");
        } catch (secureStoreError) {
          console.log("SecureStore not available or no JWT token");
        }
      }

      if (token) {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "expo-platform": Platform.OS,
        };
      }

      console.warn("⚠️ No token found in AsyncStorage or SecureStore");
      return {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
    } catch (error) {
      console.error("Error getting auth headers:", error);
      return {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      };
    }
  }

  // Helper method to handle API responses
  async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    let data: any;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error) {
      console.error("Error parsing response:", error);
      return {
        success: false,
        error: "Failed to parse response",
        code: "PARSE_ERROR",
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
        code: data?.code || "HTTP_ERROR",
        details: data?.details,
      };
    }

    return {
      success: true,
      data: data?.data || data,
      message: data?.message,
    };
  }
}
