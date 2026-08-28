import {
  authedRequest,
  baseUrl,
  errorMessageOf,
  getAuthHeaders,
} from "./http";
import type { ApiResult } from "./types";

export function addComment(
  contentType: string,
  contentId: string,
  comment: string,
  parentCommentId?: string
): Promise<ApiResult> {
  return authedRequest(
    `/api/content/${contentType}/${contentId}/comment`,
    { method: "POST", body: { comment, parentCommentId } },
    "adding comment"
  );
}

export function getComments(
  contentType: string,
  contentId: string,
  page: number = 1,
  limit: number = 10
): Promise<ApiResult> {
  return authedRequest(
    `/api/content/${contentType}/${contentId}/comments?page=${page}&limit=${limit}`,
    { method: "GET" },
    "fetching comments"
  );
}

/**
 * Comment deletion moved between route prefixes across backend versions, so
 * both are attempted; only 404/405 falls through to the next candidate.
 */
export async function deleteComment(commentId: string): Promise<ApiResult> {
  try {
    const headers = await getAuthHeaders();
    const urls = [
      `${baseUrl()}/api/content/comments/${commentId}`,
      `${baseUrl()}/api/interactions/comments/${commentId}`,
    ];

    let lastStatus = 0;
    let lastText = "";
    for (const url of urls) {
      const response = await fetch(url, { method: "DELETE", headers });
      lastStatus = response.status;
      if (response.ok) {
        const data = await response.json().catch(() => ({ success: true }));
        return { success: true, data };
      }
      lastText = await response.text().catch(() => "");
      if (response.status !== 404 && response.status !== 405) {
        throw new Error(
          `HTTP error! status: ${response.status} - ${lastText}`
        );
      }
    }

    throw new Error(`HTTP error! status: ${lastStatus || 404} - ${lastText}`);
  } catch (error) {
    console.error("Error deleting comment:", error);
    return { success: false, error: errorMessageOf(error) };
  }
}
