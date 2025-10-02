import { API_CONFIG } from "../../shared/constants";
import { ContentFilter, MediaApiResponse, MediaItem } from "../../shared/types";
import { apiClient } from "./ApiClient";

class MediaApi {
  // Get all content (public)
  async getAllContentPublic(): Promise<MediaApiResponse> {
    const response = await apiClient.get<any>(API_CONFIG.ENDPOINTS.ALL_CONTENT);

    if (response.success) {
      const data = (response as any).data || {};
      const mediaArr = Array.isArray(data?.media)
        ? data.media
        : Array.isArray(data?.data?.media)
        ? data.data.media
        : Array.isArray(data)
        ? data
        : [];
      return {
        success: true,
        media: mediaArr,
        total: data?.total || data?.data?.total || 0,
        page: data?.page || data?.data?.page || 1,
        limit: data?.limit || data?.data?.limit || 10,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch content",
    };
  }

  // Get all content (authenticated)
  async getAllContentWithAuth(): Promise<MediaApiResponse> {
    const response = await apiClient.get<any>(
      API_CONFIG.ENDPOINTS.ALL_CONTENT_AUTH
    );

    if (response.success) {
      const data = (response as any).data || {};
      const mediaArr = Array.isArray(data?.media)
        ? data.media
        : Array.isArray(data?.data?.media)
        ? data.data.media
        : Array.isArray(data)
        ? data
        : [];
      return {
        success: true,
        media: mediaArr,
        total: data?.total || data?.data?.total || 0,
        page: data?.page || data?.data?.page || 1,
        limit: data?.limit || data?.data?.limit || 10,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch content",
    };
  }

  // Get default content with pagination
  async getDefaultContent(
    filter: ContentFilter = {}
  ): Promise<MediaApiResponse> {
    const params = {
      page: filter.page || 1,
      limit: filter.limit || 10,
      contentType:
        filter.contentType !== "ALL" ? filter.contentType : undefined,
      search: filter.search,
    };

    const response = await apiClient.get<any>(
      API_CONFIG.ENDPOINTS.DEFAULT_CONTENT,
      params
    );

    if (response.success) {
      const data = (response as any).data || {};
      const mediaArr = Array.isArray(data?.media)
        ? data.media
        : Array.isArray(data?.data?.media)
        ? data.data.media
        : Array.isArray(data)
        ? data
        : [];
      return {
        success: true,
        media: mediaArr,
        total: data?.total || data?.data?.total || 0,
        page: data?.page || data?.data?.page || 1,
        limit: data?.limit || data?.data?.limit || 10,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch content",
    };
  }

  // Get content by ID
  async getContentById(
    contentId: string
  ): Promise<{ success: boolean; data?: MediaItem; error?: string }> {
    const response = await apiClient.get<any>(
      `${API_CONFIG.ENDPOINTS.DEFAULT_CONTENT}/${contentId}`
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch content",
    };
  }

  // Get content stats
  async getContentStats(
    contentId: string,
    contentType?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const params = contentType ? { contentType } : {};
    const response = await apiClient.get<any>(
      `${API_CONFIG.ENDPOINTS.CONTENT_STATS}/${contentId}`,
      params
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch content stats",
    };
  }

  // Like/Unlike content (Universal endpoint - Recommended)
  async toggleLike(
    contentId: string,
    contentType: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `/api/content/${contentType}/${contentId}/like`
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to toggle like",
    };
  }

  // Media-specific like (Fallback)
  async toggleMediaLike(
    mediaId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.INTERACTIONS}/${mediaId}/like`,
      {
        contentType: "media",
      }
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to toggle like",
    };
  }

  // Save/Unsave content (Universal bookmark endpoint - Recommended)
  async toggleSave(
    contentId: string,
    contentType: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `/api/bookmark/${contentId}/toggle`
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to toggle save",
    };
  }

  // Media-specific bookmark (Fallback)
  async toggleMediaBookmark(
    mediaId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.INTERACTIONS}/${mediaId}/save`,
      {
        contentType: "media",
      }
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to toggle bookmark",
    };
  }

