import type { CommunityAPIClient } from "../client";
import {
  networkError,
  optionalAuthHeaders,
  toQuery,
  unwrapEntity,
  unwrapList,
  validationError,
} from "../requestHelpers";
import type { ApiResponse, ForumComment } from "../types";

/** Get forum post comments (public — no auth required). */
export async function getForumPostComments(
  this: CommunityAPIClient,
  postId: string,
  params?: { page?: number; limit?: number; includeReplies?: boolean }
): Promise<ApiResponse<{ comments: ForumComment[]; pagination: any }>> {
  try {
    if (!this.isValidObjectId(postId)) {
      return validationError("Invalid post ID");
    }

    const query = toQuery({
      page: params?.page,
      limit: params?.limit,
      includeReplies: params?.includeReplies,
    });

    const response = await fetch(
      `${this.baseURL}/api/community/forum/posts/${postId}/comments?${query}`,
      { method: "GET", headers: await optionalAuthHeaders(this) }
    );

    return unwrapList<"comments", ForumComment>(
      await this.handleResponse<any>(response),
      "comments",
      params
    );
  } catch (error) {
    console.error("Error getting forum post comments:", error);
    return networkError(error, "Failed to fetch comments");
  }
}

export async function commentOnForumPost(
  this: CommunityAPIClient,
  postId: string,
  commentData: { content: string; parentCommentId?: string }
): Promise<ApiResponse<ForumComment>> {
  try {
    if (!this.isValidObjectId(postId)) {
      return validationError("Invalid post ID");
    }

    const response = await fetch(
      `${this.baseURL}/api/community/forum/posts/${postId}/comments`,
      {
        method: "POST",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(commentData),
      }
    );

    return unwrapEntity<ForumComment>(await this.handleResponse<any>(response));
  } catch (error) {
    console.error("Error commenting on forum post:", error);
    return networkError(error, "Failed to add comment");
  }
}

export async function likeForumComment(
  this: CommunityAPIClient,
  commentId: string
): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> {
  try {
    if (!this.isValidObjectId(commentId)) {
      return validationError("Invalid comment ID");
    }

    const response = await fetch(
      `${this.baseURL}/api/community/forum/comments/${commentId}/like`,
      { method: "POST", headers: await this.getAuthHeaders() }
    );

    return await this.handleResponse<{ liked: boolean; likesCount: number }>(
      response
    );
  } catch (error) {
    console.error("Error liking forum comment:", error);
    return networkError(error, "Failed to like comment");
  }
}
