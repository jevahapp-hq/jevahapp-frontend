import type { VideoPlayer, VideoThumbnail } from "expo-video";
import { useEffect, useState } from "react";
import { fixOverEncodedMediaUrl } from "../../../shared/utils/videoUrlManager";
import { FEED_VIDEO_START_POSITION_SECONDS } from "./feedVideoConfig";
import { isLiveVideoPlayer, readPlayerCurrentTimeSec } from "./safeVideoPlayer";

function snapshotKey(url: string | null | undefined): string | null {
  if (!url) return null;
  return fixOverEncodedMediaUrl(url);
}

/**
 * Last-frame snapshots, keyed by video URL.
 *
 * When a feed card loses its decoder, we overlay the frame it paused on
 * so scrolling back does not flash a black VideoView.
 */


/** Bounds native bitmap memory: ~480p RGBA ≈ 1.6MB × 16 ≈ 26MB worst case. */
const MAX_ENTRIES = 16;
const SNAPSHOT_MAX_WIDTH = 480;
/**
 * Never run more than this many native frame extractions at once — a fast
 * scroll can freeze several videos in the same tick, and an unbounded
 * burst of AVAssetImageGenerator/MediaMetadataRetriever work spikes
 * memory (dangerous inside Expo Go). Extra captures wait in a queue.
 */
const MAX_CONCURRENT_CAPTURES = 1;

const snapshots = new Map<string, VideoThumbnail>();
const inFlight = new Set<string>();
const listeners = new Set<(url: string) => void>();
const pending: Array<{
  url: string;
  player: VideoPlayer;
  timeSec?: number;
}> = [];

function notifySnapshot(url: string) {
  listeners.forEach((listener) => {
    try {
      listener(url);
    } catch {
      // no-op — a broken subscriber must not kill capture
    }
  });
}

export function getVideoFrameSnapshot(url: string | null): VideoThumbnail | null {
  const key = snapshotKey(url);
  if (!key) return null;
  return snapshots.get(key) ?? null;
}

function rememberSnapshot(url: string, thumbnail: VideoThumbnail) {
  snapshots.delete(url);
  snapshots.set(url, thumbnail);
  while (snapshots.size > MAX_ENTRIES) {
    const oldest = snapshots.keys().next().value;
    if (oldest === undefined) break;
    snapshots.delete(oldest);
    notifySnapshot(oldest);
  }
  notifySnapshot(url);
}

/**
 * Subscribe to snapshot arrivals. Returns an unsubscribe function.
 * Used so parked cells re-render when a capture finishes async.
 */
export function subscribeVideoFrameSnapshots(
  listener: (url: string) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reactive lookup — re-renders when a snapshot for `url` lands (or is
 * evicted and later re-captured).
 */
export function useVideoFrameSnapshot(
  url: string | null
): VideoThumbnail | null {
  const key = snapshotKey(url);
  const [snapshot, setSnapshot] = useState<VideoThumbnail | null>(() =>
    getVideoFrameSnapshot(key)
  );

  useEffect(() => {
    setSnapshot(getVideoFrameSnapshot(key));
    if (!key) return;

    return subscribeVideoFrameSnapshots((changedUrl) => {
      if (changedUrl === key) {
        setSnapshot(getVideoFrameSnapshot(key));
      }
    });
  }, [key]);

  return snapshot;
}

function resolveCaptureTime(player: VideoPlayer, timeSec?: number): number | null {
  try {
    if (typeof timeSec === "number" && Number.isFinite(timeSec) && timeSec >= 0) {
      return Math.max(timeSec, FEED_VIDEO_START_POSITION_SECONDS);
    }
    const now = Number(player.currentTime);
    if (Number.isFinite(now) && now > 0) {
      return now;
    }
    return FEED_VIDEO_START_POSITION_SECONDS;
  } catch {
    return null;
  }
}

function enqueueCapture(url: string, player: VideoPlayer, timeSec?: number) {
  const existing = pending.findIndex((item) => item.url === url);
  const next = { url, player, timeSec };
  if (existing >= 0) pending[existing] = next;
  else pending.push(next);
}

function flushPendingCaptures() {
  while (inFlight.size < MAX_CONCURRENT_CAPTURES && pending.length > 0) {
    const next = pending.shift();
    if (!next) break;
    if (inFlight.has(next.url)) continue;
    startCapture(next.url, next.player, next.timeSec);
  }
}

function startCapture(url: string, player: VideoPlayer, timeSec?: number) {
  if (!isLiveVideoPlayer(player) || inFlight.has(url)) {
    flushPendingCaptures();
    return;
  }

  const at = resolveCaptureTime(player, timeSec);
  if (at == null) {
    flushPendingCaptures();
    return;
  }

  inFlight.add(url);
  (async () => {
    try {
      if (!isLiveVideoPlayer(player)) return;
      // MUST be an array: passing a single number natively crashes iOS on
      // SDK 54 (fixed in SDK 55) — https://github.com/expo/expo/issues/43372
      const [thumbnail] = await player.generateThumbnailsAsync([at], {
        maxWidth: SNAPSHOT_MAX_WIDTH,
      });
      if (!thumbnail) return;
      rememberSnapshot(url, thumbnail);
    } catch {
      // no-op — poster fallback if capture fails
    } finally {
      inFlight.delete(url);
      flushPendingCaptures();
    }
  })();
}

/**
 * Capture the frame at `timeSec` (or the player's current time).
 * Overwrites any older snapshot for this URL.
 */
export function captureVideoFrameSnapshot(
  url: string | null,
  player: VideoPlayer,
  timeSec?: number
) {
  const key = snapshotKey(url);
  if (!key || !isLiveVideoPlayer(player)) return;
  if (inFlight.has(key)) {
    enqueueCapture(key, player, timeSec);
    return;
  }
  if (inFlight.size >= MAX_CONCURRENT_CAPTURES) {
    enqueueCapture(key, player, timeSec);
    return;
  }
  startCapture(key, player, timeSec);
}

/**
 * Grab a still at the current playhead (or the start frame) so scrolling
 * back can show a picture instead of a black decoder surface.
 */
export function snapshotPlayerFrame(
  url: string | null,
  player: VideoPlayer | null | undefined,
  timeSec?: number
) {
  const key = snapshotKey(url);
  if (!key || !player) return;
  const at =
    typeof timeSec === "number" && Number.isFinite(timeSec) && timeSec > 0
      ? timeSec
      : readPlayerCurrentTimeSec(player);
  captureVideoFrameSnapshot(
    key,
    player,
    at > 0 ? at : FEED_VIDEO_START_POSITION_SECONDS
  );
}
