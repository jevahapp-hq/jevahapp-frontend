import {
  apiLog,
  apiWarn,
  authedRequest,
  baseUrl,
  errorMessageOf,
  getAuthHeaders,
} from "./http";
import type { ApiResult } from "./types";

/**
 * The backend exposes a single toggle route, so bookmarking and unbookmarking
 * are the same call. `bookmarkContent` / `unbookmarkContent` are kept as named
 * wrappers because call sites read better that way and both already behaved
 * identically.
 */
function requestBookmarkToggle(mediaId: string): Promise<ApiResult> {
  apiLog("🔖 bookmark toggle:", mediaId);
  return authedRequest(
    `/api/bookmark/${mediaId}/toggle`,
    { method: "POST", body: { contentType: "video" } },
    "toggling bookmark"
  );
}

export function bookmarkContent(mediaId: string): Promise<ApiResult> {
  return requestBookmarkToggle(mediaId);
}

export function unbookmarkContent(mediaId: string): Promise<ApiResult> {
  return requestBookmarkToggle(mediaId);
}

export function toggleBookmark(
  contentId: string,
  _isCurrentlyBookmarked: boolean
): Promise<ApiResult> {
  return requestBookmarkToggle(contentId);
}

export async function getSavedContent(
  page: number = 1,
  limit: number = 20,
  contentType?: string
): Promise<ApiResult> {
  try {
    const headers = await getAuthHeaders();

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(contentType && { contentType }),
    });

    const response = await fetch(
      `${baseUrl()}/api/bookmark/user?${queryParams}`,
      { method: "GET", headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ AllMediaAPI: API Error:", response.status, errorText);

      // A 500 here is a known backend issue; degrade to empty rather than throw.
      if (response.status === 500) {
        apiWarn(
          "⚠️ AllMediaAPI: Backend server error (500) - returning empty saved content"
        );
        return {
          success: false,
          error: "Backend server error",
          data: { media: [] },
        };
      }

      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return { success: true, data: await response.json() };
  } catch (error) {
    console.error("❌ AllMediaAPI: Error getting saved content:", error);
    return { success: false, error: errorMessageOf(error) };
  }
}

export async function isContentBookmarked(
  contentId: string
): Promise<{ success: boolean; isBookmarked: boolean; error?: string }> {
  try {
    const response = await getSavedContent(1, 100);
    if (!response.success) return { success: false, isBookmarked: false };

    const savedContent = response.data?.data || [];
    const isBookmarked = savedContent.some(
      (bookmark: any) => bookmark.media._id === contentId
    );

    return { success: true, isBookmarked };
  } catch (error) {
    console.error("Error checking bookmark status:", error);
    return { success: false, isBookmarked: false };
  }
}
