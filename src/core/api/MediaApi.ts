import { API_CONFIG } from "../../shared/constants";
import { ContentFilter, MediaApiResponse, MediaItem } from "../../shared/types";
import { apiClient } from "./ApiClient";

/** Normalize varied backend list shapes into a single { media, total, ... } */
function parseMediaListPayload(response: any): {
  media: any[];
  total: number;
  page: number;
  limit: number;
  pagination: any;
} {
  const root = response?.data;
  // apiClient wraps JSON as { success, data: <body> }. Body may itself be
  // { data: { media } }, { media }, { data: [...] }, or a bare array.
  const body =
    root && typeof root === "object" && !Array.isArray(root) && "data" in root
      ? (root as any).data ?? root
      : root;

  let mediaArr: any[] = [];
  let pagination: any = null;

  if (Array.isArray(body)) {
    mediaArr = body;
  } else if (body?.media && Array.isArray(body.media)) {
    mediaArr = body.media;
    pagination = body.pagination;
  } else if (body?.data?.media && Array.isArray(body.data.media)) {
    mediaArr = body.data.media;
    pagination = body.data?.pagination || body.pagination;
  } else if (Array.isArray(body?.data)) {
    mediaArr = body.data;
    pagination = body.pagination;
  } else if (Array.isArray(root)) {
    mediaArr = root;
  } else if (root?.media && Array.isArray(root.media)) {
    mediaArr = root.media;
    pagination = root.pagination;
  }

  // Merge recommendations.sections when main media is sparse
  const recommendations =
    body?.recommendations?.sections ||
    root?.recommendations?.sections ||
    body?.data?.recommendations?.sections ||
    [];
  if (Array.isArray(recommendations) && recommendations.length > 0) {
    const seenIds = new Set(mediaArr.map((m) => m?._id || m?.id));
    const supplemental: any[] = [];
    for (const section of recommendations) {
      const sectionItems = section?.media || section?.items || [];
      if (!Array.isArray(sectionItems)) continue;
      for (const item of sectionItems) {
        const id = item?._id || item?.id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          supplemental.push(item);
        }
      }
    }
    if (supplemental.length > 0) {
      mediaArr = [...mediaArr, ...supplemental];
    }
  }

  const total =
    pagination?.total ??
    body?.total ??
    body?.data?.total ??
    root?.total ??
    mediaArr.length;
  const page =
    pagination?.page ?? body?.page ?? body?.data?.page ?? root?.page ?? 1;
  const limit =
    pagination?.limit ??
    body?.limit ??
    body?.data?.limit ??
    root?.limit ??
    50;

  return { media: mediaArr, total, page, limit, pagination };
}

