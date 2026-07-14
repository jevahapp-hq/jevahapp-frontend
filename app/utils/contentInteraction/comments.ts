import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { ContentInteractionClient } from "./client";
import type { CommentData } from "./types";

export async function addComment(
  ctx: ContentInteractionClient,
  contentId: string,
  comment: string,
  contentType: string = "media",
  parentCommentId?: string
): Promise<CommentData> {
  try {
    if (!ctx.isValidObjectId(contentId)) {
      throw new Error("Invalid content ID");
    }
    const headers = await ctx.getAuthHeaders();
    const backendContentType = ctx.mapContentTypeToBackend(contentType);

    const response = await fetch(
      `${ctx.baseURL}/api/content/${backendContentType}/${contentId}/comment`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: comment,
          parentCommentId,
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = "Failed to create comment";
      let errorBody: any = {};

      try {
        const errorText = await response.text();
        errorBody = JSON.parse(errorText);
        errorMessage = errorBody?.message || errorBody?.error || errorMessage;
      } catch {
        // If error text is not JSON, use the raw text
      }

      // Create a more descriptive error with status code
      const error = new Error(errorMessage) as Error & {
        status: number;
        statusText: string;
        body?: any;
      };
      error.status = response.status;
      error.statusText = response.statusText;
      error.body = errorBody;

      // Log detailed error info for debugging (only in dev)
      if (__DEV__) {
        console.error("❌ Comment submission failed:", {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
          body: errorBody,
          contentId,
          contentType: backendContentType,
        });
      }

      throw error;
    }

    const raw = await response.json();
    // Backend spec: { success, message, data: { ...comment } }
    const data = raw?.data || raw;
    const user = data?.user || {};

    const firstName =
      user.firstName || user.given_name || user.first_name || "";
    const lastName =
      user.lastName || user.family_name || user.last_name || "";
    const fullName = `${String(firstName).trim()} ${String(
      lastName
    ).trim()}`.trim();

    const transformed: CommentData = {
      id: String(data?.id || data?._id),
      contentId: String(contentId),
      userId: String(user.id || user._id || data?.userId || ""),
      username:
        fullName ||
        user.username ||
        data?.username ||
        user.email ||
        "User",
      userAvatar: user.avatar || user.avatarUrl || data?.avatar || "",
      comment: String(data?.content || data?.comment || ""),
      timestamp: String(
        data?.createdAt || data?.timestamp || new Date().toISOString()
      ),
      likes: Number(
        data?.likesCount ?? data?.likes ?? data?.reactionsCount ?? 0
      ),
      isLiked: Boolean(data?.isLiked || false),
      replies: [], // replies are loaded separately when needed
    };
    return transformed;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
}

export async function getComments(
  ctx: ContentInteractionClient,
  contentId: string,
  contentType: string = "media",
  page: number = 1,
  limit: number = 20,
  sortBy: "newest" | "oldest" | "top" = "newest"
): Promise<{
  comments: CommentData[];
  totalComments: number;
  hasMore: boolean;
}> {
  try {
    if (!ctx.isValidObjectId(contentId)) {
      return { comments: [], totalComments: 0, hasMore: false };
    }

    // GET comments is PUBLIC - token is optional (only for isLiked status)
    // Try to get token but don't fail if not available
    let headers: HeadersInit = {
      "Content-Type": "application/json",
      "expo-platform": Platform.OS,
    };

    try {
      const token =
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("token"));
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {
      // Token not available - that's fine, comments are public
    }

    const backendContentType = ctx.mapContentTypeToBackend(contentType);

    // Build query params
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (sortBy) {
      params.append("sortBy", sortBy);
    }

    const response = await fetch(
      `${ctx.baseURL}/api/content/${backendContentType}/${contentId}/comments?${params.toString()}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const raw = await response.json();
    const payload = raw && raw.data ? raw.data : raw;
    const serverComments: any[] =
      payload?.comments || payload?.items || payload?.data || [];
    const total = Number(
      payload?.total || payload?.totalCount || serverComments.length || 0
    );
    const hasMore = Boolean(payload?.hasMore || page * limit < total);

    // Helper function to transform a single comment (including nested replies)
    const transformComment = (c: any): CommentData => {
      // Extract user name - support multiple formats from backend
      const firstName =
        c?.user?.firstName || c?.author?.firstName || c?.userFirstName || "";
      const lastName =
        c?.user?.lastName || c?.author?.lastName || c?.userLastName || "";
      const fullName =
        `${String(firstName).trim()} ${String(lastName).trim()}`.trim();
      const username = fullName || c?.username || c?.user?.username || "User";

      return {
        id: String(c?._id || c?.id),
        contentId: String(contentId),
        userId: String(
          c?.userId || c?.user?._id || c?.author?._id || c?.authorId || ""
        ),
        username: username,
        userAvatar:
          c?.userAvatar ||
          c?.user?.avatar ||
          c?.user?.avatarUrl ||
          c?.author?.avatar ||
          "",
        comment: String(c?.content || c?.comment || ""),
        timestamp: String(
          c?.createdAt || c?.timestamp || new Date().toISOString()
        ),
        likes: Number(c?.likesCount || c?.likes || c?.reactionsCount || 0),
        isLiked: Boolean(c?.isLiked || false), // Backend should provide this
        replies: Array.isArray(c?.replies)
          ? c.replies.map((r: any) => transformComment(r))
          : undefined,
      };
    };

    const comments: CommentData[] = serverComments.map(transformComment);
    return { comments, totalComments: total, hasMore };
  } catch (error) {
    console.error("Error getting comments:", error);
    return { comments: [], totalComments: 0, hasMore: false };
  }
}

export async function toggleCommentLike(
  ctx: ContentInteractionClient,
  commentId: string
): Promise<{ liked: boolean; totalLikes: number }> {
  try {
    if (!ctx.isValidObjectId(commentId)) {
      return { liked: false, totalLikes: 0 };
    }
    const headers = await ctx.getAuthHeaders();
    const response = await fetch(
      `${ctx.baseURL}/api/interactions/comments/${commentId}/reaction`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ reactionType: "like" }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const raw = await response.json();
    const data = raw && raw.data ? raw.data : raw;
    return {
      liked: Boolean(data?.liked ?? false),
      totalLikes: Number(
        data?.likesCount ?? data?.totalLikes ?? data?.reactionsCount ?? 0
      ),
    };
  } catch (error) {
    console.error("Error toggling comment like:", error);
    return { liked: false, totalLikes: 0 };
  }
}

export async function editComment(
  ctx: ContentInteractionClient,
  commentId: string,
  content: string
): Promise<CommentData> {
  if (!ctx.isValidObjectId(commentId)) {
    throw new Error("Invalid comment ID");
  }
  const headers = await ctx.getAuthHeaders();
  const response = await fetch(
    `${ctx.baseURL}/api/content/comments/${commentId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ content }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to edit comment (${response.status})`);
  }

  const raw = await response.json();
  const data = raw?.data || raw;
  const user = data?.user || {};
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const fullName =
    `${String(firstName).trim()} ${String(lastName).trim()}`.trim();

  return {
    id: String(data?.id || data?._id || commentId),
    contentId: String(data?.contentId || ""),
    userId: String(user.id || user._id || data?.userId || ""),
    username: fullName || user.username || data?.username || "User",
    userAvatar: user.avatar || user.avatarUrl || data?.avatar || "",
    comment: String(data?.content || data?.comment || content),
    timestamp: String(
      data?.createdAt || data?.timestamp || new Date().toISOString()
    ),
    likes: Number(data?.likesCount ?? data?.likes ?? 0),
    isLiked: Boolean(data?.isLiked || false),
    replies: [],
  };
}

export async function deleteComment(
  ctx: ContentInteractionClient,
  commentId: string
): Promise<void> {
  if (!ctx.isValidObjectId(commentId)) {
    throw new Error("Invalid comment ID");
  }
  const headers = await ctx.getAuthHeaders();
  const response = await fetch(
    `${ctx.baseURL}/api/content/comments/${commentId}`,
    { method: "DELETE", headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete comment (${response.status})`);
  }
}
