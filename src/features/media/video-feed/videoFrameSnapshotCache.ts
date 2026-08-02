import type { VideoPlayer, VideoThumbnail } from "expo-video";
import { useEffect, useState } from "react";
import { FEED_VIDEO_START_POSITION_SECONDS } from "./feedVideoConfig";

/**
 * First-frame snapshots, keyed by video URL.
 *
 * The feed can only keep a bounded number of live players (hardware
 * decoder budget), so a video scrolled far enough away eventually loses
 * its player — and with it, the frame its surface was showing. When that
 * video comes back, a brand-new decoder needs a moment before it paints,
 * and the cell would show black.
 *
 * Every video starts from the beginning whenever it (re)enters the
 * viewport (product rule), so the cover image for that gap is the video's
 * OWN first frame (~0.02s) — captured natively from the player itself, not a
 * poster/thumbnail asset (those are banned in this feed).
 * `VideoThumbnail` is a `SharedRef<'image'>`, so expo-image renders it
 * with zero copies to JS. VideoCardPlayerArea overlays it until the fresh
 * player paints frame 0 underneath — identical pixels, invisible swap.
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
const MAX_CONCURRENT_CAPTURES = 2;

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
 * Fire-and-forget capture of the video's ~0.02s frame. A video only ever
 * needs one (that start frame never changes). Failures (web, some HLS
 * sources, player released mid-capture) just leave the previous behavior:
 * a black gap bounded by the decoder spin-up.
 */
export function captureVideoFrameSnapshot(
  url: string | null,
  player: VideoPlayer
) {
  if (!url || snapshots.has(url) || inFlight.has(url)) return;
  if (inFlight.size >= MAX_CONCURRENT_CAPTURES) return;

  inFlight.add(url);
  (async () => {
    try {
      // MUST be an array: passing a single number natively crashes iOS on
      // SDK 54 (fixed in SDK 55) — https://github.com/expo/expo/issues/43372
      // Captured at the same position players park/start at, so the
      // overlay pixels match the live surface exactly.
      const [thumbnail] = await player.generateThumbnailsAsync(
        [FEED_VIDEO_START_POSITION_SECONDS],
        { maxWidth: SNAPSHOT_MAX_WIDTH }
      );
      if (!thumbnail) return;

      snapshots.set(url, thumbnail);
      // Evict oldest first (Map preserves insertion order).
      while (snapshots.size > MAX_ENTRIES) {
        const oldest = snapshots.keys().next().value;
        if (oldest === undefined) break;
        snapshots.delete(oldest);
        notifySnapshot(oldest);
      }
      notifySnapshot(url);
    } catch {
      // no-op — black fallback is the status quo.
    } finally {
      inFlight.delete(url);
    }
  })();
}
