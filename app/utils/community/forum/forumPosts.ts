import type { CommunityAPIClient } from "../client";
import {
  networkError,
  optionalAuthHeaders,
  toQuery,
  unwrapEntity,
  unwrapList,
  validationError,
} from "../requestHelpers";
import type { ApiResponse, ForumPost } from "../types";

type EmbeddedLink = {
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  type: "video" | "article" | "resource" | "other";
};

export interface ForumPostPayload {
  content: string;
  embeddedLinks?: EmbeddedLink[];
  tags?: string[];
}

/** Get forum posts (public — no auth required). */
export async function getForumPosts(
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
      return validationError("Invalid forum ID");
    }

    const query = toQuery({
      page: params?.page,
      limit: params?.limit,
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
    });

    const response = await fetch(
      `${this.baseURL}/api/community/forum/${forumId}/posts?${query}`,
      { method: "GET", headers: await optionalAuthHeaders(this) }
    );

    return unwrapList<"posts", ForumPost>(
      await this.handleResponse<any>(response),
      "posts",
      params
    );
  } catch (error) {
    console.error("Error getting forum posts:", error);
    return networkError(error, "Failed to fetch forum posts");
  }
}

export async function createForumPost(
  this: CommunityAPIClient,
  forumId: string,
  postData: ForumPostPayload
): Promise<ApiResponse<ForumPost>> {
  try {
    if (!this.isValidObjectId(forumId)) {
      return validationError("Invalid forum ID");
    }

    const response = await fetch(
      `${this.baseURL}/api/community/forum/${forumId}/posts`,
      {
        method: "POST",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(postData),
      }
    );

    return unwrapEntity<ForumPost>(await this.handleResponse<any>(response));
  } catch (error) {
    console.error("Error creating forum post:", error);
    return networkError(error, "Failed to create forum post");
  }
}

/** Update forum post (creator only). */
export async function updateForumPost(
  this: CommunityAPIClient,
  postId: string,
  postData: Partial<ForumPostPayload>
): Promise<ApiResponse<ForumPost>> {
  try {
    if (!this.isValidObjectId(postId)) {
      return validationError("Invalid post ID");
    }

    const response = await fetch(
      `${this.baseURL}/api/community/forum/posts/${postId}`,
      {
        method: "PUT",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(postData),
      }
    );

    return unwrapEntity<ForumPost>(await this.handleResponse<any>(response));
  } catch (error) {
    console.error("Error updating forum post:", error);
    return networkError(error, "Failed to update forum post");
  }
}

/** Delete forum post (creator only). */
export async function deleteForumPost(
  this: CommunityAPIClient,
  postId: string
): Promise<ApiResponse<void>> {
  try {
    if (!this.isValidObjectId(postId)) {
      return validationError("Invalid post ID");
    }

    const response = await fetch(
      `${this.baseURL}/api/community/forum/posts/${postId}`,
      { method: "DELETE", headers: await this.getAuthHeaders() }
    );

    return await this.handleResponse<void>(response);
  } catch (error) {
    console.error("Error deleting forum post:", error);
    return networkError(error, "Failed to delete forum post");
  }
}

export async function likeForumPost(
  this: CommunityAPIClient,
  postId: string
): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> {
  try {
    if (!this.isValidObjectId(postId)) {
      return validationError("Invalid post ID");
    }

    const response = await fetch(
      `${this.baseURL}/api/community/forum/posts/${postId}/like`,
      { method: "POST", headers: await this.getAuthHeaders() }
    );

    return await this.handleResponse<{ liked: boolean; likesCount: number }>(
      response
    );
  } catch (error) {
    console.error("Error liking forum post:", error);
    return networkError(error, "Failed to like post");
  }
}
