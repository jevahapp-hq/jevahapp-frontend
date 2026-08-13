/**
 * Warm the CDN / edge cache for upcoming videos by pulling the first segment.
 * Does not allocate a native player — cheap TikTok-style ahead-of-scroll prep.
 */
import {
  isVideoPreloaded,
  markVideoPreloaded,
} from "../../../app/utils/videoOptimization";
import { PERFORMANCE_CONFIG, PERFORMANCE_FEATURES } from "../config/performance";
import { isLiteProfileActive } from "../lite/liteProfile";
import { PERF, recordSample } from "./perfMarks";
import {
  hasLiteVideoHead,
  persistLiteVideoHead,
} from "../cache/liteMediaDiskCache";

const inflight = new Set<string>();
const MAX_CONCURRENT = Math.min(
  2,
  PERFORMANCE_CONFIG.VIDEO.MAX_CONCURRENT || 2
);
let active = 0;
const queue: string[] = [];

async function warmUrl(url: string): Promise<void> {
  if (!url || !/^https?:\/\//i.test(url)) return;
  if (isVideoPreloaded(url) || inflight.has(url)) return;

  inflight.add(url);
  active += 1;
  const started = Date.now();

  try {
    if (isLiteProfileActive() && (await hasLiteVideoHead(url))) {
      markVideoPreloaded(url);
      recordSample(PERF.VIDEO_PREFETCH, Date.now() - started);
      return;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Range: "bytes=0-524287", // ~512KB — faster first-frame readiness
      },
    });

    try {
      const buf = await response.arrayBuffer();
      if (isLiteProfileActive()) {
        void persistLiteVideoHead(url, buf);
      }
    } catch {
      // Some hosts reject Range — partial failure still warms DNS/TLS.
    }

    markVideoPreloaded(url);
    recordSample(PERF.VIDEO_PREFETCH, Date.now() - started);
  } catch {
    // Prefetch is best-effort — never block playback.
  } finally {
    inflight.delete(url);
    active = Math.max(0, active - 1);
    pump();
  }
}

function pump(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift();
    if (next) void warmUrl(next);
  }
}

/** Enqueue CDN warmup for one or more playback URLs. */
export function prefetchVideoUrls(urls: Array<string | null | undefined>): void {
  if (!PERFORMANCE_FEATURES.ENABLE_VIDEO_PREFETCH) return;

  for (const raw of urls) {
    const url = typeof raw === "string" ? raw.trim() : "";
    if (!url) continue;
    if (isVideoPreloaded(url) || inflight.has(url) || queue.includes(url)) {
      continue;
    }
    queue.push(url);
  }
  pump();
}

/** Clear the pending warmup queue (does not abort in-flight fetches). */
export function clearVideoPrefetchQueue(): void {
  queue.length = 0;
}
