/**
 * Lightweight performance marks for Phase 0 lab measurements.
 * Collects samples in-memory; logs p50/p95 in __DEV__.
 */

type SampleBucket = number[];

const marks = new Map<string, number>();
const samples = new Map<string, SampleBucket>();
const MAX_SAMPLES = 80;

function now(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[idx];
}

export function perfMark(name: string): void {
  marks.set(name, now());
}

export function perfMeasure(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  const start = marks.get(startMark);
  if (typeof start !== "number") return null;
  const end = endMark ? marks.get(endMark) : now();
  if (typeof end !== "number") return null;
  const duration = Math.max(0, end - start);
  recordSample(name, duration);
  return duration;
}

export function recordSample(name: string, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  const bucket = samples.get(name) || [];
  bucket.push(durationMs);
  if (bucket.length > MAX_SAMPLES) bucket.shift();
  samples.set(name, bucket);

  if (__DEV__ && bucket.length % 5 === 0) {
    const summary = getPerfSummary(name);
    if (summary) {
      console.log(
        `⏱ ${name} n=${summary.count} p50=${summary.p50.toFixed(0)}ms p95=${summary.p95.toFixed(0)}ms`
      );
    }
  }
}

/** Convenience: start → end for a named span */
export function measureSpan<T>(
  name: string,
  work: () => Promise<T> | T
): Promise<T> | T {
  const start = now();
  const done = (result: T) => {
    recordSample(name, now() - start);
    return result;
  };
  try {
    const out = work();
    if (out && typeof (out as Promise<T>).then === "function") {
      return (out as Promise<T>).then(done, (err) => {
        recordSample(`${name}.error`, now() - start);
        throw err;
      });
    }
    return done(out as T);
  } catch (err) {
    recordSample(`${name}.error`, now() - start);
    throw err;
  }
}

export function getPerfSummary(name: string): {
  count: number;
  p50: number;
  p95: number;
  last: number;
} | null {
  const bucket = samples.get(name);
  if (!bucket || bucket.length === 0) return null;
  const sorted = [...bucket].sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    last: bucket[bucket.length - 1],
  };
}

export function getAllPerfSummaries(): Record<
  string,
  { count: number; p50: number; p95: number; last: number }
> {
  const out: Record<
    string,
    { count: number; p50: number; p95: number; last: number }
  > = {};
  samples.forEach((_, name) => {
    const summary = getPerfSummary(name);
    if (summary) out[name] = summary;
  });
  return out;
}

export function clearPerfMarks(): void {
  marks.clear();
  samples.clear();
}

/** Canonical metric names used across the app */
export const PERF = {
  APP_START: "app.cold_start",
  SPLASH_HIDE: "app.splash_hide",
  FEED_SEED: "feed.mmkv_seed",
  FEED_FIRST_PAINT: "feed.first_paint",
  VIDEO_TTFF: "video.ttff",
  MUSIC_START: "music.start",
  EBOOK_FIRST_PAGE: "ebook.first_page",
  VIDEO_PREFETCH: "video.prefetch",
} as const;