class MediaApi {
  // Get all content (public) - with pagination support
  async getAllContentPublic(options?: {
    page?: number;
    limit?: number;
    contentType?: string;
    sort?: string;
    order?: "asc" | "desc";
  }): Promise<MediaApiResponse> {
    const params: Record<string, any> = {};

    // Add pagination parameters if provided
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = Math.min(100, Math.max(1, options.limit)); // Max 100
    if (options?.contentType && options.contentType !== "ALL") params.contentType = options.contentType;
    if (options?.sort) params.sort = options.sort;
    if (options?.order) params.order = options.order;

    const response = await apiClient.get<any>(API_CONFIG.ENDPOINTS.ALL_CONTENT, Object.keys(params).length > 0 ? params : undefined);

    if (response.success) {
      const parsed = parseMediaListPayload(response);
      return {
        success: true,
        media: parsed.media,
        total: parsed.total,
        page: parsed.page,
        limit: parsed.limit,
        pagination: parsed.pagination,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to fetch content",
    };
  }

  // Get all content (authenticated) - with pagination support
  async getAllContentWithAuth(options?: {
    page?: number;
    limit?: number;
    contentType?: string;
    sort?: string;
    order?: "asc" | "desc";
  }): Promise<MediaApiResponse> {
    const params: Record<string, any> = {};

    // Add pagination parameters if provided
    if (options?.page !== undefined) params.page = options.page;
    if (options?.limit !== undefined) params.limit = Math.min(100, Math.max(1, options.limit)); // Max 100
    if (options?.contentType && options.contentType !== "ALL") params.contentType = options.contentType;
    if (options?.sort) params.sort = options.sort;
    if (options?.order) params.order = options.order;

    const response = await apiClient.get<any>(
      API_CONFIG.ENDPOINTS.ALL_CONTENT_AUTH,
      Object.keys(params).length > 0 ? params : undefined
    );

    if (response.success) {
      const parsed = parseMediaListPayload(response);
      return {
        success: true,
        media: parsed.media,
        total: parsed.total,
        page: parsed.page,
        limit: parsed.limit,
        pagination: parsed.pagination,
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
      const parsed = parseMediaListPayload(response);
      return {
        success: true,
        media: parsed.media,
        total: parsed.total,
        page: parsed.page,
        limit: parsed.limit,
        pagination: parsed.pagination,
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

  private mapContentTypeForBookmark(contentType: string): string {
    const n = (contentType || "").toLowerCase();
    if (n === "artist") return "artist";
    if (n === "merch") return "merch";
    if (["ebook", "e-books", "ebooks", "books"].includes(n)) return "ebook";
    if (["podcast", "podcasts"].includes(n)) return "podcast";
    return "media";
  }

  // Save/Unsave content (Universal bookmark endpoint - Recommended)
  async toggleSave(
    contentId: string,
    contentType: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const backendType = this.mapContentTypeForBookmark(contentType);
    const response = await apiClient.post<any>(
      `/api/bookmark/${contentId}/toggle`,
      { contentType: backendType }
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

  // ==================== PLAYBACK SESSION ENDPOINTS ====================

  /**
   * Start a playback session for a media item.
   * Backend will automatically pause any existing active session for this user.
   */
  async startPlaybackSession(
    mediaId: string,
    payload: {
      duration: number; // total duration in seconds
      position?: number; // optional resume position in seconds
      deviceInfo?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `/api/media/${mediaId}/playback/start`,
      payload
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to start playback session",
    };
  }

  /**
   * Update playback progress for an active session.
   * Should be called every 5–10 seconds while playing.
   */
  async updatePlaybackProgress(payload: {
    sessionId: string;
    position: number; // seconds
    duration: number; // seconds
    progressPercentage: number; // 0–100
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `/api/media/playback/progress`,
      payload
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to update playback progress",
    };
  }

  /** Pause the current playback session. */
  async pausePlayback(
    sessionId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `/api/media/playback/pause`,
      { sessionId }
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to pause playback",
    };
  }

  /** Resume a paused playback session. */
  async resumePlayback(
    sessionId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `/api/media/playback/resume`,
      { sessionId }
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to resume playback",
    };
  }

  /** End a playback session when the user stops or video finishes. */
  async endPlaybackSession(payload: {
    sessionId: string;
    reason: "completed" | "stopped" | "error";
    finalPosition?: number; // seconds
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await apiClient.post<any>(
      `/api/media/playback/end`,
      payload
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to end playback session",
    };
  }

  /**
   * Get a single media item by ID (e.g. for fresh playback URL when cached URL fails).
   * Backend can return a new signed URL or CDN URL from Redis/cache.
   */
  async getMediaById(id: string): Promise<{
    success: boolean;
    data?: { fileUrl?: string; playbackUrl?: string; hlsUrl?: string;[key: string]: any };
    error?: string;
  }> {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return { success: false, error: "Invalid media ID" };
    }
    const response = await apiClient.get<any>(`/api/media/${id.trim()}`);
    if (response.success) {
      const data = (response as any).data ?? response;
      return { success: true, data: typeof data === "object" ? data : {} };
    }
    return {
      success: false,
      error: (response as any).error || "Failed to fetch media",
    };
  }

  /** Get the currently active playback session, if any. */
  async getActivePlaybackSession(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    const response = await apiClient.get<any>(`/api/media/playback/active`);

    if (response.success) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error || "Failed to get active playback session",
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