  // Record share
  async recordShare(
    contentId: string,
    contentType: string,
    shareMethod?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.INTERACTIONS}/${contentId}/share`,
      {
        contentType,
        shareMethod,
      }
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to record share",
    };
  }

  // Record view
  async recordView(
    contentId: string,
    contentType: string,
    duration?: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.INTERACTIONS}/${contentId}/view`,
      {
        contentType,
        duration,
      }
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to record view",
    };
  }

  // Get comments
  async getComments(
    contentId: string,
    contentType?: string,
    page?: number
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const params = {
      contentType,
      page: page || 1,
    };

    const response = await apiClient.get<any>(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/${contentId}`,
      params
    );

    if (response.success) {
      return {
        success: true,
        data: response.data?.comments || response.data || [],
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch comments",
    };
  }

  // Add comment
  async addComment(
    contentId: string,
    comment: string,
    contentType?: string,
    parentCommentId?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/${contentId}`,
      {
        comment,
        contentType,
        parentCommentId,
      }
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to add comment",
    };
  }

  // Like/Unlike comment
  async toggleCommentLike(
    commentId: string,
    contentId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/${commentId}/like`,
      {
        contentId,
      }
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to toggle comment like",
    };
  }

  // Upload media
  async uploadMedia(
    file: any,
    metadata: {
      title: string;
      description?: string;
      contentType: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; data?: MediaItem; error?: string }> {
    const response = await apiClient.upload<any>(
      API_CONFIG.ENDPOINTS.UPLOAD,
      file,
      metadata
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to upload media",
    };
  }

  // Get user's saved content (Universal bookmark endpoint)
  async getUserSavedContent(
    contentType?: string,
    page?: number
  ): Promise<{ success: boolean; data?: MediaItem[]; error?: string }> {
    const params = {
      contentType,
      page: page || 1,
    };

    const response = await apiClient.get<any>("/api/bookmark/user", params);

    if (response.success) {
      return {
        success: true,
        data:
          response.data?.bookmarks?.map((bookmark: any) => bookmark.media) ||
          response.data?.bookmarkedMedia ||
          [],
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch saved content",
    };
  }

  // Get action status (like status)
  async getActionStatus(
    mediaId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.get<any>(
      `/api/media/${mediaId}/action-status`
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch action status",
    };
  }

  // Get bookmark status
  async getBookmarkStatus(
    mediaId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.get<any>(
      `/api/bookmark/${mediaId}/status`
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch bookmark status",
    };
  }

  // Test available endpoints
  async testAvailableEndpoints(): Promise<{
    available: string[];
    unavailable: string[];
  }> {
    const endpoints = [
      { name: "All Content Public", path: API_CONFIG.ENDPOINTS.ALL_CONTENT },
      { name: "All Content Auth", path: API_CONFIG.ENDPOINTS.ALL_CONTENT_AUTH },
      { name: "Default Content", path: API_CONFIG.ENDPOINTS.DEFAULT_CONTENT },
    ];

    const available: string[] = [];
    const unavailable: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const isAvailable = await apiClient.testEndpoint(endpoint.path);
        if (isAvailable) {
          available.push(endpoint.name);
        } else {
          unavailable.push(endpoint.name);
        }
      } catch (error) {
        unavailable.push(endpoint.name);
      }
    }

    console.log("🔍 Endpoint availability test:", { available, unavailable });
    return { available, unavailable };
  }

  // Batch operations
  async batchGetContentStats(
    contentIds: string[],
    contentType?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>("/api/media/batch-stats", {
      contentIds,
      contentType,
    });

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch batch stats",
    };
  }
}

// Export singleton instance
export const mediaApi = new MediaApi();
export default mediaApi;
