import type { CacheManager } from "../../cache/CacheManager";
import type { ApiResult, PaginationMeta, RequestFn } from "./types";

function emptyPagination(page: number, limit: number): PaginationMeta {
  return { page, limit, total: 0, totalPages: 0, hasMore: false };
}

/**
 * Posts, media and videos share one response shape that differs only in the
 * array's key, and the backend may return it wrapped in `data` or flat.
 */
async function fetchUserCollection<K extends string>(
  request: RequestFn,
  path: string,
  key: K,
  page: number,
  limit: number,
  label: string
): Promise<ApiResult<{ [P in K]: any[] } & { pagination: any }>> {
  try {
    const result = await request(path, { cache: true });

    if (result.data) {
      return { success: true, data: result.data };
    }

    const items = result[key];
    if (items) {
      return {
        success: true,
        data: {
          [key]: items,
          pagination:
            result.pagination || {
              page,
              limit,
              total: items?.length || 0,
              totalPages: 1,
              hasMore: false,
            },
        } as any,
      };
    }

    return {
      success: true,
      data: { [key]: [], pagination: emptyPagination(page, limit) } as any,
    };
  } catch (error: any) {
    console.error(`Error fetching user ${label}:`, error);
    return {
      success: false,
      error: error.message || `Failed to fetch ${label}`,
    };
  }
}

/** GET /api/users/:userId/posts */
export function getUserPosts(
  request: RequestFn,
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResult<{ posts: any[]; pagination: any }>> {
  return fetchUserCollection(
    request,
    `/users/${userId}/posts?page=${page}&limit=${limit}`,
    "posts",
    page,
    limit,
    "posts"
  );
}

/** GET /api/users/:userId/media */
export function getUserMedia(
  request: RequestFn,
  userId: string,
  page: number = 1,
  limit: number = 20,
  type?: "image" | "video"
): Promise<ApiResult<{ media: any[]; pagination: any }>> {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (type) queryParams.append("type", type);

  return fetchUserCollection(
    request,
    `/users/${userId}/media?${queryParams.toString()}`,
    "media",
    page,
    limit,
    "media"
  );
}

/** GET /api/users/:userId/videos */
export function getUserVideos(
  request: RequestFn,
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResult<{ videos: any[]; pagination: any }>> {
  return fetchUserCollection(
    request,
    `/users/${userId}/videos?page=${page}&limit=${limit}`,
    "videos",
    page,
    limit,
    "videos"
  );
}

/** GET /api/users/:userId/analytics */
export async function getUserAnalytics(
  request: RequestFn,
  userId: string
): Promise<ApiResult<any>> {
  try {
    const result = await request(`/users/${userId}/analytics`, {
      cache: true,
      cacheDuration: 2 * 60 * 1000,
    });

    if (result.data) return { success: true, data: result.data };
    // Some deployments return the analytics object directly.
    if (result.posts || result.likes) return { success: true, data: result };
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Error fetching user analytics:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch analytics",
    };
  }
}

/** POST /api/auth/logout — cache is cleared even when the call fails. */
export async function logout(
  request: RequestFn,
  cache: CacheManager
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const result = await request("/auth/logout", { method: "POST" });
    cache.clear();
    return {
      success: true,
      message: result.message || "Logged out successfully",
    };
  } catch (error: any) {
    console.error("Error logging out:", error);
    cache.clear();
    return { success: false, error: error.message || "Failed to logout" };
  }
}
