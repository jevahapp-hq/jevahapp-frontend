import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  appMmkv,
  mmkvGetJson,
  mmkvSetJson,
} from "../../../src/shared/cache/mmkvStorage";
import { isLiteProfileActive } from "../../../src/shared/lite/liteProfile";
import type { CommentData } from "./types";
import { transformComment } from "./commentTransform";

/** In-memory comments cache — sync read on sheet open (IG/TikTok snappy reopen). */
const commentsMemoryCache = new Map<
  string,
  { comments: CommentData[]; totalComments: number; hasMore: boolean; at: number }
>();
/** Keep threads hot for long scrolling sessions */
const MEMORY_TTL_MS = 45 * 60 * 1000;
/** Disk survives process death — Lite 7d, full 48h */
const DISK_TTL_MS = () =>
  isLiteProfileActive() ? 7 * 24 * 60 * 60 * 1000 : 48 * 60 * 60 * 1000;
/** Cap RAM entries on Lite; disk stays aggressive */
const MAX_MEMORY_ENTRIES = () => (isLiteProfileActive() ? 12 : 40);

type DiskCommentsPayload = {
  comments: unknown[];
  totalComments?: number;
  hasMore: boolean;
  page?: number;
  timestamp: number;
};

function trimMemoryCache() {
  const max = MAX_MEMORY_ENTRIES();
  if (commentsMemoryCache.size <= max) return;
  const entries = [...commentsMemoryCache.entries()].sort(
    (a, b) => a[1].at - b[1].at
  );
  const drop = commentsMemoryCache.size - max;
  for (let i = 0; i < drop; i++) {
    commentsMemoryCache.delete(entries[i][0]);
  }
}

function memoryKey(contentId: string, sortBy: string) {
  return `${contentId}:${sortBy}`;
}

export function diskCommentsCacheKey(contentId: string, sortBy: string) {
  return `comments-cache-${contentId}-${sortBy}`;
}

export function peekCachedComments(
  contentId: string,
  sortBy: string = "newest"
): { comments: CommentData[]; totalComments: number; hasMore: boolean } | null {
  const hit = commentsMemoryCache.get(memoryKey(contentId, sortBy));
  if (!hit) return null;
  if (Date.now() - hit.at > MEMORY_TTL_MS) {
    commentsMemoryCache.delete(memoryKey(contentId, sortBy));
    return null;
  }
  return {
    comments: hit.comments,
    totalComments: hit.totalComments,
    hasMore: hit.hasMore,
  };
}

export function putCachedComments(
  contentId: string,
  sortBy: string,
  data: { comments: CommentData[]; totalComments: number; hasMore: boolean }
) {
  commentsMemoryCache.set(memoryKey(contentId, sortBy), {
    ...data,
    at: Date.now(),
  });
  trimMemoryCache();
}

function mapDiskComments(contentId: string, list: unknown[]): CommentData[] {
  return list.map((c: any) => {
    if (
      c?.userName ||
      (c?.username && (c?.comment != null || c?.content != null))
    ) {
      return {
        id: String(c?.id || c?._id || ""),
        contentId,
        userId: String(c?.userId || ""),
        username: String(c?.username || c?.userName || "User"),
        userAvatar: c?.userAvatar || c?.avatar || "",
        comment: String(c?.comment || c?.content || c?.text || ""),
        timestamp: String(
          c?.timestamp || c?.createdAt || new Date().toISOString()
        ),
        likes: Number(c?.likes || c?.likesCount || 0),
        isLiked: Boolean(c?.isLiked),
        imageUrl: c?.imageUrl || c?.image || undefined,
        mentions: Array.isArray(c?.mentions) ? c.mentions : undefined,
        isEdited: Boolean(c?.isEdited || c?.edited),
        editedAt: c?.editedAt ? String(c.editedAt) : undefined,
        replies: Array.isArray(c?.replies) ? c.replies : undefined,
      } as CommentData;
    }
    return transformComment(c, contentId);
  });
}

function payloadFromParsed(
  contentId: string,
  parsed: DiskCommentsPayload | null
): {
  comments: CommentData[];
  totalComments: number;
  hasMore: boolean;
} | null {
  if (!parsed) return null;
  const ts = Number(parsed.timestamp || 0);
  if (!ts || Date.now() - ts > DISK_TTL_MS()) return null;
  const list = Array.isArray(parsed.comments) ? parsed.comments : [];
  if (!list.length) return null;
  const comments = mapDiskComments(contentId, list);
  return {
    comments,
    totalComments: Number(parsed.totalComments ?? comments.length),
    hasMore: Boolean(parsed.hasMore),
  };
}

/** Sync disk peek for the comment open path (MMKV / in-memory fallback). */
export function peekDiskComments(
  contentId: string,
  sortBy: string = "newest"
): {
  comments: CommentData[];
  totalComments: number;
  hasMore: boolean;
} | null {
  const parsed = mmkvGetJson<DiskCommentsPayload>(
    diskCommentsCacheKey(contentId, sortBy)
  );
  const payload = payloadFromParsed(contentId, parsed);
  if (payload) putCachedComments(contentId, sortBy, payload);
  return payload;
}

export async function writeDiskCommentsCache(
  contentId: string,
  sortBy: string,
  data: {
    comments: unknown[];
    totalComments?: number;
    hasMore: boolean;
    page?: number;
  }
): Promise<void> {
  try {
    mmkvSetJson(diskCommentsCacheKey(contentId, sortBy), {
      comments: data.comments,
      totalComments: data.totalComments ?? data.comments.length,
      hasMore: data.hasMore,
      page: data.page ?? 1,
      timestamp: Date.now(),
    });
  } catch {
    // no-op
  }
}

/**
 * Read disk cache and hydrate memory. MMKV first (sync); one-time AsyncStorage migration.
 */
export async function hydrateCommentsCacheFromDisk(
  contentId: string,
  sortBy: string = "newest"
): Promise<{
  comments: CommentData[];
  totalComments: number;
  hasMore: boolean;
} | null> {
  const key = diskCommentsCacheKey(contentId, sortBy);
  const fromMmkv = peekDiskComments(contentId, sortBy);
  if (fromMmkv) return fromMmkv;

  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiskCommentsPayload;
    const payload = payloadFromParsed(contentId, parsed);
    if (!payload) {
      void AsyncStorage.removeItem(key);
      return null;
    }
    mmkvSetJson(key, parsed);
    void AsyncStorage.removeItem(key);
    putCachedComments(contentId, sortBy, payload);
    return payload;
  } catch {
    return null;
  }
}

export async function invalidateDiskCommentsCache(
  contentId: string,
  sortBy: string
): Promise<void> {
  const key = diskCommentsCacheKey(contentId, sortBy);
  try {
    appMmkv.remove(key);
  } catch {
    // no-op
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // no-op
  }
}
