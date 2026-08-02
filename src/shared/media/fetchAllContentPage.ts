import { useContentCacheStore } from "../../../app/store/useContentCacheStore";
import { UserProfileCache } from "../../../app/utils/cache/UserProfileCache";
import { mediaApi } from "../../core/api/MediaApi";
import {
  FEED_PAGE_SIZE,
  LEGACY_ALL_FIRST_KEY,
  feedZustandFirstPageKey,
} from "../config/feedCachePolicy";
import type { MediaItem } from "../types";
import { transformApiResponseToMediaItem } from "../utils";
import { syncMediaStatsToInteractionStore } from "./syncMediaStats";

export type AllContentPageResult = {
  media: MediaItem[];
  total: number;
  page: number;
  limit: number;
};

/** Map Home tab filters to API list `contentType` values. */
export function normalizeListContentType(contentType: string): string {
  const t = (contentType || "ALL").toLowerCase();
  if (t === "all") return "ALL";
  if (t === "e-books" || t === "ebook" || t === "ebooks") return "books";
  if (t === "video") return "videos";
  if (t === "audio") return "music";
  return contentType;
}

export function seedContentCache(
  contentType: string,
  useAuth: boolean,
  result: AllContentPageResult
): void {
  const key = feedZustandFirstPageKey(contentType, useAuth);
  const entry = {
    items: result.media,
    page: 1,
    limit: result.limit,
    total: result.total,
    fetchedAt: Date.now(),
  };
  useContentCacheStore.getState().set(key, entry);
  // Keep legacy key warm for older readers / login preload
  if (contentType === "ALL") {
    useContentCacheStore.getState().set(LEGACY_ALL_FIRST_KEY, entry);
  }
}

export function readSeededFirstPage(
  contentType: string,
  useAuth: boolean
): { media: MediaItem[]; total: number } | undefined {
  const store = useContentCacheStore.getState();
  const primary = store.get(feedZustandFirstPageKey(contentType, useAuth));
  if (primary?.items?.length) {
    return { media: primary.items, total: primary.total ?? 0 };
  }
  if (contentType === "ALL") {
    const legacy = store.get(LEGACY_ALL_FIRST_KEY);
    if (legacy?.items?.length) {
      return { media: legacy.items, total: legacy.total ?? 0 };
    }
  }
  return undefined;
}

export async function fetchAllContentPage(options: {
  contentType?: string;
  page?: number;
  limit?: number;
  useAuth?: boolean;
}): Promise<AllContentPageResult> {
  const contentType = options.contentType ?? "ALL";
  const page = options.page ?? 1;
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const useAuth = Boolean(options.useAuth);
  const apiContentType = normalizeListContentType(contentType);
  const listOpts = {
    page,
    limit,
    contentType: apiContentType !== "ALL" ? apiContentType : undefined,
  };

  const response = useAuth
    ? await mediaApi.getAllContentWithAuth(listOpts)
    : await mediaApi.getAllContentPublic(listOpts);

  if (!response.success) {
    throw new Error(response.error || "Failed to fetch content");
  }

  const mediaArr = response.media || [];
  const enrichedMedia =
    mediaArr.length === 0
      ? mediaArr
      : useAuth
        ? await UserProfileCache.enrichContentArrayBatch(mediaArr)
        : UserProfileCache.enrichContentArray(mediaArr);

  const transformedMedia = enrichedMedia
    .map(transformApiResponseToMediaItem)
    .filter((item): item is MediaItem => item !== null);

  const result: AllContentPageResult = {
    media: transformedMedia,
    total: response.total || response.pagination?.total || 0,
    page,
    limit,
  };

  syncMediaStatsToInteractionStore(result.media);

  if (page === 1) {
    seedContentCache(contentType, useAuth, result);
  }

  return result;
}

/** Warmup / public prefetch helper (page 1). */
export async function fetchAllContentPublic(
  contentType: string = "ALL"
): Promise<{ media: MediaItem[]; total: number }> {
  const result = await fetchAllContentPage({
    contentType,
    page: 1,
    limit: FEED_PAGE_SIZE,
    useAuth: false,
  });
  return { media: result.media, total: result.total };
}
