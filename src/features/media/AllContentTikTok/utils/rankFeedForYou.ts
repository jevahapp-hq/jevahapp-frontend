/**
 * Client-side For You ordering.
 * Primary: seeded Fisher–Yates shuffle so each visit/refresh looks different.
 * Light diversity pass avoids long runs of the same content family.
 */
import type { MediaItem } from "../../../../shared/types";
import type { FeedAffinityProfile } from "./feedAffinityStore";

export type FeedRankOptions = {
  previouslyViewedIds?: Set<string> | string[];
  seenTodayIds?: Set<string> | string[];
  /** Cold-start / refresh seed — changes order every visit */
  sessionSeed?: number;
  affinity?: FeedAffinityProfile;
  lastSessionTopIds?: Set<string> | string[];
  /** Soft diversity stride. Default 3. Set 0 to skip. */
  diversifyEvery?: number;
};

function contentFamily(item: MediaItem): string {
  const t = (item.contentType || "").toLowerCase().trim();
  if (t === "video" || t === "videos" || t === "live") return "video";
  if (
    t === "audio" ||
    t === "music" ||
    t === "hymn" ||
    t === "hymns" ||
    t === "podcast" ||
    t === "podcasts"
  )
    return "audio";
  // Exact tokens only — never `.includes("book")` (titles are not contentType)
  if (
    t === "book" ||
    t === "books" ||
    t === "ebook" ||
    t === "ebooks" ||
    t === "e-books" ||
    t === "pdf" ||
    t === "image"
  )
    return "ebook";
  if (t === "sermon" || t === "teaching" || t === "teachings" || t === "devotional")
    return "sermon";
  return "other";
}

function normalizeIds(ids?: Set<string> | string[]): Set<string> {
  if (!ids) return new Set();
  if (ids instanceof Set) return ids;
  return new Set(ids.filter(Boolean));
}

/** Mulberry32 — fast deterministic PRNG from a 32-bit seed */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher–Yates — O(n), uniform permutation */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  const rand = mulberry32(seed >>> 0 || 1);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

type Tagged = { item: MediaItem; family: string };

function diversify(tagged: Tagged[], diversifyEvery: number): Tagged[] {
  if (diversifyEvery <= 0 || tagged.length < 3) return tagged;

  const ordered: Tagged[] = [];
  const pool = [...tagged];

  while (pool.length > 0) {
    const recent = ordered
      .slice(-Math.max(1, diversifyEvery - 1))
      .map((x) => x.family);

    let pickIndex = 0;
    if (recent.length >= diversifyEvery - 1) {
      const dominant = recent[0];
      const allSame = recent.every((f) => f === dominant);
      if (allSame) {
        const alt = pool.findIndex((p) => p.family !== dominant);
        if (alt >= 0) pickIndex = alt;
      }
    }

    ordered.push(pool.splice(pickIndex, 1)[0]);
  }

  return ordered;
}

/**
 * Randomize feed for IG/TikTok-style discovery.
 * - Full seeded shuffle (different order each seed / visit)
 * - Items seen today + last-session tops pushed toward the back
 * - Soft family diversity so you don't get 8 videos in a row
 */
export function rankFeedForYou(
  items: MediaItem[],
  options: FeedRankOptions = {}
): MediaItem[] {
  if (!items?.length) return [];

  const seenToday = normalizeIds(options.seenTodayIds);
  const lastSessionTops = normalizeIds(options.lastSessionTopIds);
  const viewed = normalizeIds(options.previouslyViewedIds);
  const sessionSeed = (options.sessionSeed ?? Date.now()) >>> 0 || 1;
  const diversifyEvery = Math.max(0, options.diversifyEvery ?? 3);

  const primary: MediaItem[] = [];
  const demoted: MediaItem[] = [];

  for (const item of items) {
    const id = String(item._id || "");
    const pushBack =
      (id && seenToday.has(id)) ||
      (id && lastSessionTops.has(id)) ||
      (id && viewed.has(id));
    if (pushBack) demoted.push(item);
    else primary.push(item);
  }

  // Independent shuffles so demoted block also rotates, not a fixed tail order
  const shuffledPrimary = seededShuffle(primary, sessionSeed);
  const shuffledDemoted = seededShuffle(demoted, sessionSeed ^ 0x9e3779b9);

  const tagged: Tagged[] = [...shuffledPrimary, ...shuffledDemoted].map(
    (item) => ({ item, family: contentFamily(item) })
  );

  return diversify(tagged, diversifyEvery).map((x) => x.item);
}

export function pickMostRecentItem(items: MediaItem[]): MediaItem | null {
  if (!items?.length) return null;
  let best: MediaItem | null = null;
  let bestTs = -Infinity;
  for (const item of items) {
    const ts = Date.parse(item.createdAt || "");
    if (Number.isFinite(ts) && ts > bestTs) {
      bestTs = ts;
      best = item;
    }
  }
  return best;
}

/** New seed for pull-to-refresh / remount — guarantees a new permutation */
export function createFeedShuffleSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
}
