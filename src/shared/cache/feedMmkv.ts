/**
 * Sync first-page feed cache (instant-on).
 * Partitioned by lite|full so mode toggles don't poison cold start.
 * Lite uses longer disk TTL (aggressive cache, RAM still capped elsewhere).
 */
import type { MediaItem } from "../types";
import {
  FEED_STALE_MS,
  getFeedDiskItemCap,
  getFeedDiskMaxMs,
} from "../config/feedCachePolicy";
import { isLiteProfileActive } from "../lite/liteProfile";
import { appMmkv, mmkvGetJson, mmkvSetJson } from "./mmkvStorage";

const FEED_PAGE_PREFIX = "feed-page-v2:";
const RQ_FEED_KEY = "rq-all-content-seed-v2";
/** Pre-v2 keys (may contain poisoned Anonymous User speakers). */
const LEGACY_FEED_PAGE_PREFIX = "feed-page:";
const LEGACY_RQ_FEED_KEY = "rq-all-content-seed";

export type FeedPageSeed = {
  media: MediaItem[];
  total: number;
  fetchedAt: number;
  contentType: string;
  useAuth: boolean;
  limit: number;
  profile?: "lite" | "full";
  cursor?: string | null;
  hasMore?: boolean;
};

function profileTag(): "lite" | "full" {
  return isLiteProfileActive() ? "lite" : "full";
}

function pageKey(
  contentType: string,
  useAuth: boolean,
  profile: "lite" | "full" = profileTag()
): string {
  return `${FEED_PAGE_PREFIX}${contentType}:${useAuth ? "auth" : "public"}:${profile}`;
}

/** Pre-partition legacy key (migration read). */
function legacyPageKey(contentType: string, useAuth: boolean): string {
  return `${FEED_PAGE_PREFIX}${contentType}:${useAuth ? "auth" : "public"}`;
}

function isPaintable(fetchedAt: number): boolean {
  return Date.now() - fetchedAt <= getFeedDiskMaxMs();
}

function isPlaceholderSpeaker(name?: string | null): boolean {
  const t = String(name || "").trim();
  if (!t) return true;
  return /^(anonymous(\s+user)?|unknown|no speaker|user)$/i.test(t);
}

/** Strip poisoned author fields from disk seeds (empty uploadedBy / Anonymous speaker). */
export function sanitizeFeedMedia(media: MediaItem[]): MediaItem[] {
  return media.map((item) => {
    let next = item;
    const speaker = (item as any)?.speaker;
    if (typeof speaker === "string" && isPlaceholderSpeaker(speaker)) {
      next = { ...next, speaker: undefined as any };
    }
    const uploadedBy = (item as any)?.uploadedBy;
    if (uploadedBy && typeof uploadedBy === "object") {
      const hasName =
        Boolean(uploadedBy.firstName) ||
        Boolean(uploadedBy.lastName) ||
        Boolean(uploadedBy.fullName) ||
        Boolean(uploadedBy.name) ||
        Boolean(uploadedBy.username);
      const id = uploadedBy._id || uploadedBy.id;
      if (!hasName && id && /^[0-9a-fA-F]{24}$/.test(String(id))) {
        next = { ...next, uploadedBy: String(id) as any };
      }
    }
    return next;
  });
}

export function getFeedPageSync(
  contentType: string,
  useAuth: boolean
): FeedPageSeed | null {
  const profile = profileTag();
  const entry =
    mmkvGetJson<FeedPageSeed>(pageKey(contentType, useAuth, profile)) ||
    mmkvGetJson<FeedPageSeed>(legacyPageKey(contentType, useAuth)) ||
    mmkvGetJson<FeedPageSeed>(
      `${LEGACY_FEED_PAGE_PREFIX}${contentType}:${useAuth ? "auth" : "public"}:${profile}`
    ) ||
    mmkvGetJson<FeedPageSeed>(
      `${LEGACY_FEED_PAGE_PREFIX}${contentType}:${useAuth ? "auth" : "public"}`
    );
  if (!entry?.media?.length) return null;
  if (!isPaintable(entry.fetchedAt)) return null;
  return { ...entry, media: sanitizeFeedMedia(entry.media) };
}

export function setFeedPageSync(seed: FeedPageSeed): void {
  const profile = profileTag();
  const cap = getFeedDiskItemCap();
  const media =
    seed.media.length > cap ? seed.media.slice(0, cap) : seed.media;
  const payload: FeedPageSeed = { ...seed, media, profile };
  mmkvSetJson(pageKey(seed.contentType, seed.useAuth, profile), payload);
  if (seed.contentType === "ALL") {
    mmkvSetJson(`${RQ_FEED_KEY}:${profile}`, payload);
    mmkvSetJson(RQ_FEED_KEY, payload);
  }
}

export function getRqFeedSeedSync(): FeedPageSeed | null {
  const profile = profileTag();
  const entry =
    mmkvGetJson<FeedPageSeed>(`${RQ_FEED_KEY}:${profile}`) ||
    mmkvGetJson<FeedPageSeed>(RQ_FEED_KEY) ||
    mmkvGetJson<FeedPageSeed>(`${LEGACY_RQ_FEED_KEY}:${profile}`) ||
    mmkvGetJson<FeedPageSeed>(LEGACY_RQ_FEED_KEY);
  if (!entry?.media?.length) return null;
  if (!isPaintable(entry.fetchedAt)) return null;
  return { ...entry, media: sanitizeFeedMedia(entry.media) };
}

/** Legacy instant-on video list helpers (compat). */
const LEGACY_VIDEO_KEY = "video-feed-data";
const LEGACY_TS_KEY = "video-feed-timestamp";

export function getCachedVideosSync(): MediaItem[] | null {
  try {
    const data = appMmkv.getString(LEGACY_VIDEO_KEY);
    const timestamp = appMmkv.getNumber(LEGACY_TS_KEY);
    if (!data || timestamp == null) {
      const seed = getFeedPageSync("ALL", false) || getFeedPageSync("ALL", true);
      return seed?.media ?? null;
    }
    if (Date.now() - timestamp > FEED_STALE_MS) return null;
    const parsed = JSON.parse(data) as { videos?: MediaItem[] };
    return parsed.videos || null;
  } catch {
    return null;
  }
}

export function cacheVideos(videos: MediaItem[]): void {
  try {
    appMmkv.set(
      LEGACY_VIDEO_KEY,
      JSON.stringify({ videos, timestamp: Date.now() })
    );
    appMmkv.set(LEGACY_TS_KEY, Date.now());
    setFeedPageSync({
      media: videos,
      total: videos.length,
      fetchedAt: Date.now(),
      contentType: "ALL",
      useAuth: false,
      limit: videos.length || 12,
    });
  } catch {
    // ignore
  }
}

export function clearVideoCache(): void {
  try {
    appMmkv.remove(LEGACY_VIDEO_KEY);
    appMmkv.remove(LEGACY_TS_KEY);
  } catch {
    // ignore
  }
}
