/**
 * Prefetch remote audio so tap-to-play starts with less buffering.
 */
import {
  clearAllPreloadedSources,
  clearPreloadedSource,
  preload,
} from "expo-audio";
import { PERFORMANCE_FEATURES } from "../config/performance";
import { PERF, recordSample } from "./perfMarks";

const requested = new Set<string>();
const MAX_CACHED = 2;

function sourceFor(url: string) {
  return { uri: url };
}

/** Take a preloaded sound out of the cache (caller owns unload). */
export function takePreloadedSound(_url: string): null {
  return null;
}

export function hasPreloadedSound(url: string): boolean {
  return requested.has(url);
}

function trimCache(): void {
  while (requested.size > MAX_CACHED) {
    const oldest = requested.values().next().value as string | undefined;
    if (!oldest) break;
    requested.delete(oldest);
    void clearPreloadedSource(sourceFor(oldest)).catch(() => {});
  }
}

/** Warm-buffer upcoming music (best-effort). */
export function prefetchAudioUrl(url: string | null | undefined): void {
  if (!PERFORMANCE_FEATURES.ENABLE_AUDIO_PREFETCH) return;
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;
  if (requested.has(trimmed)) return;

  requested.add(trimmed);
  trimCache();
  const started = Date.now();
  void preload(sourceFor(trimmed))
    .then(() => {
      recordSample(PERF.MUSIC_START + ".prefetch", Date.now() - started);
    })
    .catch(() => {
      requested.delete(trimmed);
    });
}

export function prefetchAudioUrls(
  urls: Array<string | null | undefined>
): void {
  for (const url of urls) prefetchAudioUrl(url);
}

export async function clearAudioPrefetchCache(): Promise<void> {
  requested.clear();
  await clearAllPreloadedSources().catch(() => undefined);
}
