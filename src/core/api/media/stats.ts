import { API_CONFIG } from "../../../shared/constants";
import { apiClient } from "../ApiClient";
import { Result, unwrap } from "./envelope";

export async function getContentStats(
  contentId: string,
  contentType?: string
): Promise<Result> {
  return unwrap(
    await apiClient.get<any>(
      `${API_CONFIG.ENDPOINTS.CONTENT_STATS}/${contentId}`,
      contentType ? { contentType } : {}
    ),
    "Failed to fetch content stats"
  );
}

export async function batchGetContentStats(
  contentIds: string[],
  contentType?: string
): Promise<Result> {
  return unwrap(
    await apiClient.post<any>("/api/media/batch-stats", {
      contentIds,
      contentType,
    }),
    "Failed to fetch batch stats"
  );
}
