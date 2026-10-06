import { Image, Platform } from "react-native";
import { createVideoPlayer } from "expo-video";
import { aspectFromSize, videoFramePosterUrl } from "./displayedVideoAspect";
import {
  markFeedVideoAspectSettled,
  readTrustedAspect,
  rememberFeedVideoAspect,
} from "./feedVideoAspectCache";
import { loadMp4DisplayAspect } from "./mp4DisplayAspect";

const pending = new Map<string, { allowPlayer: boolean; also: Set<string> }>();
const posterFailed = new Set<string>();
const exhausted = new Set<string>();
const MAX_RUNNING = 2;
let running = 0;
const waiters: { url: string; run: () => void }[] = [];

function imageAspect(uri: string, timeoutMs = 4000): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    Image.getSize(
      uri,
      (width, height) => {
        // Tiny squares are placeholders, not the picture.
        if (width <= 128 && height <= 128) {
          finish(null);
          return;
        }
        finish(aspectFromSize(width, height));
      },
      () => finish(null)
    );
  });
}

/**
 * One short-lived player, never the one on screen.
 * generateThumbnailsAsync applies rotation. Seeking the live player blacks it.
 */
async function probePlayerAspect(
  uri: string,
  timeoutMs = 5000
): Promise<number | null> {
  let player: ReturnType<typeof createVideoPlayer> | null = null;
  try {
    player = createVideoPlayer({ uri, contentType: "progressive" });
    const size = await new Promise<{ width: number; height: number } | null>(
      (resolve) => {
        let settled = false;
        const finish = (value: { width: number; height: number } | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        };
        const timer = setTimeout(() => finish(null), timeoutMs);
        const read = () => {
          void (async () => {
            try {
              const [thumbnail] = await player!.generateThumbnailsAsync([0.1], {
                maxWidth: 480,
              });
              if (thumbnail && thumbnail.width > 0 && thumbnail.height > 0) {
                finish({ width: thumbnail.width, height: thumbnail.height });
                return;
              }
            } catch {
              // The file may not be ready on the first event. The timeout ends the wait.
            }
            try {
              const track = player?.videoTrack?.size;
              if (track && track.width > 0 && track.height > track.width) {
                finish({ width: track.width, height: track.height });
              }
            } catch {
              // Player already released.
            }
          })();
        };
        try {
          player!.addListener("sourceLoad", read);
          player!.addListener("statusChange", ({ status }) => {
            if (status === "readyToPlay") read();
          });
        } catch {
          finish(null);
        }
      }
    );
    return size ? aspectFromSize(size.width, size.height) : null;
  } catch {
    return null;
  } finally {
    try {
      player?.release?.();
    } catch {
      // no-op
    }
  }
}

async function measure(
  urls: string[],
  allowPlayer: () => boolean
): Promise<number | null> {
  // The file header is the displayed size, including a 90° phone video.
  // A wide header can still be that sideways buffer when the matrix was
  // missed, so an upright poster or an iOS frame may replace it.
  // A wide poster alone is the raw buffer and is ignored.
  let wideFromFile: number | null = null;
  for (const url of urls) {
    const fromFile = await loadMp4DisplayAspect(url);
    if (fromFile == null) continue;
    if (fromFile < 1) return fromFile;
    if (wideFromFile == null) wideFromFile = fromFile;
  }
  for (const url of urls) {
    const poster = videoFramePosterUrl(url);
    if (!poster) continue;
    const fromPoster = await imageAspect(poster);
    if (fromPoster != null && fromPoster < 1) return fromPoster;
  }
  // The file header already applied rotation, and Android only trusts a tall
  // probe frame. A second ExoPlayer here also costs the single decoder slot.
  if (!allowPlayer() || Platform.OS === "android") return wideFromFile;
  if (urls.some((url) => readTrustedAspect(url))) {
    return urls.map((url) => readTrustedAspect(url)).find((aspect) => aspect != null) ?? null;
  }
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (urls.some((url) => readTrustedAspect(url))) {
    return urls.map((url) => readTrustedAspect(url)).find((aspect) => aspect != null) ?? null;
  }
  for (const url of urls) {
    if (url.split("?")[0].toLowerCase().includes(".m3u8")) continue;
    const probed = await probePlayerAspect(url);
    if (probed == null) continue;
    // iOS thumbnails apply the track rotation. Android's frame often does not,
    // so a wide Android thumbnail is not proof the picture is wide.
    if (probed < 1) return probed;
    // A wide iOS frame is the picture only when the file header is wide too.
    // On its own it can be the sideways buffer, which letterboxes a 9:16 reel.
    if (Platform.OS === "ios" && wideFromFile != null) return probed;
  }
  return wideFromFile;
}

function pump() {
  while (running < MAX_RUNNING) {
    const next = waiters.shift();
    if (!next) return;
    running += 1;
    next.run();
  }
}

/**
 * Learn the displayed ratio without touching the player that is on screen.
 * File header first, then poster pixels. A second player only on iOS, when
 * this clip is already decoding and nothing else had a size.
 * `priority` puts the card on screen ahead of list prefetches.
 */
export function ensureDisplayedAspect(
  videoUrl: string | null | undefined,
  options?: {
    allowPlayer?: boolean;
    also?: (string | null | undefined)[];
    priority?: boolean;
  }
) {
  if (!videoUrl) return;
  if (readTrustedAspect(videoUrl) || exhausted.has(videoUrl)) {
    markFeedVideoAspectSettled(videoUrl);
    return;
  }
  if (posterFailed.has(videoUrl) && !options?.allowPlayer) {
    markFeedVideoAspectSettled(videoUrl);
    return;
  }
  const extras = (options?.also ?? []).filter((url): url is string => Boolean(url));
  const existing = pending.get(videoUrl);
  if (existing) {
    if (options?.allowPlayer) existing.allowPlayer = true;
    for (const extra of extras) existing.also.add(extra);
    if (options?.priority) {
      const queued = waiters.findIndex((waiter) => waiter.url === videoUrl);
      if (queued > 0) waiters.unshift(...waiters.splice(queued, 1));
    }
    return;
  }
  const job = {
    allowPlayer: options?.allowPlayer === true,
    also: new Set<string>([videoUrl, ...extras]),
  };
  pending.set(videoUrl, job);
  const waiter = {
    url: videoUrl,
    run: () => {
      void (async () => {
        try {
          await Promise.resolve();
          const urls = [...job.also];
          if (!urls.some((url) => readTrustedAspect(url))) {
            const aspect = await measure(urls, () => job.allowPlayer);
            if (aspect != null) {
              for (const url of job.also) rememberFeedVideoAspect(url, aspect);
            }
          }
        } finally {
          if (!readTrustedAspect(videoUrl)) {
            if (job.allowPlayer || Platform.OS === "android") exhausted.add(videoUrl);
            else posterFailed.add(videoUrl);
          }
          for (const url of job.also) markFeedVideoAspectSettled(url);
          pending.delete(videoUrl);
          running = Math.max(0, running - 1);
          pump();
        }
      })();
    },
  };
  if (options?.priority) waiters.unshift(waiter);
  else waiters.push(waiter);
  pump();
}

/** Measure a whole list ahead of scrolling. Cheap: ~16KB per clip. */
export function prefetchDisplayedAspects(
  entries: { url: string | null | undefined; also?: (string | null | undefined)[] }[]
) {
  for (const entry of entries) {
    if (!entry.url) continue;
    ensureDisplayedAspect(entry.url, { allowPlayer: false, also: entry.also });
  }
}
