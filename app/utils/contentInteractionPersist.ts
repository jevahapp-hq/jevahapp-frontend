/**
 * Persist liked/saved counts so cold start doesn't flash gray then red.
 *
 * Counts use a short freshness window (avoid stale totals).
 * Liked/saved *booleans* stay sticky until the user toggles again — otherwise
 * a broken backend hasLiked:false wipes the red heart after ~10 minutes.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trimInteractionMap } from "./contentInteractionPersistTrim";

const KEY = "jevah_content_interaction_stats_v2";
/** Counts / totals — short window so feed numbers can catch up */
export const INTERACTION_CACHE_TTL_MS = 10 * 60 * 1000;
/**
 * Affirmative like/save flags — keep until user unlikes/unsaves.
 * Backend currently returns inconsistent hasLiked; without this the heart
 * disappears after the short TTL even though the user liked.
 */
export const INTERACTION_FLAG_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type PersistedContentInteraction = {
  likes?: number;
  saves?: number;
  comments?: number;
  views?: number;
  liked?: boolean;
  saved?: boolean;
  updatedAt?: number;
};

type PersistedMap = Record<string, PersistedContentInteraction>;
let memoryCache: PersistedMap = {};
let diskHydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 200;

async function getUserScope(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem("user");
    if (!raw) return "anonymous";
    const user = JSON.parse(raw);
    return String(user?._id || user?.id || user?.email || "anonymous");
  } catch {
    return "anonymous";
  }
}

async function storageKey(): Promise<string> {
  return `${KEY}:${await getUserScope()}`;
}

async function readMap(): Promise<PersistedMap> {
  try {
    const raw = await AsyncStorage.getItem(await storageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMap(map: PersistedMap): Promise<void> {
  try {
    await AsyncStorage.setItem(await storageKey(), JSON.stringify(map));
  } catch {
    // no-op
  }
}

export { trimInteractionMap } from "./contentInteractionPersistTrim";

export async function getPersistedContentInteractions(): Promise<PersistedMap> {
  const disk = await readMap();
  memoryCache = { ...disk, ...memoryCache };
  diskHydrated = true;
  return memoryCache;
}

async function flushPersistedInteractions(): Promise<void> {
  if (!diskHydrated) {
    const disk = await readMap();
    memoryCache = { ...disk, ...memoryCache };
    diskHydrated = true;
  }
  memoryCache = trimInteractionMap(memoryCache);
  await writeMap(memoryCache);
}

function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void flushPersistedInteractions();
  }, PERSIST_DEBOUNCE_MS);
}

export function getCachedContentInteraction(
  contentId: string
): PersistedContentInteraction | undefined {
  return memoryCache[contentId];
}

export function isContentInteractionFresh(
  contentId: string,
  maxAgeMs = INTERACTION_CACHE_TTL_MS
): boolean {
  const updatedAt = memoryCache[contentId]?.updatedAt;
  return (
    typeof updatedAt === "number" &&
    updatedAt > 0 &&
    Date.now() - updatedAt <= maxAgeMs
  );
}

/** True while we still trust a local liked/saved boolean over feed metadata. */
export function isInteractionFlagFresh(
  contentId: string,
  maxAgeMs = INTERACTION_FLAG_TTL_MS
): boolean {
  return isContentInteractionFresh(contentId, maxAgeMs);
}

/**
 * Prefer local liked/saved when present and within flag TTL.
 * Never let a stale feed `hasLiked: false` clear a known like.
 */
export function resolveLikedFlag(
  contentId: string,
  fallback?: boolean | null
): boolean | undefined {
  const cached = memoryCache[contentId];
  if (
    cached &&
    typeof cached.liked === "boolean" &&
    isInteractionFlagFresh(contentId)
  ) {
    return cached.liked;
  }
  if (typeof fallback === "boolean") return fallback;
  return undefined;
}

export function resolveSavedFlag(
  contentId: string,
  fallback?: boolean | null
): boolean | undefined {
  const cached = memoryCache[contentId];
  if (
    cached &&
    typeof cached.saved === "boolean" &&
    isInteractionFlagFresh(contentId)
  ) {
    return cached.saved;
  }
  if (typeof fallback === "boolean") return fallback;
  return undefined;
}

export async function persistContentInteraction(
  contentId: string,
  patch: PersistedContentInteraction
): Promise<void> {
  if (!contentId) return;
  // Update RAM synchronously so a stale response in the same render cannot win.
  memoryCache[contentId] = {
    ...memoryCache[contentId],
    ...patch,
    updatedAt: Date.now(),
  };
  schedulePersist();
}
