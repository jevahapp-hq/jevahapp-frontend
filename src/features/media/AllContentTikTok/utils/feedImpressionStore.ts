/**
 * Persistent feed impressions — rotate content across app launches.
 * Stores { id -> lastSeenAt } for ~14 days.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "feed_impressions_v1";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const SESSION_SEED_KEY = "feed_session_seed_v1";
const LAST_SESSION_TOPS_KEY = "feed_last_session_tops_v1";

type ImpressionMap = Record<string, number>;

async function readMap(): Promise<ImpressionMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMap(map: ImpressionMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // no-op
  }
}

/** Prune stale entries and return current map. */
export async function getFeedImpressions(): Promise<ImpressionMap> {
  const map = await readMap();
  const now = Date.now();
  let changed = false;
  for (const [id, ts] of Object.entries(map)) {
    if (!Number.isFinite(ts) || now - ts > MAX_AGE_MS) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) await writeMap(map);
  return map;
}

export async function markFeedImpressions(ids: string[]): Promise<void> {
  const clean = ids.map(String).filter((id) => /^[a-f\d]{24}$/i.test(id));
  if (clean.length === 0) return;
  const map = await getFeedImpressions();
  const now = Date.now();
  for (const id of clean) map[id] = now;
  await writeMap(map);
}

/**
 * Stable-enough session seed that changes each cold start so top of feed rotates.
 */
export async function getOrCreateSessionSeed(): Promise<number> {
  try {
    if ((global as any).__jevahFeedSessionSeed != null) {
      return (global as any).__jevahFeedSessionSeed as number;
    }
    const seed =
      (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
    (global as any).__jevahFeedSessionSeed = seed;
    await AsyncStorage.setItem(SESSION_SEED_KEY, String(seed));
    return seed;
  } catch {
    return (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0 || 1;
  }
}

/** Force a new permutation (pull-to-refresh / explicit reshuffle). */
export async function rotateSessionSeed(): Promise<number> {
  const seed =
    (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
  (global as any).__jevahFeedSessionSeed = seed;
  try {
    await AsyncStorage.setItem(SESSION_SEED_KEY, String(seed));
  } catch {
    // no-op
  }
  return seed;
}

export function idsSeenToday(map: ImpressionMap, now = Date.now()): Set<string> {
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const set = new Set<string>();
  for (const [id, ts] of Object.entries(map)) {
    if (ts >= dayAgo) set.add(id);
  }
  return set;
}

/** Top-of-feed IDs from the previous session — demoted on next cold start. */
export async function getLastSessionTopIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SESSION_TOPS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(String).filter(Boolean));
  } catch {
    return new Set();
  }
}

/** Persist first N ranked IDs when leaving feed so next login rotates away. */
export async function rememberLastSessionTopIds(ids: string[]): Promise<void> {
  const clean = ids.map(String).filter((id) => /^[a-f\d]{24}$/i.test(id)).slice(0, 5);
  if (clean.length === 0) return;
  try {
    await AsyncStorage.setItem(LAST_SESSION_TOPS_KEY, JSON.stringify(clean));
  } catch {
    // no-op
  }
}
