import { API_CONFIG } from "../../../shared/constants";
import { apiClient } from "../ApiClient";
import { Result, unwrap } from "./envelope";

export async function getComments(
  contentId: string,
  contentType?: string,
  page?: number
): Promise<Result<any[]>> {
  return unwrap(
    await apiClient.get<any>(`${API_CONFIG.ENDPOINTS.COMMENTS}/${contentId}`, {
      contentType,
      page: page || 1,
    }),
    "Failed to fetch comments",
    (data) => data?.comments || data || []
  );
}

export async function addComment(
  contentId: string,
  comment: string,
  contentType?: string,
  parentCommentId?: string
): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(`${API_CONFIG.ENDPOINTS.COMMENTS}/${contentId}`, {
      comment,
      contentType,
      parentCommentId,
    }),
    "Failed to add comment"
  );
}

export async function toggleCommentLike(
  commentId: string,
  contentId: string
): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/${commentId}/like`,
      { contentId }
    ),
    "Failed to toggle comment like"
  );
}
