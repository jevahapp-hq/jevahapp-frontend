/**
 * Lightweight on-device affinity profile for For You ranking.
 * Not full ML — tracks which content families / tags the user engages with
 * so relaunch can boost similar items and demote already-seen ones harder.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MediaItem } from "../../../../shared/types";

const KEY = "feed_affinity_v1";

export type FeedAffinityProfile = {
  families: Record<string, number>;
  tags: Record<string, number>;
  speakers: Record<string, number>;
  updatedAt: number;
};

const EMPTY: FeedAffinityProfile = {
  families: {},
  tags: {},
  speakers: {},
  updatedAt: 0,
};

let memory: FeedAffinityProfile = { ...EMPTY, families: {}, tags: {}, speakers: {} };

function contentFamily(item: MediaItem): string {
  const t = (item.contentType || "").toLowerCase();
  if (t.includes("video") || t === "live") return "video";
  if (t.includes("audio") || t.includes("music") || t.includes("hymn") || t.includes("podcast"))
    return "audio";
  if (t.includes("book") || t.includes("ebook")) return "ebook";
  if (t.includes("sermon") || t.includes("teaching") || t.includes("devotional"))
    return "sermon";
  return "other";
}

function bump(map: Record<string, number>, key: string, amount: number) {
  if (!key) return;
  map[key] = (map[key] || 0) + amount;
}

async function read(): Promise<FeedAffinityProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, families: {}, tags: {}, speakers: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...EMPTY, families: {}, tags: {}, speakers: {} };
    }
    memory = {
      families: parsed.families || {},
      tags: parsed.tags || {},
      speakers: parsed.speakers || {},
      updatedAt: parsed.updatedAt || 0,
    };
    return memory;
  } catch {
    return { ...EMPTY, families: {}, tags: {}, speakers: {} };
  }
}

async function write(profile: FeedAffinityProfile): Promise<void> {
  memory = profile;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // no-op
  }
}

export async function getFeedAffinity(): Promise<FeedAffinityProfile> {
  if (memory.updatedAt > 0) return memory;
  return read();
}

export function getFeedAffinitySync(): FeedAffinityProfile {
  return memory;
}

/** Call after like / meaningful watch so next session ranks similar content higher. */
export async function recordFeedAffinity(
  item: MediaItem,
  weight = 1
): Promise<void> {
  const profile = await getFeedAffinity();
  bump(profile.families, contentFamily(item), weight);
  const speaker = String(
    (item as any).speaker || (item as any).uploadedByName || ""
  ).trim();
  if (speaker) bump(profile.speakers, speaker.toLowerCase(), weight * 0.8);

  const tags = Array.isArray((item as any).tags)
    ? (item as any).tags
    : Array.isArray((item as any).categories)
      ? (item as any).categories
      : [];
  for (const tag of tags.slice(0, 8)) {
    bump(profile.tags, String(tag).toLowerCase(), weight * 0.6);
  }

  profile.updatedAt = Date.now();
  await write(profile);
}

/** 0–1 affinity score used by rankFeedForYou. */
export function affinityScore(item: MediaItem, profile?: FeedAffinityProfile): number {
  const p = profile || memory;
  if (!p.updatedAt) return 0;

  let score = 0;
  let max = 0;

  const fam = contentFamily(item);
  const famW = p.families[fam] || 0;
  const famMax = Math.max(1, ...Object.values(p.families), 1);
  score += (famW / famMax) * 0.55;
  max += 0.55;

  const speaker = String(
    (item as any).speaker || (item as any).uploadedByName || ""
  )
    .trim()
    .toLowerCase();
  if (speaker && p.speakers[speaker]) {
    const spMax = Math.max(1, ...Object.values(p.speakers), 1);
    score += (p.speakers[speaker] / spMax) * 0.25;
  }
  max += 0.25;

  const tags = Array.isArray((item as any).tags)
    ? (item as any).tags
    : Array.isArray((item as any).categories)
      ? (item as any).categories
      : [];
  if (tags.length && Object.keys(p.tags).length) {
    const tagMax = Math.max(1, ...Object.values(p.tags), 1);
    let tagHit = 0;
    for (const tag of tags) {
      const w = p.tags[String(tag).toLowerCase()] || 0;
      tagHit = Math.max(tagHit, w / tagMax);
    }
    score += tagHit * 0.2;
  }
  max += 0.2;

  return max > 0 ? Math.max(0, Math.min(1, score / max)) : 0;
}
