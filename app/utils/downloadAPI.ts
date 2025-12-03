// Download API Service
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export interface DownloadInitiateResponse {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  error?: string;
}

export interface OfflineDownload {
  mediaId: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  localPath?: string;
  isDownloaded: boolean;
  downloadStatus: "pending" | "downloading" | "completed" | "failed";
  downloadProgress: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineDownloadsResponse {
  success: boolean;
  data?: {
    downloads: OfflineDownload[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
  error?: string;
}

class DownloadAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
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

      if (token) {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "expo-platform": Platform.OS,
        };
      }

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

  /**
   * Initiate download - Get download URL from backend
   * POST /api/media/:id/download
   */
  async initiateDownload(
    mediaId: string,
    fileSize?: number
  ): Promise<DownloadInitiateResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseURL}/api/media/${mediaId}/download`;

      // Only include fileSize in request body if it's a valid positive number
      const requestBody: { fileSize?: number } = {};
      if (fileSize !== undefined && fileSize !== null && fileSize > 0) {
        requestBody.fileSize = fileSize;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        downloadUrl: data.downloadUrl || data.data?.downloadUrl,
        fileName: data.fileName || data.data?.fileName,
        fileSize: data.fileSize || data.data?.fileSize,
        contentType: data.contentType || data.data?.contentType,
      };
    } catch (error) {
      console.error("Error initiating download:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update download status on backend
   * PATCH /api/media/offline-downloads/:mediaId
   */
  async updateDownloadStatus(
    mediaId: string,
    updates: {
      localPath?: string;
      isDownloaded?: boolean;
      downloadStatus?: "pending" | "downloading" | "completed" | "failed";
      downloadProgress?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseURL}/api/media/offline-downloads/${mediaId}`;

      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating download status:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user's offline downloads
   * GET /api/media/offline-downloads
   */
  async getOfflineDownloads(params?: {
    page?: number;
    limit?: number;
  }): Promise<OfflineDownloadsResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      const url = `${this.baseURL}/api/media/offline-downloads?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          downloads: data.downloads || data.data?.downloads || [],
          pagination: data.pagination || data.data?.pagination,
        },
      };
    } catch (error) {
      console.error("Error getting offline downloads:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Remove download from backend
   * DELETE /api/media/offline-downloads/:mediaId
   */
  async removeDownload(
    mediaId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseURL}/api/media/offline-downloads/${mediaId}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error removing download:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const downloadAPI = new DownloadAPI();
export default downloadAPI;

