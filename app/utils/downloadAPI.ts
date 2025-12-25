// Download API Service
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiBaseUrl } from "./api";

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
  downloadStatus: "pending" | "downloading" | "completed" | "failed" | "cancelled";
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
      totalPages?: number;
      hasNext?: boolean;
      hasPrev?: boolean;
      hasMore?: boolean; // Legacy support
    };
  };
  error?: string;
}

class DownloadAPI {
  private get baseURL(): string {
    return getApiBaseUrl();
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
      
      console.log(`📥 [DownloadAPI] Initiating download:`, {
        url,
        mediaId,
        fileSize,
        hasAuth: !!headers.Authorization,
      });

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

      console.log(`📥 [DownloadAPI] Response status:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        let errorMessage = errorText;
        
        try {
          errorData = JSON.parse(errorText);
          
          // Handle nested error objects (backend might return { error: "{\"message\":\"...\"}" })
          if (errorData.error && typeof errorData.error === 'string') {
            try {
              const nestedError = JSON.parse(errorData.error);
              if (nestedError.message) {
                errorMessage = nestedError.message;
              } else if (nestedError.error) {
                errorMessage = nestedError.error;
              } else {
                errorMessage = errorData.error;
              }
            } catch {
              // If nested parse fails, use the string as-is
              errorMessage = errorData.error;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          errorData = { error: errorText, code: `HTTP_${response.status}` };
          errorMessage = errorText;
        }
        
        console.error(`📥 [DownloadAPI] Error response:`, {
          status: response.status,
          error: errorData,
          parsedMessage: errorMessage,
        });
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      const data = await response.json();
      console.log(`📥 [DownloadAPI] Success response:`, data);
      
      // Handle both direct response and nested data structure
      const responseData = data.data || data;
      
      return {
        success: true,
        downloadUrl: responseData.downloadUrl,
        fileName: responseData.fileName,
        fileSize: responseData.fileSize,
        contentType: responseData.contentType,
      };
    } catch (error) {
      console.error("📥 [DownloadAPI] Exception initiating download:", error);
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
      downloadStatus?: "pending" | "downloading" | "completed" | "failed" | "cancelled";
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
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${errorText}`,
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
    status?: "pending" | "downloading" | "completed" | "failed" | "cancelled";
    contentType?: "video" | "audio" | "ebook";
  }): Promise<OfflineDownloadsResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.status) queryParams.append("status", params.status);
      if (params?.contentType) queryParams.append("contentType", params.contentType);

      const url = `${this.baseURL}/api/media/offline-downloads?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      const responseData = data.data || data;
      
      // Handle pagination - support both new format (hasNext/hasPrev) and legacy (hasMore)
      const pagination = responseData.pagination || {};
      const normalizedPagination = {
        page: pagination.page || params?.page || 1,
        limit: pagination.limit || params?.limit || 20,
        total: pagination.total || 0,
        totalPages: pagination.totalPages,
        hasNext: pagination.hasNext !== undefined ? pagination.hasNext : (pagination.hasMore || false),
        hasPrev: pagination.hasPrev !== undefined ? pagination.hasPrev : false,
        hasMore: pagination.hasMore !== undefined ? pagination.hasMore : (pagination.hasNext || false), // Legacy support
      };
      
      return {
        success: true,
        data: {
          downloads: responseData.downloads || [],
          pagination: normalizedPagination,
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
   * Get single download status
   * GET /api/media/offline-downloads/:mediaId
   */
  async getDownloadStatus(mediaId: string): Promise<{
    success: boolean;
    data?: OfflineDownload;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseURL}/api/media/offline-downloads/${mediaId}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (response.status === 404) {
        return {
          success: false,
          error: "DOWNLOAD_NOT_FOUND",
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      const responseData = data.data || data;
      
      return {
        success: true,
        data: responseData as OfflineDownload,
      };
    } catch (error) {
      console.error("Error getting download status:", error);
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
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${errorText}`,
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

