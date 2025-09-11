import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export interface AllMediaItem {
  _id: string;
  title: string;
  description?: string;
  contentType: "videos" | "music" | "books" | "live";
  category?: string;
  topics?: string[];
  fileUrl: string;
  thumbnailUrl?: string;
  uploadedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  duration?: number;
  viewCount?: number;
  listenCount?: number;
  readCount?: number;
  downloadCount?: number;
  favoriteCount?: number;
  shareCount?: number;
  commentCount?: number;
}

export interface AllMediaResponse {
  success: boolean;
  media: AllMediaItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class AllMediaAPI {
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
        };
      }

      return {
        "Content-Type": "application/json",
      };
    } catch (error) {
      console.error("Error getting auth headers:", error);
      return {
        "Content-Type": "application/json",
      };
    }
  }

  async getAllMedia(
    params: {
      sort?:
        | "views"
        | "comments"
        | "likes"
        | "reads"
        | "createdAt"
        | "updatedAt";
      contentType?: "videos" | "music" | "books" | "live";
      category?: string;
      page?: number;
      limit?: number;
      search?: string;
    } = {}
  ): Promise<AllMediaResponse> {
    try {
      const headers = await this.getAuthHeaders();

      const queryParams = new URLSearchParams();
      if (params.sort) queryParams.append("sort", params.sort);
      if (params.contentType)
        queryParams.append("contentType", params.contentType);
      if (params.category) queryParams.append("category", params.category);
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());
      if (params.search) queryParams.append("search", params.search);

      const url = `${this.baseURL}/api/media?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching all media:", error);
      throw error;
    }
  }

  async getTrendingMedia(limit: number = 20): Promise<AllMediaResponse> {
    return this.getAllMedia({
      sort: "views",
      limit,
    });
  }

  async getMostCommentedMedia(limit: number = 20): Promise<AllMediaResponse> {
    return this.getAllMedia({
      sort: "comments",
      limit,
    });
  }

  async getMostLikedMedia(limit: number = 20): Promise<AllMediaResponse> {
    return this.getAllMedia({
      sort: "likes",
      limit,
    });
  }

  async getLatestMedia(limit: number = 20): Promise<AllMediaResponse> {
    return this.getAllMedia({
      sort: "createdAt",
      limit,
    });
  }

  async searchAllMedia(
    searchTerm: string,
    limit: number = 20
  ): Promise<AllMediaResponse> {
    return this.getAllMedia({
      search: searchTerm,
      limit,
    });
  }

  // Add new method for default content
  async getDefaultContent(
    params: {
      page?: number;
      limit?: number;
      contentType?: string;
    } = {}
  ): Promise<{
    success: boolean;
    data: {
      content: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();

      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());
      if (params.contentType)
        queryParams.append("contentType", params.contentType);

      const queryString = queryParams.toString();
      const endpoint = `/api/media/default${
        queryString ? `?${queryString}` : ""
      }`;

      const fullUrl = `${this.baseURL}${endpoint}`;
      console.log("🌐 Fetching default content from:", fullUrl);
      console.log("📋 Request params:", params);
      console.log("🔐 Headers:", headers);

      const response = await fetch(fullUrl, {
        method: "GET",
        headers,
      });

      console.log("📡 Response status:", response.status);
      console.log(
        "📡 Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error Response:", errorText);

        // If the default endpoint doesn't exist (404 or 400), try the regular media endpoint
        if (response.status === 404 || response.status === 400) {
          console.log(
            "🔄 Default endpoint not found or invalid, trying regular media endpoint..."
          );
          return this.fallbackToRegularMedia(params);
        }

        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("✅ API Response data:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch default content");
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error("❌ Error fetching default content:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: {
          content: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        },
      };
    }
  }

  // Fallback method to use regular media endpoint if default doesn't exist
  private async fallbackToRegularMedia(params: {
    page?: number;
    limit?: number;
    contentType?: string;
  }): Promise<{
    success: boolean;
    data: {
      content: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
    error?: string;
  }> {
    try {
      console.log("🔄 Using fallback: trying latest media endpoint");

      // Try getLatestMedia first (most likely to have content)
      const response = await this.getLatestMedia(params.limit || 10);

      // Transform the response to match expected format
      const transformedContent = (response.media || []).map((item: any) => ({
        _id: item._id,
        title: item.title || "Untitled",
        description: item.description || "",
        mediaUrl: item.fileUrl || item.mediaUrl,
        thumbnailUrl: item.thumbnailUrl || item.imageUrl?.uri,
        contentType: this.mapContentType(item.contentType),
        duration: item.duration || null,
        author: {
          _id: item.uploadedBy?._id || item.uploadedBy,
          firstName: item.uploadedBy?.firstName || "Unknown",
          lastName: item.uploadedBy?.lastName || "User",
          avatar: item.uploadedBy?.avatar || null,
        },
        likeCount: item.favoriteCount || item.likeCount || 0,
        commentCount: item.commentCount || 0,
        shareCount: item.shareCount || 0,
        viewCount: item.viewCount || 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      return {
        success: true,
        data: {
          content: transformedContent,
          pagination: response.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
          },
        },
      };
    } catch (error) {
      console.error("❌ Fallback also failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Both endpoints failed",
        data: {
          content: [],
          pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        },
      };
    }
  }

  // Helper method to map content types
  private mapContentType(contentType: string): "video" | "audio" | "image" {
    switch (contentType?.toLowerCase()) {
      case "videos":
      case "video":
        return "video";
      case "music":
      case "audio":
        return "audio";
      case "image":
      case "images":
        return "image";
      default:
        return "video"; // Default fallback
    }
  }

  // Test method to check available endpoints
  async testAvailableEndpoints(): Promise<void> {
    console.log("🧪 Testing available endpoints...");
    console.log("🌐 Base URL:", this.baseURL);

    try {
      // Test 1: Default content endpoint
      console.log("🔍 Testing /api/media/default...");
      const response1 = await fetch(
        `${this.baseURL}/api/media/default?page=1&limit=1`
      );
      console.log("📡 Default content status:", response1.status);

      if (response1.ok) {
        const data1 = await response1.json();
        console.log("✅ Default content response:", data1);
      } else {
        const error1 = await response1.text();
        console.log("❌ Default content error:", error1);
      }

      // Test 2: Regular media endpoint
      console.log("🔍 Testing /api/media...");
      const response2 = await fetch(`${this.baseURL}/api/media?page=1&limit=1`);
      console.log("📡 Regular media status:", response2.status);

      // Test 3: Try getAllMedia method
      console.log("🔍 Testing getAllMedia method...");
      const response3 = await this.getAllMedia({ page: 1, limit: 1 });
      console.log("📡 getAllMedia success:", response3.success);
      console.log("📡 getAllMedia media count:", response3.media?.length || 0);
    } catch (error) {
      console.error("❌ Endpoint test failed:", error);
    }
  }

  // ===== INTERACTION METHODS =====

  // Like/Unlike Content
  async toggleLike(
    contentType: string,
    contentId: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(
        `${this.baseURL}/api/content/${contentType}/${contentId}/like`,
        {
          method: "POST",
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error toggling like:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Add Comment
  async addComment(
    contentType: string,
    contentId: string,
    comment: string,
    parentCommentId?: string
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(
        `${this.baseURL}/api/content/${contentType}/${contentId}/comment`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            comment,
            parentCommentId,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error adding comment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get Comments
  async getComments(
    contentType: string,
    contentId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(
        `${this.baseURL}/api/content/${contentType}/${contentId}/comments?page=${page}&limit=${limit}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching comments:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Delete Comment
  async deleteComment(commentId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(
        `${this.baseURL}/api/content/comments/${commentId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error deleting comment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Share Content
  async shareContent(
    contentType: string,
    contentId: string,
    platform: string = "general",
    message: string = "Check this out!"
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(
        `${this.baseURL}/api/content/${contentType}/${contentId}/share`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            platform,
            message,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error sharing content:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Save to Library (Bookmark)
  async bookmarkContent(mediaId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log("🔍 DEBUG: bookmarkContent API called");
      console.log("🔍 DEBUG: Media ID:", mediaId);
      console.log("🔍 DEBUG: Base URL:", this.baseURL);

      const headers = await this.getAuthHeaders();
      console.log("🔍 DEBUG: Auth headers:", headers);

      const url = `${this.baseURL}/api/bookmarks/${mediaId}`;
      console.log("🔍 DEBUG: Full URL:", url);

      const response = await fetch(url, {
        method: "POST",
        headers,
      });

      console.log("🔍 DEBUG: Response status:", response.status);
      console.log("🔍 DEBUG: Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error bookmarking content:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Remove from Library (Unbookmark)
  async unbookmarkContent(mediaId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log("🔍 DEBUG: unbookmarkContent API called");
      console.log("🔍 DEBUG: Media ID:", mediaId);
      console.log("🔍 DEBUG: Base URL:", this.baseURL);

      const headers = await this.getAuthHeaders();
      console.log("🔍 DEBUG: Auth headers:", headers);

      // Use the correct endpoint with /api prefix
      const url = `${this.baseURL}/api/bookmarks/${mediaId}`;
      console.log("🔍 DEBUG: Full URL:", url);

      const response = await fetch(url, {
        method: "DELETE",
        headers,
      });

      console.log("🔍 DEBUG: Response status:", response.status);
      console.log("🔍 DEBUG: Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error unbookmarking content:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get User's Saved Content
  async getSavedContent(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();

      // Use the correct endpoint with /api prefix
      const response = await fetch(
        `${this.baseURL}/api/bookmarks/get-bookmarked-media?page=${page}&limit=${limit}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error getting saved content:", error);

      // Try alternative endpoint
      try {
        console.log("🔄 Trying alternative endpoint: /api/bookmarks");
        const altHeaders = await this.getAuthHeaders();
        const altResponse = await fetch(`${this.baseURL}/api/bookmarks`, {
          method: "GET",
          headers: altHeaders,
        });

        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log("✅ Alternative endpoint worked:", altData);
          return { success: true, data: altData };
        }
      } catch (altError) {
        console.error("Alternative endpoint also failed:", altError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Check if Content is Bookmarked
  async isContentBookmarked(contentId: string): Promise<{
    success: boolean;
    isBookmarked: boolean;
    error?: string;
  }> {
    try {
      const response = await this.getSavedContent(1, 100); // Get first 100 saved items

      if (!response.success) {
        return { success: false, isBookmarked: false };
      }

      const savedContent = response.data?.data || [];
      const isBookmarked = savedContent.some(
        (bookmark: any) => bookmark.media._id === contentId
      );

      return { success: true, isBookmarked };
    } catch (error) {
      console.error("Error checking bookmark status:", error);
      return { success: false, isBookmarked: false };
    }
  }

  // Toggle Bookmark Status
  async toggleBookmark(
    contentId: string,
    isCurrentlyBookmarked: boolean
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      if (isCurrentlyBookmarked) {
        return await this.unbookmarkContent(contentId);
      } else {
        return await this.bookmarkContent(contentId);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export default new AllMediaAPI();
