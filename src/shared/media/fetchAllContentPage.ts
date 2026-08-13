import { useContentCacheStore } from "../../../app/store/useContentCacheStore";
import { UserProfileCache } from "../../../app/utils/cache/UserProfileCache";
import { mediaApi } from "../../core/api/MediaApi";
import { getFeedPageSync, getRqFeedSeedSync, sanitizeFeedMedia } from "../cache/feedMmkv";
import {
  FEED_PAGE_SIZE,
  LEGACY_ALL_FIRST_KEY,
  feedZustandFirstPageKey,
  getFeedDiskItemCap,
  getFeedDiskMaxMs,
} from "../config/feedCachePolicy";
import { shouldFetchServerForYou } from "../feed/feedFeatureFlags";
import { fetchForYou } from "../feed/feedRanker";
import { isLiteProfileActive } from "../lite/liteProfile";
import type { MediaItem } from "../types";
import { transformApiResponseToMediaItem } from "../utils";
import { syncMediaStatsToInteractionStore } from "./syncMediaStats";

export type AllContentPageResult = {
  media: MediaItem[];
  total: number;
  page: number;
  limit: number;
  /** Cursor pagination when source is server For You */
  cursor?: string | null;
  hasMore?: boolean;
  source?: "for_you" | "all_content";
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
  const cap = getFeedDiskItemCap();
  const store = useContentCacheStore.getState();
  const existing = store.get(key);
  const incomingPage = result.page ?? 1;
  let items = result.media;

  if (
    isLiteProfileActive() &&
    incomingPage > 1 &&
    existing?.items?.length
  ) {
    const seen = new Set(
      existing.items.map((item) => String(item._id || (item as any).id || ""))
    );
    const merged = [...existing.items];
    for (const item of result.media) {
      const id = String(item._id || (item as any).id || "");
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      merged.push(item);
      if (merged.length >= cap) break;
    }
    items = merged.length > cap ? merged.slice(0, cap) : merged;
  } else if (items.length > cap) {
    items = items.slice(0, cap);
  }

  const entry = {
    items,
    page: 1,
    limit: result.limit,
    total: Math.max(result.total ?? 0, items.length),
    fetchedAt: Date.now(),
    cursor: result.cursor,
    hasMore: result.hasMore,
  };
  store.set(key, entry);
  // Keep legacy key warm for older readers / login preload
  if (contentType === "ALL") {
    store.set(LEGACY_ALL_FIRST_KEY, entry);
  }
}

function isPaintableSeed(fetchedAt?: number): boolean {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt <= getFeedDiskMaxMs();
}

export function readSeededFirstPage(
  contentType: string,
  useAuth: boolean
): {
  media: MediaItem[];
  total: number;
  fetchedAt?: number;
  cursor?: string | null;
  hasMore?: boolean;
} | undefined {
  const store = useContentCacheStore.getState();
  const primary = store.get(feedZustandFirstPageKey(contentType, useAuth));
  if (primary?.items?.length && isPaintableSeed(primary.fetchedAt)) {
    const media = UserProfileCache.enrichContentArray(
      sanitizeFeedMedia(primary.items)
    );
    return {
      media,
      total: primary.total ?? 0,
      fetchedAt: primary.fetchedAt,
      cursor: primary.cursor,
      hasMore: primary.hasMore,
    };
  }
  // Legacy unpartitioned keys (pre lite|full suffix)
  const legacyAuth = store.get(
    `${contentType || "ALL"}:first:${useAuth ? "auth" : "public"}`
  );
  if (legacyAuth?.items?.length && isPaintableSeed(legacyAuth.fetchedAt)) {
    return {
      media: UserProfileCache.enrichContentArray(
        sanitizeFeedMedia(legacyAuth.items)
      ),
      total: legacyAuth.total ?? 0,
      fetchedAt: legacyAuth.fetchedAt,
    };
  }
  if (contentType === "ALL") {
    const legacy = store.get(LEGACY_ALL_FIRST_KEY);
    if (legacy?.items?.length && isPaintableSeed(legacy.fetchedAt)) {
      return {
        media: UserProfileCache.enrichContentArray(
          sanitizeFeedMedia(legacy.items)
        ),
        total: legacy.total ?? 0,
        fetchedAt: legacy.fetchedAt,
      };
    }
  }
  // Sync MMKV fallback (instant-on path) if Zustand hydrate raced
  const mmkv = getFeedPageSync(contentType, useAuth);
  if (mmkv?.media?.length) {
    return {
      media: UserProfileCache.enrichContentArray(mmkv.media),
      total: mmkv.total,
      fetchedAt: mmkv.fetchedAt,
      cursor: mmkv.cursor,
      hasMore: mmkv.hasMore,
    };
  }
  // Prefer any paintable seed over a blank LoadingState (auth/public mismatch).
  if (useAuth) {
    const pub =
      getFeedPageSync(contentType, false) ||
      (contentType === "ALL" ? getRqFeedSeedSync() : null);
    if (pub?.media?.length) {
      return {
        media: UserProfileCache.enrichContentArray(pub.media),
        total: pub.total,
        fetchedAt: pub.fetchedAt,
        cursor: pub.cursor,
        hasMore: pub.hasMore,
      };
    }
  }
  return undefined;
}

