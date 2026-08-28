import { apiLog, apiWarn, baseUrl, errorMessageOf, getAuthHeaders } from "./http";
import {
  AllMediaResponse,
  DefaultContentResult,
  EMPTY_PAGINATION,
} from "./types";

export type MediaSort =
  | "views"
  | "comments"
  | "likes"
  | "reads"
  | "createdAt"
  | "updatedAt";

export interface GetAllMediaParams {
  sort?: MediaSort;
  contentType?: "videos" | "music" | "books" | "live";
  category?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export async function getAllMedia(
  params: GetAllMediaParams = {}
): Promise<AllMediaResponse> {
  try {
    const headers = await getAuthHeaders();

    const queryParams = new URLSearchParams();
    if (params.sort) queryParams.append("sort", params.sort);
    if (params.contentType)
      queryParams.append("contentType", params.contentType);
    if (params.category) queryParams.append("category", params.category);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);

    const url = `${baseUrl()}/api/media?${queryParams.toString()}`;

    const response = await fetch(url, { method: "GET", headers });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (__DEV__) console.error("Error fetching all media:", error);
    throw error;
  }
}

export function getTrendingMedia(limit = 20): Promise<AllMediaResponse> {
  return getAllMedia({ sort: "views", limit });
}

export function getMostCommentedMedia(limit = 20): Promise<AllMediaResponse> {
  return getAllMedia({ sort: "comments", limit });
}

export function getMostLikedMedia(limit = 20): Promise<AllMediaResponse> {
  return getAllMedia({ sort: "likes", limit });
}

export function getLatestMedia(limit = 20): Promise<AllMediaResponse> {
  return getAllMedia({ sort: "createdAt", limit });
}

export function searchAllMedia(
  searchTerm: string,
  limit = 20
): Promise<AllMediaResponse> {
  return getAllMedia({ search: searchTerm, limit });
}

export function mapContentType(
  contentType: string
): "video" | "audio" | "image" {
  switch (contentType?.toLowerCase()) {
    case "videos":
    case "video":
      return "video";
    case "music":
    case "audio":
      return "audio";
    case "image":
    case "images":
      return "image";
    default:
      return "video";
  }
}

export interface DefaultContentParams {
  page?: number;
  limit?: number;
  contentType?: string;
}

function emptyDefaultContent(error: string): DefaultContentResult {
  return {
    success: false,
    error,
    data: { content: [], pagination: { ...EMPTY_PAGINATION } },
  };
}

/** Used when `/api/media/default` is unavailable on the deployed backend. */
async function fallbackToRegularMedia(
  params: DefaultContentParams
): Promise<DefaultContentResult> {
  try {
    if (__DEV__) apiLog("🔄 Using fallback: trying latest media endpoint");

    const response = await getLatestMedia(params.limit || 10);

    const transformedContent = (response.media || []).map((item: any) => ({
      _id: item._id,
      title: item.title || "Untitled",
      description: item.description || "",
      mediaUrl: item.fileUrl || item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl || item.imageUrl?.uri,
      contentType: mapContentType(item.contentType),
      duration: item.duration || null,
      author: {
        _id: item.uploadedBy?._id || item.uploadedBy,
        firstName: item.uploadedBy?.firstName || "Unknown",
        lastName: item.uploadedBy?.lastName || "User",
        avatar: item.uploadedBy?.avatar || null,
      },
      likeCount: item.favoriteCount || item.likeCount || 0,
      commentCount: item.commentCount || 0,
      shareCount: item.shareCount || 0,
      viewCount: item.viewCount || 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      success: true,
      data: {
        content: transformedContent,
        pagination: response.pagination || { ...EMPTY_PAGINATION },
      },
    };
  } catch (error) {
    if (__DEV__) console.error("❌ Fallback also failed:", error);
    return emptyDefaultContent(
      error instanceof Error ? error.message : "Both endpoints failed"
    );
  }
}

function isNetworkError(message: string): boolean {
  return (
    message.includes("Network request failed") ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError")
  );
}

/** Dev-only throttle so an offline device does not spam the console. */
function logNetworkErrorOnce(): void {
  if (!__DEV__) return;
  const errorKey = `network_error_default_content_${Date.now()}`;
  const g = global as any;
  if (!g.__loggedNetworkErrors) g.__loggedNetworkErrors = new Set();
  if (g.__loggedNetworkErrors.has(errorKey)) return;
  g.__loggedNetworkErrors.add(errorKey);
  setTimeout(() => g.__loggedNetworkErrors?.delete(errorKey), 10000);
  apiWarn(
    "⚠️ Network error fetching default content (offline or server unreachable)"
  );
}

export async function getDefaultContent(
  params: DefaultContentParams = {}
): Promise<DefaultContentResult> {
  try {
    const headers = await getAuthHeaders();

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.contentType)
      queryParams.append("contentType", params.contentType);

    const queryString = queryParams.toString();
    const fullUrl = `${baseUrl()}/api/media/default${
      queryString ? `?${queryString}` : ""
    }`;

    if (__DEV__) {
      apiLog("🌐 Fetching default content from:", fullUrl);
      apiLog("📋 Request params:", params);
    }

    const response = await fetch(fullUrl, { method: "GET", headers });

    if (__DEV__) apiLog("📡 Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      if (__DEV__) console.error("❌ API Error Response:", errorText);

      // Older deployments do not expose /api/media/default.
      if (response.status === 404 || response.status === 400) {
        if (__DEV__) {
          apiLog(
            "🔄 Default endpoint not found or invalid, trying regular media endpoint..."
          );
        }
        return fallbackToRegularMedia(params);
      }

      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (__DEV__) apiLog("✅ API Response data:", data);

    if (!data.success) {
      throw new Error(data.message || "Failed to fetch default content");
    }

    return { success: true, data: data.data };
  } catch (error) {
    const message = errorMessageOf(error);

    if (isNetworkError(message)) {
      logNetworkErrorOnce();
      // Return empty gracefully so the UI can fall back to cached data.
      return emptyDefaultContent("Network unavailable");
    }

    if (__DEV__) console.error("❌ Error fetching default content:", error);
    return emptyDefaultContent(message);
  }
}
