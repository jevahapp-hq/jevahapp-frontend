import type { VideoPlayer, VideoThumbnail } from "expo-video";
import { useEffect, useState } from "react";
import { FEED_VIDEO_START_POSITION_SECONDS } from "./feedVideoConfig";

/**
 * Last-frame snapshots, keyed by video URL.
 *
 * When a feed card loses its decoder, we overlay the frame it paused on
 * so scrolling back does not flash the cover thumbnail.
 */


/** Bounds native bitmap memory: ~480p RGBA ≈ 1.6MB × 16 ≈ 26MB worst case. */
const MAX_ENTRIES = 16;
const SNAPSHOT_MAX_WIDTH = 480;
/**
 * Never run more than this many native frame extractions at once — a fast
 * scroll can freeze several videos in the same tick, and an unbounded
 * burst of AVAssetImageGenerator/MediaMetadataRetriever work spikes
 * memory (dangerous inside Expo Go). Skipped captures simply retry on the
 * video's next freeze / ready event.
 */
const MAX_CONCURRENT_CAPTURES = 1;

const snapshots = new Map<string, VideoThumbnail>();
const inFlight = new Set<string>();
const listeners = new Set<(url: string) => void>();

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
  if (!url) return null;
  return snapshots.get(url) ?? null;
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
  const [snapshot, setSnapshot] = useState<VideoThumbnail | null>(() =>
    getVideoFrameSnapshot(url)
  );

  useEffect(() => {
    setSnapshot(getVideoFrameSnapshot(url));
    if (!url) return;

    return subscribeVideoFrameSnapshots((changedUrl) => {
      if (changedUrl === url) {
        setSnapshot(getVideoFrameSnapshot(url));
      }
    });
  }, [url]);

  return snapshot;
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
  if (!url || inFlight.has(url)) return;
  if (inFlight.size >= MAX_CONCURRENT_CAPTURES) return;

  let at: number;
  try {
    at =
      typeof timeSec === "number" && Number.isFinite(timeSec) && timeSec > 0
        ? timeSec
        : Number(player.currentTime) || FEED_VIDEO_START_POSITION_SECONDS;
  } catch {
    return;
  }

  inFlight.add(url);
  (async () => {
    try {
      // MUST be an array: passing a single number natively crashes iOS on
      // SDK 54 (fixed in SDK 55) — https://github.com/expo/expo/issues/43372
      const [thumbnail] = await player.generateThumbnailsAsync([at], {
        maxWidth: SNAPSHOT_MAX_WIDTH,
      });
      if (!thumbnail) return;

      snapshots.set(url, thumbnail);
      while (snapshots.size > MAX_ENTRIES) {
        const oldest = snapshots.keys().next().value;
        if (oldest === undefined) break;
        snapshots.delete(oldest);
        notifySnapshot(oldest);
      }
      notifySnapshot(url);
    } catch {
      // no-op — poster fallback if capture fails
    } finally {
      inFlight.delete(url);
    }
  })();
}
