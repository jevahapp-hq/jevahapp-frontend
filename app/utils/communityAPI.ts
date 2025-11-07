// Community API Service
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE_URL } from "./api";

// ============= TYPE DEFINITIONS =============

// Prayer Wall Types
export interface PrayerRequest {
  _id: string;
  userId: string;
  prayerText: string;
  verse?: {
    text: string;
    reference: string;
  };
  color: string;
  shape:
    | "rectangle"
    | "circle"
    | "scalloped"
    | "square"
    | "square2"
    | "square3"
    | "square4";
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  userLiked?: boolean;
  author: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  anonymous?: boolean;
  media?: string[];
  relevanceScore?: number; // For search results
}

export interface CreatePrayerRequest {
  prayerText: string;
  verse?: {
    text: string;
    reference: string;
  };
  color: string;
  shape:
    | "rectangle"
    | "circle"
    | "scalloped"
    | "square"
    | "square2"
    | "square3"
    | "square4";
  anonymous?: boolean;
  media?: string[];
}

export interface PrayerComment {
  _id: string;
  userId: string;
  content: string;
  createdAt: string;
  likesCount: number;
  userLiked?: boolean;
  author: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  replies?: PrayerComment[];
  parentCommentId?: string;
}

// Forum Types
export interface Forum {
  _id: string;
  title: string;
  description: string;
  createdBy?:
    | string
    | {
        _id: string;
        firstName: string;
        lastName: string;
        username: string;
      };
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  postsCount: number;
  participantsCount: number;
}

export interface ForumPost {
  _id: string;
  forumId: string;
  userId?: string;
  content: string;
  embeddedLinks?: Array<{
    url: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    type: "video" | "article" | "resource" | "other";
  }>;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  likesCount: number;
  commentsCount: number;
  userLiked?: boolean;
  author?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  user?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  forum?: {
    _id: string;
    title: string;
  };
}

