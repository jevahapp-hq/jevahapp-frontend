/**
 * Soft-fail ranking client — For You + Music For You + feed events.
 * Never blocks playback. Uses origin base + `/api/...` (repo convention).
 */
import { AppState, type AppStateStatus } from "react-native";
import { getApiBaseUrl } from "../../../app/utils/environmentManager";
import TokenUtils from "../../../app/utils/tokenUtils";

export type FeedEventType =
  | "impression"
  | "watch_time"
  | "skip"
  | "like"
  | "save"
  | "share";

export type FeedEvent = {
  contentId: string;
  contentType?: string;
  eventType: FeedEventType;
  watchMs?: number;
  progressPct?: number;
  sessionId?: string;
  source?: string;
};

type ForYouPage = {
  items: any[];
  media: any[];
  cursor: string | null;
  hasMore: boolean;
};

type MusicForYouPage = {
  tracks: any[];
  items: any[];
  cursor: string | null;
  hasMore: boolean;
  lane: string;
};

const queue: FeedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
let appStateSub: { remove: () => void } | null = null;

function apiRoot(): string {
  return `${getApiBaseUrl().replace(/\/+$/, "")}/api`;
}

export function resetFeedSession() {
  sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getFeedSessionId() {
  return sessionId;
}

export function enqueueFeedEvent(e: FeedEvent) {
  if (!e?.contentId) return;
  queue.push({ ...e, sessionId: e.sessionId ?? sessionId });
  if (queue.length >= 12) {
    void flushFeedEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushFeedEvents();
    }, 2500);
  }
}

export async function flushFeedEvents(): Promise<void> {
  if (!queue.length) return;
  const batch = queue.splice(0, 50);
  try {
    const token = await TokenUtils.getAuthToken();
    if (!token) return;
    const res = await fetch(`${apiRoot()}/feed/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ events: batch }),
    });
    if (!res.ok && __DEV__) {
      console.warn("⚠️ feed/events", res.status);
    }
  } catch {
    // soft-fail — drop batch; never toast
  }
}

/** Call once from root overlays — flush on background. */
export function installFeedEventLifecycle() {
  if (appStateSub) return;
  const onChange = (next: AppStateStatus) => {
    if (next === "background" || next === "inactive") {
      void flushFeedEvents();
    }
  };
  appStateSub = AppState.addEventListener("change", onChange);
}

export function uninstallFeedEventLifecycle() {
  appStateSub?.remove();
  appStateSub = null;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  void flushFeedEvents();
}

export async function fetchForYou(
  cursor?: string | null,
  limit?: number
): Promise<ForYouPage> {
  const token = await TokenUtils.getAuthToken();
  if (!token) throw new Error("for-you auth required");

  const { getLiteRequestMeta } = await import("../lite/liteProfile");
  const liteMeta = getLiteRequestMeta(limit ?? 20);
  const pageLimit = liteMeta.lite ? liteMeta.limit : (limit ?? liteMeta.limit);

  const q = new URLSearchParams({
    limit: String(pageLimit),
    ...liteMeta.query,
  });
  if (cursor) q.set("cursor", cursor);

  const res = await fetch(`${apiRoot()}/feed/for-you?${q}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...liteMeta.headers,
    },
  });
  if (!res.ok) throw new Error(`for-you ${res.status}`);
  const json = await res.json();
  const data = json?.data ?? json;
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.media)
      ? data.media
      : [];
  return {
    items,
    media: Array.isArray(data?.media) ? data.media : items,
    cursor: data?.cursor ?? null,
    hasMore: Boolean(data?.hasMore),
  };
}

export async function fetchMusicForYou(opts?: {
  cursor?: string | null;
  limit?: number;
  lane?: "artist" | "curated";
}): Promise<MusicForYouPage> {
  const token = await TokenUtils.getAuthToken();
  if (!token) throw new Error("music-for-you auth required");

  const { getLiteRequestMeta } = await import("../lite/liteProfile");
  const liteMeta = getLiteRequestMeta(opts?.limit ?? 20);
  const pageLimit = liteMeta.lite
    ? liteMeta.limit
    : (opts?.limit ?? liteMeta.limit);

  const q = new URLSearchParams({
    limit: String(pageLimit),
    lane: opts?.lane ?? "artist",
    ...liteMeta.query,
  });
  if (opts?.cursor) q.set("cursor", opts.cursor);

  const res = await fetch(`${apiRoot()}/feed/music-for-you?${q}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...liteMeta.headers,
    },
  });
  if (!res.ok) throw new Error(`music-for-you ${res.status}`);
  const json = await res.json();
  const data = json?.data ?? json;
  const tracks = Array.isArray(data?.tracks)
    ? data.tracks
    : Array.isArray(data?.items)
      ? data.items
      : [];
  return {
    tracks,
    items: Array.isArray(data?.items) ? data.items : tracks,
    cursor: data?.cursor ?? null,
    hasMore: Boolean(data?.hasMore),
    lane: String(data?.lane || opts?.lane || "artist"),
  };
}
