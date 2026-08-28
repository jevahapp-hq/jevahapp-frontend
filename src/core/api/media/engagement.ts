import { API_CONFIG } from "../../../shared/constants";
import { MediaItem } from "../../../shared/types";
import { apiClient } from "../ApiClient";
import { Result, unwrap } from "./envelope";

function mapContentTypeForBookmark(contentType: string): string {
  const n = (contentType || "").toLowerCase();
  if (n === "artist") return "artist";
  if (n === "merch") return "merch";
  if (["ebook", "e-books", "ebooks", "books"].includes(n)) return "ebook";
  if (["podcast", "podcasts"].includes(n)) return "podcast";
  return "media";
}

/** Universal like endpoint (preferred). */
export async function toggleLike(
  contentId: string,
  contentType: string
): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(`/api/content/${contentType}/${contentId}/like`),
    "Failed to toggle like"
  );
}

/** Media-specific like (fallback for older backends). */
export async function toggleMediaLike(mediaId: string): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.INTERACTIONS}/${mediaId}/like`,
      { contentType: "media" }
    ),
    "Failed to toggle like"
  );
}

/** Universal bookmark endpoint (preferred). */
export async function toggleSave(
  contentId: string,
  contentType: string
): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(`/api/bookmark/${contentId}/toggle`, {
      contentType: mapContentTypeForBookmark(contentType),
    }),
    "Failed to toggle save"
  );
}

/** Media-specific bookmark (fallback for older backends). */
export async function toggleMediaBookmark(mediaId: string): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.INTERACTIONS}/${mediaId}/save`,
      { contentType: "media" }
    ),
    "Failed to toggle bookmark"
  );
}

export async function recordShare(
  contentId: string,
  contentType: string,
  shareMethod?: string
): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.INTERACTIONS}/${contentId}/share`,
      { contentType, shareMethod }
    ),
    "Failed to record share"
  );
}

export async function recordView(
  contentId: string,
  contentType: string,
  duration?: number
): Promise<Result> {
  return unwrap(
    await apiClient.post<any>(
      `${API_CONFIG.ENDPOINTS.INTERACTIONS}/${contentId}/view`,
      { contentType, duration }
    ),
    "Failed to record view"
  );
}

export async function getUserSavedContent(
  contentType?: string,
  page?: number
): Promise<Result<MediaItem[]>> {
  return unwrap(
    await apiClient.get<any>("/api/bookmark/user", {
      contentType,
      page: page || 1,
    }),
    "Failed to fetch saved content",
    (data) =>
      data?.bookmarks?.map((bookmark: any) => bookmark.media) ||
      data?.bookmarkedMedia ||
      []
  );
}

export async function getActionStatus(mediaId: string): Promise<Result> {
  return unwrap(
    await apiClient.get<any>(`/api/media/${mediaId}/action-status`),
    "Failed to fetch action status"
  );
}

export async function getBookmarkStatus(mediaId: string): Promise<Result> {
  return unwrap(
    await apiClient.get<any>(`/api/bookmark/${mediaId}/status`),
    "Failed to fetch bookmark status"
  );
}
