// ============= FORUM API =============
import { Platform } from "react-native";
import type { CommunityAPIClient } from "./client";
import type {
  ApiResponse,
  Forum,
  ForumComment,
  ForumPost,
} from "./types";

export const forumApiMethods = {
  // Create Forum (Authenticated users only)
  async createForum(
    this: CommunityAPIClient,
    forumData: {
      categoryId: string;
      title: string;
      description: string;
    }
  ): Promise<ApiResponse<Forum>> {
    try {
      if (!forumData.categoryId || !this.isValidObjectId(forumData.categoryId)) {
        return {
          success: false,
          error: "Invalid category ID",
          code: "VALIDATION_ERROR",
        };
      }

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
        const createdForum = (result.data as any).data || result.data;
        return {
          success: true,
          data: createdForum as Forum,
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
  },

  // Get All Forums (Public - no auth required)
  async getForums(
    this: CommunityAPIClient,
    params?: {
      page?: number;
      limit?: number;
      view?: "categories" | "discussions" | "all";
      categoryId?: string;
    }
  ): Promise<ApiResponse<{ forums: Forum[]; pagination: any }>> {
    try {
      if (
        params?.categoryId &&
        !this.isValidObjectId(params.categoryId)
      ) {
        return {
          success: false,
          error: "Invalid category ID",
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
      if (params?.view) queryParams.append("view", params.view);
      if (params?.categoryId) queryParams.append("categoryId", params.categoryId);

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
  },

  // Get Forum Posts (Public - no auth required)
  async getForumPosts(
    this: CommunityAPIClient,
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
  },

  // Create Forum Post
  async createForumPost(
    this: CommunityAPIClient,
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
  },

  // Update Forum Post (Creator only)
  async updateForumPost(
    this: CommunityAPIClient,
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
  },

  // Delete Forum Post (Creator only)
  async deleteForumPost(
    this: CommunityAPIClient,
    postId: string
  ): Promise<ApiResponse<void>> {
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
  },

  // Like/Unlike Forum Post
  async likeForumPost(
    this: CommunityAPIClient,
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
  },

  // Get Forum Post Comments (Public - no auth required)
  async getForumPostComments(
    this: CommunityAPIClient,
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
  },

  // Add Comment to Forum Post
  async commentOnForumPost(
    this: CommunityAPIClient,
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
  },

  // Like/Unlike Forum Comment
  async likeForumComment(
    this: CommunityAPIClient,
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
  },
};
