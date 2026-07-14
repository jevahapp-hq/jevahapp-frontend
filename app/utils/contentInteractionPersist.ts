/**
 * Persist liked/saved counts so cold start doesn't flash gray then red,
 * and doesn't keep a red heart with a zero count.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "jevah_content_interaction_stats_v2";
export const INTERACTION_CACHE_TTL_MS = 10 * 60 * 1000;

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

export async function getPersistedContentInteractions(): Promise<PersistedMap> {
  memoryCache = await readMap();
  return memoryCache;
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
  const disk = await readMap();
  const map = { ...disk, ...memoryCache };
  // Cap map size to avoid unbounded growth
  const entries = Object.entries(map).sort(
    (a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)
  );
  const trimmed = Object.fromEntries(entries.slice(0, 400));
  await writeMap(trimmed);
}
