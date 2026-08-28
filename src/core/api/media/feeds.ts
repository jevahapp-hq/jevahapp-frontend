import { API_CONFIG } from "../../../shared/constants";
import {
  ContentFilter,
  MediaApiResponse,
  MediaItem,
} from "../../../shared/types";
import { apiClient } from "../ApiClient";
import { buildListParams, Result, unwrap } from "./envelope";
import { parseMediaListPayload } from "./parseMediaList";

export interface ContentListOptions {
  page?: number;
  limit?: number;
  contentType?: string;
  sort?: string;
  order?: "asc" | "desc";
  profile?: string;
}

function toMediaApiResponse(response: any): MediaApiResponse {
  if (!response.success) {
    return {
      success: false,
      error: response.error || "Failed to fetch content",
    };
  }
  const parsed = parseMediaListPayload(response);
  return {
    success: true,
    media: parsed.media,
    total: parsed.total,
    page: parsed.page,
    limit: parsed.limit,
    pagination: parsed.pagination,
  };
}

export async function getAllContentPublic(
  options?: ContentListOptions
): Promise<MediaApiResponse> {
  return toMediaApiResponse(
    await apiClient.get<any>(
      API_CONFIG.ENDPOINTS.ALL_CONTENT,
      buildListParams(options)
    )
  );
}

export async function getAllContentWithAuth(
  options?: ContentListOptions
): Promise<MediaApiResponse> {
  return toMediaApiResponse(
    await apiClient.get<any>(
      API_CONFIG.ENDPOINTS.ALL_CONTENT_AUTH,
      buildListParams(options)
    )
  );
}

export async function getDefaultContent(
  filter: ContentFilter = {}
): Promise<MediaApiResponse> {
  const params = {
    page: filter.page || 1,
    limit: filter.limit || 40,
    contentType: filter.contentType !== "ALL" ? filter.contentType : undefined,
    search: filter.search,
  };

  return toMediaApiResponse(
    await apiClient.get<any>(API_CONFIG.ENDPOINTS.DEFAULT_CONTENT, params)
  );
}

export async function getContentById(
  contentId: string
): Promise<Result<MediaItem>> {
  return unwrap(
    await apiClient.get<any>(
      `${API_CONFIG.ENDPOINTS.DEFAULT_CONTENT}/${contentId}`
    ),
    "Failed to fetch content"
  );
}

/**
 * Fetch one media item, e.g. to obtain a fresh signed/CDN playback URL when a
 * cached URL has expired. Some deployments return the item at the top level
 * rather than under `data`, so both are accepted.
 */
export async function getMediaById(id: string): Promise<
  Result<{
    fileUrl?: string;
    playbackUrl?: string;
    hlsUrl?: string;
    [key: string]: any;
  }>
> {
  if (!id || typeof id !== "string" || id.trim() === "") {
    return { success: false, error: "Invalid media ID" };
  }

  const response = await apiClient.get<any>(`/api/media/${id.trim()}`);
  if (response.success) {
    const data = (response as any).data ?? response;
    return { success: true, data: typeof data === "object" ? data : {} };
  }
  return {
    success: false,
    error: (response as any).error || "Failed to fetch media",
  };
}
