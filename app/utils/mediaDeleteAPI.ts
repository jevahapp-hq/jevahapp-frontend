// Media Deletion API Service
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { apiClient } from "./api";

export interface DeleteMediaResponse {
  success: boolean;
  message: string;
}

export interface DeleteMediaError {
  success: false;
  message: string;
}

/**
 * Delete a media item
 * @param mediaId - The ID of the media item to delete
 * @returns Promise with deletion result
 * @throws Error if deletion fails or user is not authorized
 */
export const deleteMedia = async (
  mediaId: string
): Promise<DeleteMediaResponse> => {
  try {
    // 1. Get authentication token
    let token = await AsyncStorage.getItem("userToken");
    if (!token) {
      token = await AsyncStorage.getItem("token");
    }
    if (!token) {
      try {
        const { default: SecureStore } = await import("expo-secure-store");
        token = await SecureStore.getItemAsync("jwt");
      } catch (secureStoreError) {
        console.log("SecureStore not available or no JWT token");
      }
    }

    if (!token) {
      throw new Error("Authentication required. Please log in.");
    }

    // 2. Validate mediaId
    if (!mediaId || typeof mediaId !== "string") {
      throw new Error("Invalid media ID");
    }

    // 3. Make DELETE request
    const { getApiBaseUrl } = await import("./api");
    const baseURL = getApiBaseUrl();
    const response = await fetch(`${baseURL}/api/media/${mediaId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      },
      timeout: 30000, // 30 seconds
    } as any);

    // 4. Parse response
    const data = await response.json();

    // 5. Check response status
    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || "Media deleted successfully",
      };
    } else {
      // Handle different error status codes
      const status = response.status;
      switch (status) {
        case 401:
          throw new Error("Authentication failed. Please log in again.");
        case 403:
          throw new Error(
            "You do not have permission to delete this media. Only the creator can delete it."
          );
        case 404:
          throw new Error("Media not found. It may have already been deleted.");
        case 400:
          throw new Error(
            data.message || "Invalid request. Please check the media ID."
          );
        default:
          throw new Error(
            data.message || "Failed to delete media. Please try again."
          );
      }
    }
  } catch (error: any) {
    // Handle network errors
    if (error.message && error.message.includes("Network")) {
      throw new Error(
        "Network error. Please check your internet connection and try again."
      );
    }
    // Re-throw other errors
    throw error;
  }
};

/**
 * Check if current user is the owner of the media
 * @param uploadedBy - The user ID or user object who uploaded the media
 * @returns Promise<boolean> - True if current user is the owner
 */
export const isMediaOwner = async (uploadedBy: string | { _id: string } | undefined): Promise<boolean> => {
  try {
    // Get current user ID
    const userStr = await AsyncStorage.getItem("user");
    if (!userStr) {
      return false;
    }

    const user = JSON.parse(userStr);
    const currentUserId = user._id || user.id || user.email;

    if (!currentUserId || !uploadedBy) {
      return false;
    }

    // Handle different uploadedBy formats
    if (typeof uploadedBy === "string") {
      return uploadedBy === currentUserId;
    } else if (uploadedBy && typeof uploadedBy === "object" && uploadedBy._id) {
      return uploadedBy._id === currentUserId;
    }

    return false;
  } catch (error) {
    console.error("Error checking media ownership:", error);
    return false;
  }
};