export async function fetchAllContentPage(options: {
  contentType?: string;
  page?: number;
  limit?: number;
  useAuth?: boolean;
  /** Cursor from previous For You page (null/undefined = first page) */
  cursor?: string | null;
  /** Force chronological even when For You flag is on */
  forceChronological?: boolean;
}): Promise<AllContentPageResult> {
  const contentType = options.contentType ?? "ALL";
  const page = options.page ?? 1;
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const useAuth = Boolean(options.useAuth);

  const tryForYou =
    !options.forceChronological &&
    shouldFetchServerForYou(contentType, useAuth) &&
    (page === 1 || options.cursor != null);

  if (tryForYou) {
    try {
      const ranked = await fetchForYou(
        page === 1 && options.cursor == null ? null : options.cursor ?? null,
        limit
      );
      const raw = ranked.media?.length ? ranked.media : ranked.items;
      // Sync enrich only — don't block first paint on profile network fetches
      const enrichedMedia =
        raw.length === 0 ? raw : UserProfileCache.enrichContentArray(raw);
      const transformedMedia = enrichedMedia
        .map(transformApiResponseToMediaItem)
        .filter((item): item is MediaItem => item !== null);

      const result: AllContentPageResult = {
        media: transformedMedia,
        total: ranked.hasMore
          ? transformedMedia.length + limit
          : transformedMedia.length,
        page,
        limit,
        cursor: ranked.cursor,
        hasMore: ranked.hasMore,
        source: "for_you",
      };

      syncMediaStatsToInteractionStore(result.media);
      if (page === 1 && options.cursor == null) {
        seedContentCache(contentType, useAuth, result);
      } else if (isLiteProfileActive() && result.media.length) {
        seedContentCache(contentType, useAuth, result);
      }

      // Background: fill missing avatars/names without delaying return
      if (raw.length > 0) {
        void UserProfileCache.enrichContentArrayBatch(raw).catch(() => {});
      }

      return result;
    } catch (err) {
      if (__DEV__) {
        console.warn("⚠️ for-you failed; falling back to all-content", err);
      }
      // fall through to chronological
    }
  }

  const apiContentType = normalizeListContentType(contentType);
  const profile = isLiteProfileActive() ? "lite" : undefined;
  const listOpts = {
    page,
    limit,
    contentType: apiContentType !== "ALL" ? apiContentType : undefined,
    ...(profile ? { profile } : {}),
  };

  const response = useAuth
    ? await mediaApi.getAllContentWithAuth(listOpts)
    : await mediaApi.getAllContentPublic(listOpts);

  if (!response.success) {
    throw new Error(response.error || "Failed to fetch content");
  }

  const mediaArr = response.media || [];
  // Sync enrich for instant list; batch fetch profiles in background
  const enrichedMedia =
    mediaArr.length === 0
      ? mediaArr
      : UserProfileCache.enrichContentArray(mediaArr);

  const transformedMedia = enrichedMedia
    .map(transformApiResponseToMediaItem)
    .filter((item): item is MediaItem => item !== null);

  const result: AllContentPageResult = {
    media: transformedMedia,
    total: response.total || response.pagination?.total || 0,
    page,
    limit,
    source: "all_content",
    hasMore:
      transformedMedia.length >= limit &&
      (response.total || 0) > page * limit,
  };

  syncMediaStatsToInteractionStore(result.media);

  if (page === 1) {
    seedContentCache(contentType, useAuth, result);
  } else if (isLiteProfileActive() && result.media.length) {
    seedContentCache(contentType, useAuth, result);
  }

  if (mediaArr.length > 0) {
    void UserProfileCache.enrichContentArrayBatch(mediaArr).catch(() => {});
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
