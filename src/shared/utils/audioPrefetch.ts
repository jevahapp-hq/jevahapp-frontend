/**
 * Prefetch Audio.Sound instances (shouldPlay: false) for near-instant tap-to-play.
 */
import { Audio } from "expo-av";
import { PERFORMANCE_FEATURES } from "../config/performance";
import { PERF, recordSample } from "./perfMarks";

const cache = new Map<string, Audio.Sound>();
const inflight = new Map<string, Promise<Audio.Sound | null>>();
const MAX_CACHED = 2;

async function ensureAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // ignore
  }
}

/** Take a preloaded sound out of the cache (caller owns unload). */
export function takePreloadedSound(url: string): Audio.Sound | null {
  const sound = cache.get(url) ?? null;
  if (sound) cache.delete(url);
  return sound;
}

export function hasPreloadedSound(url: string): boolean {
  return cache.has(url) || inflight.has(url);
}

async function createWarmSound(url: string): Promise<Audio.Sound | null> {
  const started = Date.now();
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: false, volume: 1 }
    );
    recordSample(PERF.MUSIC_START + ".prefetch", Date.now() - started);
    return sound;
  } catch {
    return null;
  }
}

function trimCache(): void {
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) break;
    const sound = cache.get(oldest);
    cache.delete(oldest);
    void sound?.unloadAsync().catch(() => {});
  }
}

/** Warm-create a Sound for upcoming music (best-effort). */
export function prefetchAudioUrl(url: string | null | undefined): void {
  if (!PERFORMANCE_FEATURES.ENABLE_AUDIO_PREFETCH) return;
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;
  if (cache.has(trimmed) || inflight.has(trimmed)) return;

  const work = createWarmSound(trimmed).then((sound) => {
    inflight.delete(trimmed);
    if (!sound) return null;
    cache.set(trimmed, sound);
    trimCache();
    return sound;
  });
  inflight.set(trimmed, work);
}

export function prefetchAudioUrls(
  urls: Array<string | null | undefined>
): void {
  for (const url of urls) prefetchAudioUrl(url);
}

export async function clearAudioPrefetchCache(): Promise<void> {
  const sounds = [...cache.values()];
  cache.clear();
  inflight.clear();
  await Promise.all(
    sounds.map((s) => s.unloadAsync().catch(() => undefined))
  );
}