export interface ForumComment {
  _id: string;
  postId: string;
  userId?: string;
  content: string;
  parentCommentId?: string;
  createdAt: string;
  likesCount: number;
  userLiked?: boolean;
  replies?: ForumComment[];
  author?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  user?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

// Groups Types
export interface Group {
  _id: string;
  name: string;
  description: string;
  profileImageUrl?: string;
  createdBy: string;
  isPublic: boolean;
  visibility?: "public" | "private";
  membersCount: number;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    _id: string;
    userId: string;
    role: "admin" | "member";
    joinedAt: string;
    user: {
      _id: string;
      username: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
  }>;
  creator?: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  isMember?: boolean;
  userRole?: "admin" | "member";
  role?: "admin" | "member"; // For my groups response
  joinedAt?: string;
}

// Polls Types
export interface PollOption {
  _id: string;
  text: string;
  votesCount: number;
  percentage: number;
}

export interface Poll {
  _id: string;
  id?: string; // Alias for _id
  question: string; // Primary field
  title?: string; // Fallback for backward compatibility
  description?: string;
  createdBy?: string;
  options: PollOption[];
  totalVotes: number;
  createdAt: string;
  expiresAt?: string;
  closesAt?: string; // Alias for expiresAt
  isActive: boolean;
  userVoted?: boolean;
  userVoteOptionId?: string | string[]; // Support single or multiple selections
  multiSelect?: boolean;
  createdByUser?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  author?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// Common Types
export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  details?: any;
}

// ============= COMMUNITY API SERVICE =============

class CommunityAPIService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL || "http://localhost:3000";
  }

  private isValidObjectId(id?: string): boolean {
    return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
  }

  // Get authorization header with user token
  private async getAuthHeaders(): Promise<HeadersInit> {
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
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
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

  // ============= PRAYER WALL API =============

  // Create Prayer Request
  async createPrayer(
    prayerData: CreatePrayerRequest
  ): Promise<ApiResponse<PrayerRequest>> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseURL}/api/community/prayer-wall/create`;

      console.log("📤 Creating prayer at:", url);
      console.log("📤 Request body:", {
        prayerText: prayerData.prayerText?.substring(0, 50) + "...",
        color: prayerData.color,
        shape: prayerData.shape,
        hasVerse: !!(prayerData.verse?.text || prayerData.verse?.reference),
      });

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(prayerData),
      });

      console.log(
        "📡 Create prayer response status:",
        response.status,
        response.statusText
      );

      const result = await this.handleResponse<PrayerRequest>(response);

      console.log("📥 Create prayer result:", {
        success: result.success,
        hasData: !!result.data,
        prayerId: result.data?._id,
        error: result.error,
      });

      return result;
    } catch (error) {
      console.error("❌ Error creating prayer:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create prayer",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get Prayer Requests (Paginated)
  async getPrayers(params?: {
    page?: number;
    limit?: number;
    sortBy?: "createdAt" | "likesCount" | "commentsCount";
    sortOrder?: "asc" | "desc";
  }): Promise<ApiResponse<{ prayers: PrayerRequest[]; pagination: any }>> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      const url = `${
        this.baseURL
      }/api/community/prayer-wall?${queryParams.toString()}`;
      console.log("🌐 Fetching prayers from:", url);
      console.log("🌐 Using baseURL:", this.baseURL);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      console.log("📡 Response status:", response.status, response.statusText);

      const result = await this.handleResponse<
        | {
            prayers: PrayerRequest[];
            pagination: any;
          }
        | {
            items: PrayerRequest[];
            data: {
              prayers: PrayerRequest[];
              pagination: any;
            };
          }
      >(response);

      console.log("📥 Raw getPrayers result:", {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data as any) : [],
        error: result.error,
      });

      // Handle different response formats
      if (result.success && result.data) {
        const data = result.data as any;
        // Check for different response structures
        let prayers =
          data.prayers ||
          data.items ||
          data.data?.prayers ||
          data.data?.items ||
          [];
        let pagination = data.pagination ||
          data.data?.pagination || {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: prayers.length,
            totalPages: 1,
            hasMore: false,
          };

        // Ensure hasMore is properly set
        if (pagination.hasMore === undefined) {
          pagination.hasMore = prayers.length >= (params?.limit || 20);
        }

        console.log("✅ Parsed prayers:", prayers.length, "prayers");
        console.log("✅ Pagination:", JSON.stringify(pagination, null, 2));
        if (prayers.length > 0) {
          console.log("📋 Sample prayer:", {
            id: prayers[0]._id,
            text: prayers[0].prayerText?.substring(0, 30) + "...",
            author: prayers[0].author?.username || "anonymous",
          });
        }

        return {
          success: true,
          data: { prayers, pagination },
        };
      }

      console.warn("⚠️ Unexpected response format:", result);
      return result as ApiResponse<{
        prayers: PrayerRequest[];
        pagination: any;
      }>;
    } catch (error) {
      console.error("❌ Error getting prayers:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        baseURL: this.baseURL,
        endpoint: "/api/community/prayer-wall",
      });

      // Provide more specific error messages
      let errorMessage = "Failed to fetch prayers";
      if (error instanceof Error) {
        if (
          error.message.includes("Network request failed") ||
          error.message.includes("fetch failed") ||
          error.message.includes("ECONNREFUSED")
        ) {
          errorMessage = `Cannot connect to server. Please check:\n1. Backend server is running\n2. API URL is correct: ${this.baseURL}\n3. Your internet connection`;
        } else if (error.message.includes("timeout")) {
          errorMessage =
            "Request timed out. The server may be slow or unreachable.";
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        code: "NETWORK_ERROR",
      };
    }
  }

  // Search Prayer Requests (AI-Enhanced)
  async searchPrayers(params: {
    query: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ prayers: PrayerRequest[]; pagination: any }>> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      queryParams.append("query", params.query);
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(
        `${
          this.baseURL
        }/api/community/prayer-wall/search?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      return await this.handleResponse<{
        prayers: PrayerRequest[];
        pagination: any;
      }>(response);
    } catch (error) {
      console.error("Error searching prayers:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search prayers",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Like/Unlike Prayer Request
  async likePrayer(
    prayerId: string
  ): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/prayer-wall/${prayerId}/like`,
        {
          method: "POST",
          headers,
        }
      );

      return await this.handleResponse<{ liked: boolean; likesCount: number }>(
        response
      );
    } catch (error) {
      console.error("Error liking prayer:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to like prayer",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get Prayer Comments
  async getPrayerComments(
    prayerId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse<{ comments: PrayerComment[]; pagination: any }>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(
        `${
          this.baseURL
        }/api/community/prayer-wall/${prayerId}/comments?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      return await this.handleResponse<{
        comments: PrayerComment[];
        pagination: any;
      }>(response);
    } catch (error) {
      console.error("Error getting prayer comments:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch comments",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Add Comment to Prayer
  async commentOnPrayer(
    prayerId: string,
    commentData: { content: string; parentCommentId?: string }
  ): Promise<ApiResponse<PrayerComment>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/prayer-wall/${prayerId}/comments`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(commentData),
        }
      );

      return await this.handleResponse<PrayerComment>(response);
    } catch (error) {
      console.error("Error commenting on prayer:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add comment",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Update Prayer Request
  async updatePrayer(
    prayerId: string,
    updates: Partial<CreatePrayerRequest>
  ): Promise<ApiResponse<PrayerRequest>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/prayer-wall/${prayerId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(updates),
        }
      );

      return await this.handleResponse<PrayerRequest>(response);
    } catch (error) {
      console.error("Error updating prayer:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update prayer",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Delete Prayer Request
  async deletePrayer(prayerId: string): Promise<ApiResponse<void>> {
    try {
      if (!this.isValidObjectId(prayerId)) {
        return {
          success: false,
          error: "Invalid prayer ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/prayer-wall/${prayerId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error deleting prayer:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete prayer",
        code: "NETWORK_ERROR",
      };
    }
  }

  // ============= FORUM API =============

  // Create Forum (Authenticated users only)
  async createForum(forumData: {
    title: string;
    description: string;
  }): Promise<ApiResponse<Forum>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/forum/create`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(forumData),
        }
      );

      const result = await this.handleResponse<{ data: Forum } | Forum>(
        response
      );

      // Handle different response formats
      if (result.success && result.data) {
        const forumData = (result.data as any).data || result.data;
        return {
          success: true,
          data: forumData as Forum,
        };
      }

      return result as ApiResponse<Forum>;
    } catch (error) {
      console.error("Error creating forum:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create forum",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get All Forums (Public - no auth required)
  async getForums(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ forums: Forum[]; pagination: any }>> {
    try {
      // Try to get auth headers, but don't fail if not available (public endpoint)
      let headers: HeadersInit;
      try {
        headers = await this.getAuthHeaders();
      } catch {
        headers = {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        };
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(
        `${this.baseURL}/api/community/forum?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await this.handleResponse<
        | { data: { forums: Forum[]; pagination: any } }
        | { forums: Forum[]; pagination: any }
      >(response);

      // Handle different response formats
      if (result.success && result.data) {
        const data = result.data as any;
        const forums = data.forums || data.data?.forums || [];
        const pagination = data.pagination ||
          data.data?.pagination || {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: forums.length,
            totalPages: 1,
            hasMore: false,
          };

        return {
          success: true,
          data: { forums, pagination },
        };
      }

      return result as ApiResponse<{ forums: Forum[]; pagination: any }>;
    } catch (error) {
      console.error("Error getting forums:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch forums",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get Forum Posts (Public - no auth required)
  async getForumPosts(
    forumId: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: "createdAt" | "likesCount" | "commentsCount";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<ApiResponse<{ posts: ForumPost[]; pagination: any }>> {
    try {
      if (!this.isValidObjectId(forumId)) {
        return {
          success: false,
          error: "Invalid forum ID",
          code: "VALIDATION_ERROR",
        };
      }

      // Try to get auth headers, but don't fail if not available (public endpoint)
      let headers: HeadersInit;
      try {
        headers = await this.getAuthHeaders();
      } catch {
        headers = {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        };
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      const response = await fetch(
        `${
          this.baseURL
        }/api/community/forum/${forumId}/posts?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await this.handleResponse<
        | { data: { posts: ForumPost[]; pagination: any } }
        | { posts: ForumPost[]; pagination: any }
      >(response);

      // Handle different response formats
      if (result.success && result.data) {
        const data = result.data as any;
        const posts = data.posts || data.data?.posts || [];
        const pagination = data.pagination ||
          data.data?.pagination || {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: posts.length,
            totalPages: 1,
            hasMore: false,
          };

        return {
          success: true,
          data: { posts, pagination },
        };
      }

      return result as ApiResponse<{ posts: ForumPost[]; pagination: any }>;
    } catch (error) {
      console.error("Error getting forum posts:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch forum posts",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Create Forum Post
  async createForumPost(
    forumId: string,
    postData: {
      content: string;
      embeddedLinks?: Array<{
        url: string;
        title?: string;
        description?: string;
        thumbnail?: string;
        type: "video" | "article" | "resource" | "other";
      }>;
      tags?: string[];
    }
  ): Promise<ApiResponse<ForumPost>> {
    try {
      if (!this.isValidObjectId(forumId)) {
        return {
          success: false,
          error: "Invalid forum ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/forum/${forumId}/posts`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(postData),
        }
      );

      const result = await this.handleResponse<{ data: ForumPost } | ForumPost>(
        response
      );

      // Handle different response formats
      if (result.success && result.data) {
        const postData = (result.data as any).data || result.data;
        return {
          success: true,
          data: postData as ForumPost,
        };
      }

      return result as ApiResponse<ForumPost>;
    } catch (error) {
      console.error("Error creating forum post:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create forum post",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Update Forum Post (Creator only)
  async updateForumPost(
    postId: string,
    postData: {
      content?: string;
      embeddedLinks?: Array<{
        url: string;
        title?: string;
        description?: string;
        thumbnail?: string;
        type: "video" | "article" | "resource" | "other";
      }>;
      tags?: string[];
    }
  ): Promise<ApiResponse<ForumPost>> {
    try {
      if (!this.isValidObjectId(postId)) {
        return {
          success: false,
          error: "Invalid post ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/forum/posts/${postId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(postData),
        }
      );

      const result = await this.handleResponse<{ data: ForumPost } | ForumPost>(
        response
      );

      // Handle different response formats
      if (result.success && result.data) {
        const postData = (result.data as any).data || result.data;
        return {
          success: true,
          data: postData as ForumPost,
        };
      }

      return result as ApiResponse<ForumPost>;
    } catch (error) {
      console.error("Error updating forum post:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update forum post",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Delete Forum Post (Creator only)
  async deleteForumPost(postId: string): Promise<ApiResponse<void>> {
    try {
      if (!this.isValidObjectId(postId)) {
        return {
          success: false,
          error: "Invalid post ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/forum/posts/${postId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error deleting forum post:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete forum post",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Like/Unlike Forum Post
  async likeForumPost(
    postId: string
  ): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> {
    try {
      if (!this.isValidObjectId(postId)) {
        return {
          success: false,
          error: "Invalid post ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/forum/posts/${postId}/like`,
        {
          method: "POST",
          headers,
        }
      );

      return await this.handleResponse<{ liked: boolean; likesCount: number }>(
        response
      );
    } catch (error) {
      console.error("Error liking forum post:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to like post",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get Forum Post Comments (Public - no auth required)
  async getForumPostComments(
    postId: string,
    params?: { page?: number; limit?: number; includeReplies?: boolean }
  ): Promise<ApiResponse<{ comments: ForumComment[]; pagination: any }>> {
    try {
      if (!this.isValidObjectId(postId)) {
        return {
          success: false,
          error: "Invalid post ID",
          code: "VALIDATION_ERROR",
        };
      }

      // Try to get auth headers, but don't fail if not available (public endpoint)
      let headers: HeadersInit;
      try {
        headers = await this.getAuthHeaders();
      } catch {
        headers = {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        };
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.includeReplies !== undefined)
        queryParams.append("includeReplies", params.includeReplies.toString());

      const response = await fetch(
        `${
          this.baseURL
        }/api/community/forum/posts/${postId}/comments?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await this.handleResponse<
        | {
            data: { comments: ForumComment[]; pagination: any };
          }
        | {
            comments: ForumComment[];
            pagination: any;
          }
      >(response);

      // Handle different response formats
      if (result.success && result.data) {
        const data = result.data as any;
        const comments = data.comments || data.data?.comments || [];
        const pagination = data.pagination ||
          data.data?.pagination || {
            page: params?.page || 1,
            limit: params?.limit || 20,
            total: comments.length,
            totalPages: 1,
            hasMore: false,
          };

        return {
          success: true,
          data: { comments, pagination },
        };
      }

      return result as ApiResponse<{
        comments: ForumComment[];
        pagination: any;
      }>;
    } catch (error) {
      console.error("Error getting forum post comments:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch comments",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Add Comment to Forum Post
  async commentOnForumPost(
    postId: string,
    commentData: { content: string; parentCommentId?: string }
  ): Promise<ApiResponse<ForumComment>> {
    try {
      if (!this.isValidObjectId(postId)) {
        return {
          success: false,
          error: "Invalid post ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/forum/posts/${postId}/comments`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(commentData),
        }
      );

      const result = await this.handleResponse<
        { data: ForumComment } | ForumComment
      >(response);

      // Handle different response formats
      if (result.success && result.data) {
        const commentData = (result.data as any).data || result.data;
        return {
          success: true,
          data: commentData as ForumComment,
        };
      }

      return result as ApiResponse<ForumComment>;
    } catch (error) {
      console.error("Error commenting on forum post:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add comment",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Like/Unlike Forum Comment
  async likeForumComment(
    commentId: string
  ): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> {
    try {
      if (!this.isValidObjectId(commentId)) {
        return {
          success: false,
          error: "Invalid comment ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/forum/comments/${commentId}/like`,
        {
          method: "POST",
          headers,
        }
      );

      return await this.handleResponse<{ liked: boolean; likesCount: number }>(
        response
      );
    } catch (error) {
      console.error("Error liking forum comment:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to like comment",
        code: "NETWORK_ERROR",
      };
    }
  }

  // ============= GROUPS API =============

  // Create Group
  async createGroup(groupData: {
    name: string;
    description?: string;
    visibility?: "public" | "private";
  }): Promise<ApiResponse<Group>> {
    try {
      const headers = await this.getAuthHeaders();
      const payload: Record<string, any> = {
        name: groupData.name?.trim(),
        visibility: groupData.visibility || "public",
      };

      if (groupData.description && groupData.description.trim().length > 0) {
        payload.description = groupData.description.trim();
      }

      const response = await fetch(
        `${this.baseURL}/api/community/groups`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );

      const apiResponse = await this.handleResponse<{ group: Group }>(response);

      if (apiResponse.success) {
        const group =
          (apiResponse.data && "group" in apiResponse.data
            ? apiResponse.data.group
            : (apiResponse.data as unknown as Group)) || null;

        if (group) {
          return {
            success: true,
            data: {
              ...group,
              visibility: group.visibility || payload.visibility,
              isPublic:
                group.visibility
                  ? group.visibility === "public"
                  : payload.visibility === "public",
            },
            message: apiResponse.message,
          };
        }
      }

      return apiResponse as unknown as ApiResponse<Group>;
    } catch (error) {
      console.error("Error creating group:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create group",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get My Groups
  async getMyGroups(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ groups: Group[]; pagination: any }>> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      const url = `${
        this.baseURL
      }/api/community/groups/my-groups?${queryParams.toString()}`;
      console.log("🌐 Fetching my groups from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      console.log(
        "📡 My groups response status:",
        response.status,
        response.statusText
      );

      // Handle 404 as empty result (no groups) rather than error
      if (response.status === 404) {
        console.log("ℹ️ 404 response - no groups found, returning empty array");
        return {
          success: true,
          data: {
            groups: [],
            pagination: {
              page: params?.page || 1,
              limit: params?.limit || 20,
              total: 0,
              hasMore: false,
            },
          },
        };
      }

      const result = await this.handleResponse<{
        groups: Group[];
        pagination: any;
      }>(response);

      console.log("📥 My groups result:", {
        success: result.success,
        hasData: !!result.data,
        groupsCount: result.data?.groups?.length || 0,
        error: result.error,
      });

      return result;
    } catch (error) {
      console.error("❌ Error getting my groups:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch my groups",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Explore Public Groups
  async exploreGroups(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: "membersCount" | "createdAt" | "name";
    sortOrder?: "asc" | "desc";
  }): Promise<ApiResponse<{ groups: Group[]; pagination: any }>> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.search) queryParams.append("search", params.search);
      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      const response = await fetch(
        `${
          this.baseURL
        }/api/community/groups/explore?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      return await this.handleResponse<{ groups: Group[]; pagination: any }>(
        response
      );
    } catch (error) {
      console.error("Error exploring groups:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to explore groups",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get Group Details
  async getGroupDetails(groupId: string): Promise<ApiResponse<Group>> {
    try {
      if (!this.isValidObjectId(groupId)) {
        return {
          success: false,
          error: "Invalid group ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}`,
        {
          method: "GET",
          headers,
        }
      );

      return await this.handleResponse<Group>(response);
    } catch (error) {
      console.error("Error getting group details:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch group details",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Add Members to Group
  async addGroupMembers(
    groupId: string,
    userIds: string[]
  ): Promise<ApiResponse<{ addedMembers: any[]; failedUsers: any[] }>> {
    try {
      if (!this.isValidObjectId(groupId)) {
        return {
          success: false,
          error: "Invalid group ID",
          code: "VALIDATION_ERROR",
        };
      }

      if (userIds.length > 50) {
        return {
          success: false,
          error: "Maximum 50 users per request",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}/members`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ userIds }),
        }
      );

      return await this.handleResponse<{
        addedMembers: any[];
        failedUsers: any[];
      }>(response);
    } catch (error) {
      console.error("Error adding group members:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add members",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Join Group (Public Groups)
  async joinGroup(groupId: string): Promise<ApiResponse<any>> {
    try {
      if (!this.isValidObjectId(groupId)) {
        return {
          success: false,
          error: "Invalid group ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}/join`,
        {
          method: "POST",
          headers,
        }
      );

      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error("Error joining group:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to join group",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Leave Group
  async leaveGroup(groupId: string): Promise<ApiResponse<void>> {
    try {
      if (!this.isValidObjectId(groupId)) {
        return {
          success: false,
          error: "Invalid group ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}/leave`,
        {
          method: "POST",
          headers,
        }
      );

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error leaving group:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to leave group",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Remove Member from Group
  async removeGroupMember(
    groupId: string,
    userId: string
  ): Promise<ApiResponse<void>> {
    try {
      if (!this.isValidObjectId(groupId) || !this.isValidObjectId(userId)) {
        return {
          success: false,
          error: "Invalid group or user ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/groups/${groupId}/members/${userId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error removing group member:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to remove member",
        code: "NETWORK_ERROR",
      };
    }
  }

  // ============= POLLS API =============

  // Create Poll (All authenticated users can create)
  async createPoll(pollData: {
    question: string;
    options: string[];
    multiSelect?: boolean;
    closesAt?: string;
    expiresAt?: string; // Alias for closesAt
    description?: string;
  }): Promise<ApiResponse<Poll>> {
    try {
      const headers = await this.getAuthHeaders();

      // Normalize data - use closesAt if provided, otherwise expiresAt
      const normalizedData = {
        question: pollData.question,
        options: pollData.options,
        multiSelect: pollData.multiSelect || false,
        closesAt: pollData.closesAt || pollData.expiresAt,
        description: pollData.description,
      };

      // Try both endpoints (polls and polls/create)
      let response = await fetch(`${this.baseURL}/api/community/polls`, {
        method: "POST",
        headers,
        body: JSON.stringify(normalizedData),
      });

      // If 404, try the /create endpoint
      if (response.status === 404) {
        response = await fetch(`${this.baseURL}/api/community/polls/create`, {
          method: "POST",
          headers,
          body: JSON.stringify(normalizedData),
        });
      }

      const result = await this.handleResponse<{ poll: Poll } | Poll>(response);

      // Handle different response formats
      if (result.success && result.data) {
        // Check if response has nested poll object
        const pollData = (result.data as any).poll || result.data;
        return {
          success: true,
          data: pollData as Poll,
        };
      }

      return result as ApiResponse<Poll>;
    } catch (error) {
      console.error("Error creating poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create poll",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get All Polls (Public - no auth required)
  async getPolls(params?: {
    page?: number;
    limit?: number;
    status?: "all" | "open" | "closed" | "active" | "expired";
    sortBy?: "createdAt" | "totalVotes";
    sortOrder?: "asc" | "desc";
  }): Promise<
    ApiResponse<{
      items: Poll[];
      polls?: Poll[];
      page: number;
      pageSize: number;
      total: number;
      pagination?: any;
    }>
  > {
    try {
      // Try to get auth headers, but don't fail if not available (public endpoint)
      let headers: HeadersInit;
      try {
        headers = await this.getAuthHeaders();
      } catch {
        headers = {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        };
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      // Normalize status: active -> open, expired -> closed
      let status = params?.status;
      if (status === "active") status = "open";
      if (status === "expired") status = "closed";
      if (status) queryParams.append("status", status);

      if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
      if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);

      const response = await fetch(
        `${this.baseURL}/api/community/polls?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await this.handleResponse<{
        items: Poll[];
        polls?: Poll[];
        page: number;
        pageSize: number;
        total: number;
        pagination?: any;
      }>(response);

      // Handle different response formats
      if (result.success && result.data) {
        const data = result.data as any;
        // Support both formats: { items: [] } or { polls: [] }
        const items = data.items || data.polls || [];

        // Log raw response to debug missing options
        console.log("📥 Raw polls API response:", {
          hasData: !!result.data,
          dataKeys: Object.keys(data),
          itemsCount: items.length,
          sampleItem:
            items.length > 0
              ? {
                  id: items[0]._id,
                  hasOptions: !!items[0].options,
                  optionsCount: items[0].options?.length || 0,
                  keys: Object.keys(items[0]),
                }
              : null,
        });

        // Ensure options array exists on each poll
        const normalizedItems = items.map((poll: any) => {
          if (!poll.options || !Array.isArray(poll.options)) {
            console.warn("⚠️ Poll missing options array:", {
              pollId: poll._id,
              question: poll.question || poll.title,
              existingKeys: Object.keys(poll),
            });
            return {
              ...poll,
              options: [], // Ensure options is always an array
            };
          }
          return poll;
        });

        const pagination = data.pagination || {
          page: data.page || 1,
          limit: data.pageSize || params?.limit || 20,
          total: data.total || 0,
          hasMore:
            (data.page || 1) * (data.pageSize || params?.limit || 20) <
            (data.total || 0),
        };

        return {
          success: true,
          data: {
            items: normalizedItems,
            polls: normalizedItems, // Backward compatibility
            page: data.page || 1,
            pageSize: data.pageSize || params?.limit || 20,
            total: data.total || 0,
            pagination,
          },
        };
      }

      return result;
    } catch (error) {
      console.error("Error getting polls:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch polls",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get My Polls (Authenticated users only)
  async getMyPolls(params?: { page?: number; limit?: number }): Promise<
    ApiResponse<{
      items: Poll[];
      page: number;
      pageSize: number;
      total: number;
      pagination: any;
    }>
  > {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());

      const response = await fetch(
        `${this.baseURL}/api/community/polls/my?${queryParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await this.handleResponse<{
        items: Poll[];
        page: number;
        pageSize: number;
        total: number;
        pagination: any;
      }>(response);

      if (result.success && result.data) {
        const data = result.data as any;
        const pagination = data.pagination || {
          page: data.page || 1,
          limit: data.pageSize || params?.limit || 20,
          total: data.total || 0,
          pages: Math.ceil(
            (data.total || 0) / (data.pageSize || params?.limit || 20)
          ),
          hasMore:
            (data.page || 1) * (data.pageSize || params?.limit || 20) <
            (data.total || 0),
        };

        return {
          success: true,
          data: {
            items: data.items || [],
            page: data.page || 1,
            pageSize: data.pageSize || params?.limit || 20,
            total: data.total || 0,
            pagination,
          },
        };
      }

      return result;
    } catch (error) {
      console.error("Error getting my polls:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch my polls",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Get Poll Details (Public - no auth required)
  async getPollDetails(pollId: string): Promise<ApiResponse<Poll>> {
    try {
      if (!this.isValidObjectId(pollId)) {
        return {
          success: false,
          error: "Invalid poll ID",
          code: "VALIDATION_ERROR",
        };
      }

      // Try to get auth headers, but don't fail if not available (public endpoint)
      let headers: HeadersInit;
      try {
        headers = await this.getAuthHeaders();
      } catch {
        headers = {
          "Content-Type": "application/json",
          "expo-platform": Platform.OS,
        };
      }

      const response = await fetch(
        `${this.baseURL}/api/community/polls/${pollId}`,
        {
          method: "GET",
          headers,
        }
      );

      const result = await this.handleResponse<{ poll: Poll } | Poll>(response);

      // Handle different response formats
      if (result.success && result.data) {
        const pollData = (result.data as any).poll || result.data;
        return {
          success: true,
          data: pollData as Poll,
        };
      }

      return result as ApiResponse<Poll>;
    } catch (error) {
      console.error("Error getting poll details:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch poll details",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Vote on Poll (Supports single or multi-select)
  async voteOnPoll(
    pollId: string,
    optionIndex: number | number[]
  ): Promise<ApiResponse<Poll>> {
    try {
      if (!this.isValidObjectId(pollId)) {
        return {
          success: false,
          error: "Invalid poll ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();

      // Try both endpoints (vote and votes)
      let response = await fetch(
        `${this.baseURL}/api/community/polls/${pollId}/vote`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ optionIndex }),
        }
      );

      // If 404, try the /votes endpoint
      if (response.status === 404) {
        response = await fetch(
          `${this.baseURL}/api/community/polls/${pollId}/votes`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ optionIndex }),
          }
        );
      }

      const result = await this.handleResponse<{ poll: Poll } | Poll>(response);

      // Handle different response formats
      if (result.success && result.data) {
        const pollData = (result.data as any).poll || result.data;
        return {
          success: true,
          data: pollData as Poll,
        };
      }

      return result as ApiResponse<Poll>;
    } catch (error) {
      console.error("Error voting on poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to vote",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Update Poll (Creator or Admin only)
  async updatePoll(
    pollId: string,
    updates: {
      question?: string;
      title?: string; // Backward compatibility
      description?: string | null;
      options?: string[];
      multiSelect?: boolean;
      closesAt?: string | null;
      expiresAt?: string | null; // Alias for closesAt
      isActive?: boolean;
    }
  ): Promise<ApiResponse<Poll>> {
    try {
      if (!this.isValidObjectId(pollId)) {
        return {
          success: false,
          error: "Invalid poll ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();

      // Normalize updates
      const normalizedUpdates: any = {};
      if (updates.question !== undefined)
        normalizedUpdates.question = updates.question;
      if (updates.title !== undefined && !updates.question)
        normalizedUpdates.question = updates.title;
      if (updates.description !== undefined)
        normalizedUpdates.description = updates.description;
      if (updates.options !== undefined)
        normalizedUpdates.options = updates.options;
      if (updates.multiSelect !== undefined)
        normalizedUpdates.multiSelect = updates.multiSelect;
      if (updates.closesAt !== undefined)
        normalizedUpdates.closesAt = updates.closesAt;
      if (updates.expiresAt !== undefined && !updates.closesAt)
        normalizedUpdates.closesAt = updates.expiresAt;
      if (updates.isActive !== undefined)
        normalizedUpdates.isActive = updates.isActive;

      const response = await fetch(
        `${this.baseURL}/api/community/polls/${pollId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(normalizedUpdates),
        }
      );

      const result = await this.handleResponse<{ data: Poll } | Poll>(response);

      // Handle different response formats
      if (result.success && result.data) {
        const pollData = (result.data as any).data || result.data;
        return {
          success: true,
          data: pollData as Poll,
        };
      }

      return result as ApiResponse<Poll>;
    } catch (error) {
      console.error("Error updating poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update poll",
        code: "NETWORK_ERROR",
      };
    }
  }

  // Delete Poll (Creator or Admin only)
  async deletePoll(pollId: string): Promise<ApiResponse<void>> {
    try {
      if (!this.isValidObjectId(pollId)) {
        return {
          success: false,
          error: "Invalid poll ID",
          code: "VALIDATION_ERROR",
        };
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/community/polls/${pollId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      return await this.handleResponse<void>(response);
    } catch (error) {
      console.error("Error deleting poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete poll",
        code: "NETWORK_ERROR",
      };
    }
  }
}

// Export singleton instance
export const communityAPI = new CommunityAPIService();
export default communityAPI;
