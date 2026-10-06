import { preferDisplayedAspect } from "./displayedVideoAspect";

const aspectByUrl = new Map<string, number>();
/** Wide ratios count only after a rotated frame or an upload probe. */
const frameConfirmedUrls = new Set<string>();
/** A measurement finished for this file, even if it found nothing. */
const settledUrls = new Set<string>();
const listeners = new Set<(url: string) => void>();

const STORAGE_KEY = "feedVideoAspects:v1";
const MAX_STORED = 600;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function keysFor(videoUrl: string): string[] {
  const trimmed = videoUrl.trim();
  if (!trimmed) return [];
  const noQuery = trimmed.split("#")[0].split("?")[0];
  return noQuery === trimmed ? [trimmed] : [trimmed, noQuery];
}

function notify(url: string) {
  listeners.forEach((listener) => {
    try {
      listener(url);
    } catch {
      // A broken subscriber must not drop the measurement.
    }
  });
}

function isReactNative(): boolean {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}

async function loadStorage() {
  const mod = await import("@react-native-async-storage/async-storage");
  return mod.default;
}

function schedulePersist() {
  if (!isReactNative() || persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const entries: [string, number][] = [];
    aspectByUrl.forEach((aspect, key) => {
      if (key.includes("?") || !frameConfirmedUrls.has(key)) return;
      entries.push([key, Math.round(aspect * 10000) / 10000]);
    });
    const kept = entries.slice(-MAX_STORED);
    void loadStorage()
      .then((storage) => storage.setItem(STORAGE_KEY, JSON.stringify(kept)))
      .catch(() => undefined);
  }, 1500);
}

/** Ratios measured on earlier launches, so cards open in the right frame. */
function hydrate() {
  if (!isReactNative()) return;
  void loadStorage()
    .then((storage) => storage.getItem(STORAGE_KEY))
    .then((raw) => {
      if (!raw) return;
      const entries = JSON.parse(raw) as [string, number][];
      if (!Array.isArray(entries)) return;
      for (const [key, aspect] of entries) {
        if (typeof key !== "string" || !(aspect > 0) || aspectByUrl.has(key)) continue;
        aspectByUrl.set(key, aspect);
        frameConfirmedUrls.add(key);
        settledUrls.add(key);
        notify(key);
      }
    })
    .catch(() => undefined);
}

hydrate();

export function subscribeFeedVideoAspect(
  listener: (url: string) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readTrustedAspect(
  videoUrl: string | null | undefined
): number | null {
  if (!videoUrl) return null;
  for (const key of keysFor(videoUrl)) {
    const aspect = aspectByUrl.get(key) ?? null;
    if (aspect == null || !(aspect > 0)) continue;
    if (aspect >= 1 && !frameConfirmedUrls.has(key)) continue;
    return aspect;
  }
  return null;
}

/** Last measured ratio for this file, if a player or the uploader has read it. */
export function peekFeedVideoAspect(
  videoUrl: string | null | undefined
): number | null {
  return readTrustedAspect(videoUrl);
}

/** True once the ratio is known, or a measurement ended without one. */
export function isFeedVideoAspectSettled(
  videoUrl: string | null | undefined
): boolean {
  if (!videoUrl) return true;
  if (readTrustedAspect(videoUrl) != null) return true;
  return keysFor(videoUrl).some((key) => settledUrls.has(key));
}

export function markFeedVideoAspectSettled(videoUrl: string | null | undefined) {
  if (!videoUrl) return;
  let changed = false;
  for (const key of keysFor(videoUrl)) {
    if (settledUrls.has(key)) continue;
    settledUrls.add(key);
    changed = true;
  }
  if (changed) notify(videoUrl);
}

/**
 * Displayed width / height from an upload probe or a rotated frame.
 * A wide value is trusted. A later wide reading cannot undo a tall one.
 */
export function rememberFeedVideoAspect(
  videoUrl: string | null | undefined,
  aspect: number | null | undefined
) {
  if (!videoUrl || aspect == null || !(aspect > 0) || !Number.isFinite(aspect)) {
    return;
  }
  const keys = keysFor(videoUrl);
  let stored = false;
  for (const key of keys) {
    const next = preferDisplayedAspect(aspectByUrl.get(key) ?? null, aspect);
    if (next == null) continue;
    const prev = aspectByUrl.get(key);
    frameConfirmedUrls.add(key);
    settledUrls.add(key);
    if (prev != null && Math.abs(prev - next) < 0.001) continue;
    aspectByUrl.set(key, next);
    stored = true;
    notify(key);
  }
  if (!keys.includes(videoUrl)) notify(videoUrl);
  if (stored) schedulePersist();
}

/** Encoded track. Only a tall track is stored; wide pixels may be rotated. */
export function noteTrackAspect(
  videoUrl: string | null | undefined,
  aspect: number | null | undefined
) {
  if (aspect == null || !(aspect > 0) || aspect >= 1) return;
  rememberFeedVideoAspect(videoUrl, aspect);
}

export function resetFeedVideoAspectForTests() {
  aspectByUrl.clear();
  frameConfirmedUrls.clear();
  settledUrls.clear();
}
