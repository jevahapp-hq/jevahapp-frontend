import type { ContentInteractionClient } from "./client";
import { isMissingRoute } from "./commentHttp";

export async function toggleCommentLike(
  ctx: ContentInteractionClient,
  commentId: string
): Promise<{ liked: boolean; totalLikes: number }> {
  try {
    if (!ctx.isValidObjectId(commentId)) {
      return { liked: false, totalLikes: 0 };
    }
    const headers = await ctx.getAuthHeaders();
    // Prefer current contract; fall back to legacy interactions path
    const urls = [
      `${ctx.baseURL}/api/content/comments/${commentId}/reaction`,
      `${ctx.baseURL}/api/interactions/comments/${commentId}/reaction`,
    ];

    let raw: any = null;
    let lastStatus = 0;
    for (const url of urls) {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ reactionType: "like" }),
      });
      lastStatus = response.status;
      if (response.ok) {
        raw = await response.json();
        break;
      }
      if (!isMissingRoute(response.status)) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    if (!raw) {
      throw new Error(`HTTP error! status: ${lastStatus || 404}`);
    }

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
