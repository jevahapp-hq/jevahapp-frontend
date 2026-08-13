/**
 * Jevah Lite — Facebook/TikTok Lite pattern for ~2GB Android.
 * Backend: ?profile=lite + X-Jevah-Client: lite (compact JSON + playback hints).
 * Client owns RAM: page size, prefetch, player window, image budget.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dimensions, PixelRatio, Platform } from "react-native";
import { appMmkv } from "../cache/mmkvStorage";

export type LiteMode = "auto" | "on" | "off";

const STORAGE_KEY = "jevah_lite_mode_v1";
const MMKV_LITE_KEY = "jevah_lite_mode_v1";
const LITE_RAM_BYTES = 2.5 * 1024 ** 3;

let mode: LiteMode = "auto";
let hydrated = false;
let cachedActive: boolean | null = null;
const listeners = new Set<(active: boolean, mode: LiteMode) => void>();

/** Heuristic when mode === auto (no expo-device required). */
export function detectLowEndAndroid(): boolean {
  if (Platform.OS !== "android") return false;

  try {
    // Optional: expo-device totalMemory when native module is present
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Device = require("expo-device");
    const mem = Device?.totalMemory;
    if (typeof mem === "number" && mem > 0 && mem < LITE_RAM_BYTES) {
      return true;
    }
  } catch {
    // package optional
  }

  const { width, height } = Dimensions.get("window");
  const pr = PixelRatio.get();
  const api =
    typeof Platform.Version === "number"
      ? Platform.Version
      : parseInt(String(Platform.Version), 10) || 99;

  // Small / older Androids are the usual 2GB class
  if (api <= 28) return true;
  if (width <= 360 && height <= 720) return true;
  if (pr <= 1.5 && width < 400) return true;
  return false;
}

export function computeLiteActive(current: LiteMode = mode): boolean {
  if (current === "on") return true;
  if (current === "off") return false;
  return detectLowEndAndroid();
}

function notify() {
  const active = computeLiteActive();
  cachedActive = active;
  listeners.forEach((fn) => {
    try {
      fn(active, mode);
    } catch {
      // no-op
    }
  });
}

function persistLiteModeSync(next: LiteMode): void {
  try {
    appMmkv.set(MMKV_LITE_KEY, next);
  } catch {
    // no-op
  }
}

/**
 * Sync read of Lite mode from MMKV before first feed seed.
 * Call at module boot so query keys (lite|full, page size) match disk.
 */
export function hydrateLiteProfileSync(): boolean {
  try {
    const raw = appMmkv.getString(MMKV_LITE_KEY);
    if (raw === "on" || raw === "off" || raw === "auto") {
      mode = raw;
    }
  } catch {
    // keep default
  }
  notify();
  return computeLiteActive();
}

export async function hydrateLiteProfile(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === "on" || raw === "off" || raw === "auto") {
      mode = raw;
      persistLiteModeSync(raw);
    } else {
      // Mirror current (possibly MMKV-synced) mode to AsyncStorage
      persistLiteModeSync(mode);
    }
  } catch {
    // keep default auto
  }
  hydrated = true;
  notify();
  return computeLiteActive();
}

export function getLiteMode(): LiteMode {
  return mode;
}

export function isLiteProfileActive(): boolean {
  if (cachedActive != null) return cachedActive;
  return computeLiteActive();
}

export async function setLiteMode(next: LiteMode): Promise<void> {
  mode = next;
  persistLiteModeSync(next);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } catch {
    // no-op
  }
  notify();
}

/** Convenience for Settings toggle (on ↔ off; clears auto). */
export async function setLiteEnabled(enabled: boolean): Promise<void> {
  await setLiteMode(enabled ? "on" : "off");
}

export function subscribeLiteProfile(
  fn: (active: boolean, mode: LiteMode) => void
): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLiteFeedLimit(fullDefault = 20): number {
  return isLiteProfileActive() ? 8 : fullDefault;
}

export function getLitePlayerNeighborRadius(): number {
  // ≤2 surfaces: focused + next only (radius 0 on previous side handled by caller)
  return isLiteProfileActive() ? 0 : 1;
}

/** On Lite: mount current + next only (≤2). Full: focused ±1. */
export function shouldMountLitePlayer(
  candidateIndex: number,
  focusedIndex: number
): boolean {
  if (candidateIndex < 0 || focusedIndex < 0) return false;
  if (isLiteProfileActive()) {
    return candidateIndex === focusedIndex || candidateIndex === focusedIndex + 1;
  }
  return Math.abs(candidateIndex - focusedIndex) <= 1;
}

export function getLitePrefetchAhead(): number | undefined {
  if (isLiteProfileActive()) return 1;
  return undefined; // caller uses network-aware default
}

/** Adjacent-card Range prefetch (players stay current+next). */
export function getLiteWarmupUrlCount(): number {
  return isLiteProfileActive() ? 1 : 2;
}

/**
 * Disk warmup: posters + video heads for the first screen.
 * Queued at MAX_CONCURRENT=2 — not extra native players.
 */
export function getLiteDiskWarmupCount(): number {
  return isLiteProfileActive() ? 8 : 2;
}

/**
 * Infinite feed pages kept in React Query RAM.
 * Disk (MMKV) still holds first page aggressively on Lite.
 */
export function getLiteMaxInMemoryFeedPages(): number {
  return isLiteProfileActive() ? 3 : 8;
}

/** Decode budget for posters/thumbnails (px on longest edge). */
export function getLiteImageMaxEdge(itemHint?: number): number {
  if (!isLiteProfileActive()) {
    return typeof itemHint === "number" && itemHint > 0
      ? Math.min(itemHint, 1440)
      : 1440;
  }
  const cap = 720;
  if (typeof itemHint === "number" && itemHint > 0) {
    return Math.min(itemHint, cap);
  }
  return cap;
}

/** JPEG/WebP quality under Lite. */
export function getLiteImageQuality(base = 85): number {
  return isLiteProfileActive() ? Math.min(base, 72) : base;
}

/**
 * expo-image cachePolicy:
 * Lite → disk (avoid memory decode cache pressure)
 * Full → memory-disk (snappy scroll)
 */
export function getLiteImageCachePolicy(): "disk" | "memory-disk" {
  return isLiteProfileActive() ? "disk" : "memory-disk";
}

export function getLiteDrawDistance(full = 480): number {
  return isLiteProfileActive() ? 220 : full;
}

export function getLiteListWindow(): {
  drawDistance: number;
  estimatedItemSize: number;
} {
  const lite = isLiteProfileActive();
  return {
    drawDistance: lite ? 220 : 480,
    estimatedItemSize: lite ? 420 : 500,
  };
}

/** Headers + query extras for For You / Music For You / media lists. */
export function getLiteRequestMeta(limitFull = 20): {
  lite: boolean;
  limit: number;
  headers: Record<string, string>;
  query: Record<string, string>;
} {
  const lite = isLiteProfileActive();
  return {
    lite,
    limit: lite ? 8 : limitFull,
    headers: lite ? { "X-Jevah-Client": "lite" } : {},
    query: lite ? { profile: "lite" } : {},
  };
}

export function isLiteHydrated(): boolean {
  return hydrated;
}
