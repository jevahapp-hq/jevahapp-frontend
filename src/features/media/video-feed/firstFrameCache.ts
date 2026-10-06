import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { fixOverEncodedMediaUrl } from "../../../shared/utils/videoUrlManager";

/**
 * The video's own opening frame, saved as a JPEG in the app cache and
 * remembered across launches. A card that has never played shows this
 * instead of the uploaded thumbnail, so the video starts from the same
 * picture the viewer was already looking at.
 */

type GetThumbnail = (
  url: string,
  options: { time: number; quality: number }
) => Promise<{ uri: string }>;

const STORAGE_KEY = "feedFirstFrames:v1";
const MAX_STORED = 300;
/** Each grab reads the file head over the network; one at a time. */
const MAX_RUNNING = 1;
const FRAME_AT_MS = 100;

const frames = new Map<string, string>();
const failed = new Set<string>();
const queued: string[] = [];
const listeners = new Set<(key: string) => void>();
let running = 0;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let getThumbnail: GetThumbnail | null | undefined;

function frameKey(url: string | null | undefined): string | null {
  // Android's retriever downloads the file and opens its own decoder, which
  // starved the card about to play. Many clips also open on a black frame.
  if (!url || Platform.OS === "android") return null;
  const key = fixOverEncodedMediaUrl(url.trim());
  return /^https?:\/\//i.test(key) ? key : null;
}

function isReactNative(): boolean {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}

/** Null when the native module isn't in this build (older dev client). */
function thumbnailer(): GetThumbnail | null {
  if (getThumbnail !== undefined) return getThumbnail;
  getThumbnail = null;
  if (!isReactNative()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const core = require("expo-modules-core");
    if (!core.requireOptionalNativeModule?.("ExpoVideoThumbnails")) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    getThumbnail = require("expo-video-thumbnails").getThumbnailAsync as GetThumbnail;
  } catch {
    getThumbnail = null;
  }
  return getThumbnail;
}

function notify(key: string) {
  listeners.forEach((listener) => {
    try {
      listener(key);
    } catch {
      // A broken subscriber must not stop the queue.
    }
  });
}

async function loadStorage() {
  const mod = await import("@react-native-async-storage/async-storage");
  return mod.default;
}

function schedulePersist() {
  if (!isReactNative() || persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const kept = [...frames.entries()].slice(-MAX_STORED);
    void loadStorage()
      .then((storage) => storage.setItem(STORAGE_KEY, JSON.stringify(kept)))
      .catch(() => undefined);
  }, 1500);
}

function hydrate() {
  if (!isReactNative() || Platform.OS === "android") return;
  void loadStorage()
    .then((storage) => storage.getItem(STORAGE_KEY))
    .then((raw) => {
      if (!raw) return;
      const entries = JSON.parse(raw) as [string, string][];
      if (!Array.isArray(entries)) return;
      for (const [key, uri] of entries) {
        if (typeof key !== "string" || typeof uri !== "string") continue;
        if (frames.has(key)) continue;
        frames.set(key, uri);
        notify(key);
      }
    })
    .catch(() => undefined);
}

hydrate();

export function getFirstFrame(url: string | null | undefined): string | null {
  const key = frameKey(url);
  return key ? frames.get(key) ?? null : null;
}

/** The saved file is gone (OS cleared the cache). Grab it again later. */
export function forgetFirstFrame(url: string | null | undefined) {
  const key = frameKey(url);
  if (!key || !frames.delete(key)) return;
  notify(key);
  schedulePersist();
}

function pump() {
  const grab = thumbnailer();
  if (!grab) {
    queued.length = 0;
    return;
  }
  while (running < MAX_RUNNING && queued.length > 0) {
    const key = queued.shift() as string;
    if (frames.has(key) || failed.has(key)) continue;
    running++;
    grab(key, { time: FRAME_AT_MS, quality: 0.7 })
      .then(({ uri }) => {
        if (!uri) return;
        frames.set(key, uri);
        notify(key);
        schedulePersist();
      })
      .catch(() => {
        failed.add(key);
      })
      .finally(() => {
        running--;
        pump();
      });
  }
}

/**
 * Grab opening frames for these videos. `priority` puts them ahead of
 * anything already waiting (the card about to come on screen).
 */
export function prefetchFirstFrames(
  urls: readonly (string | null | undefined)[],
  { priority = false }: { priority?: boolean } = {}
) {
  const keys: string[] = [];
  for (const url of urls) {
    const key = frameKey(url);
    if (!key || frames.has(key) || failed.has(key)) continue;
    const at = queued.indexOf(key);
    if (at >= 0) {
      if (!priority) continue;
      queued.splice(at, 1);
    }
    keys.push(key);
  }
  if (keys.length === 0) return;
  if (priority) queued.unshift(...keys);
  else queued.push(...keys);
  pump();
}

export function useFirstFrame(url: string | null | undefined): string | null {
  const key = frameKey(url);
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!key) return;
    const listener = (changed: string) => {
      if (changed === key) setVersion((v) => v + 1);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [key]);
  return key ? frames.get(key) ?? null : null;
}
