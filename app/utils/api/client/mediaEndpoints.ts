import { UserProfileCache } from "../../cache/UserProfileCache";
import type { RequestFn } from "./types";

export async function getMediaList(
  request: RequestFn,
  params: {
    contentType?: string;
    search?: string;
    limit?: number;
    page?: number;
  } = {}
): Promise<{ media: any[]; total: number }> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, value.toString());
  });

  const result = await request(`/api/media?${queryParams.toString()}`, {
    cache: true,
    cacheDuration: 2 * 60 * 1000,
  });

  // Enrich media array with cached user data (fullname and avatar)
  if (result.media && Array.isArray(result.media)) {
    result.media = UserProfileCache.enrichContentArray(result.media);
  }

  return result;
}

export function getMediaById(request: RequestFn, id: string): Promise<any> {
  return request(`/api/media/${id}`, { cache: true });
}

export function toggleFavorite(
  request: RequestFn,
  contentId: string
): Promise<{ isFavorite: boolean }> {
  return request(`/api/content/${contentId}/favorite`, { method: "POST" });
}

export function saveContent(
  request: RequestFn,
  contentId: string
): Promise<{ isSaved: boolean }> {
  return request(`/api/content/${contentId}/save`, { method: "POST" });
}

export function getContentStats(
  request: RequestFn,
  contentId: string
): Promise<any> {
  return request(`/api/content/${contentId}/stats`, {
    cache: true,
    cacheDuration: 60 * 1000,
  });
}
