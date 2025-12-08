import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../utils/api";

export interface ReportMediaRequest {
  reason: string;
  description?: string;
}

export interface ReportMediaResponse {
  success: boolean;
  message: string;
  report?: {
    _id: string;
    mediaId: string;
    reason: string;
    status: string;
    createdAt: string;
  };
}

/**
 * Report media content
 * @param mediaId - The ID of the media to report
 * @param reason - The reason for reporting (required)
 * @param description - Optional description (max 1000 characters)
 * @returns Promise with report response
 */
export const reportMedia = async (
  mediaId: string,
  reason: string,
  description?: string
): Promise<ReportMediaResponse> => {
  try {
    // Get auth token
    let token = await AsyncStorage.getItem("userToken");
    if (!token) {
      token = await AsyncStorage.getItem("token");
    }
    if (!token) {
      try {
        const { default: SecureStore } = await import("expo-secure-store");
        token = await SecureStore.getItemAsync("jwt");
      } catch (secureStoreError) {
        // Silent fallback
      }
    }

    if (!token) {
      throw new Error("Authentication required. Please log in to report content.");
    }

    const url = `${API_BASE_URL}/api/media/${mediaId}/report`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        reason,
        description: description?.trim() || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error responses
      if (response.status === 400) {
        throw new Error(
          data.message || "Invalid request. Please check your input."
        );
      } else if (response.status === 401) {
        throw new Error("Please log in to report content.");
      } else if (response.status === 404) {
        throw new Error("Media not found.");
      } else {
        throw new Error(data.message || "Failed to report media.");
      }
    }

    if (!data.success) {
      throw new Error(data.message || "Failed to report media.");
    }

    return data;
  } catch (error: any) {
    // Re-throw with proper error message
    if (error.message) {
      throw error;
    }
    throw new Error("Network error. Please check your connection and try again.");
  }
};







