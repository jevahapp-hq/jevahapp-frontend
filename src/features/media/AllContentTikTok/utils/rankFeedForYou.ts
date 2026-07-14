/**
 * Client-side For You ranking until /api/feed/for-you ships.
 * Scores: engagement + recency + affinity + diversity + cross-session rotation.
 */
import type { MediaItem } from "../../../../shared/types";
import {
  affinityScore,
  type FeedAffinityProfile,
} from "./feedAffinityStore";

export type FeedRankOptions = {
  /** Content IDs the user has already viewed locally */
  previouslyViewedIds?: Set<string> | string[];
  /** IDs impressed in the last 24h — demoted hard so relaunch feels different */
  seenTodayIds?: Set<string> | string[];
  /** Cold-start seed so top-of-feed order rotates each launch */
  sessionSeed?: number;
  /** On-device preference profile (likes / watches) */
  affinity?: FeedAffinityProfile;
  /** Prefer slightly more freshness (0–1). Default 0.4 */
  recencyWeight?: number;
  /** Prefer engagement (likes/views/comments). Default 0.45 */
  engagementWeight?: number;
  /** Prefer user affinity. Default 0.35 */
  affinityWeight?: number;
  /** Soft-penalize already viewed items. Default 0.55 */
  viewedPenalty?: number;
  /** Soft diversity stride. Default 4 */
  diversifyEvery?: number;
};

const HOUR_MS = 60 * 60 * 1000;

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getEngagement(item: MediaItem) {
  const likes = asNumber(item.likes ?? item.likeCount ?? item.totalLikes ?? item.favorite);
  const views = asNumber(item.views ?? item.viewCount ?? item.totalViews);
  const comments = asNumber(item.comments ?? item.commentCount ?? item.comment);
  const shares = asNumber(item.shares ?? item.shareCount ?? item.totalShares ?? item.sheared);
  const saves = asNumber(item.saves ?? item.saved);
  return { likes, views, comments, shares, saves };
}

function engagementScore(item: MediaItem): number {
  const { likes, views, comments, shares, saves } = getEngagement(item);
  return (
    Math.log1p(likes) * 3.2 +
    Math.log1p(views) * 1.4 +
    Math.log1p(comments) * 2.6 +
    Math.log1p(shares) * 2.2 +
    Math.log1p(saves) * 1.8
  );
}

function recencyScore(item: MediaItem, now: number): number {
  const created = Date.parse(item.createdAt || "");
  if (!Number.isFinite(created)) return 0.15;
  const ageHours = Math.max(0, (now - created) / HOUR_MS);
  if (ageHours <= 6) return 1;
  if (ageHours <= 48) return 0.85;
  if (ageHours <= 7 * 24) return 0.55;
  if (ageHours <= 14 * 24) return 0.3;
  return Math.max(0.08, Math.exp(-ageHours / (21 * 24)));
}

function contentFamily(item: MediaItem): string {
  const t = (item.contentType || "").toLowerCase();
  if (t.includes("video") || t === "live") return "video";
  if (t.includes("audio") || t.includes("music") || t.includes("hymn") || t.includes("podcast"))
    return "audio";
  if (t.includes("book") || t.includes("ebook")) return "ebook";
  if (t.includes("sermon") || t.includes("teaching") || t.includes("devotional")) return "sermon";
  return "other";
}

function normalizeIds(ids?: Set<string> | string[]): Set<string> {
  if (!ids) return new Set();
  if (ids instanceof Set) return ids;
  return new Set(ids.filter(Boolean));
}

function seededJitter(id: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 0x9e3779b1);
  }
  return ((h >>> 0) % 10000) / 10000;
}

type Scored = { item: MediaItem; score: number; family: string };

function diversify(scored: Scored[], diversifyEvery: number): Scored[] {
  const ordered: Scored[] = [];
  const pool = [...scored];

  while (pool.length > 0) {
    const recentFamilies = ordered
      .slice(-Math.max(1, diversifyEvery - 1))
      .map((x) => x.family);

    let pickIndex = 0;
    if (recentFamilies.length >= diversifyEvery - 1) {
      const dominant = recentFamilies[0];
      const allSame = recentFamilies.every((f) => f === dominant);
      if (allSame) {
        const alt = pool.findIndex((p) => p.family !== dominant);
        if (alt >= 0) pickIndex = alt;
      }
    }

    ordered.push(pool.splice(pickIndex, 1)[0]);
  }

  return ordered;
}

function scoreBucket(
  items: MediaItem[],
  options: {
    now: number;
    viewed: Set<string>;
    sessionSeed: number;
    recencyWeight: number;
    engagementWeight: number;
    affinityWeight: number;
    viewedPenalty: number;
    affinity?: FeedAffinityProfile;
  }
): Scored[] {
  const {
    now,
    viewed,
    sessionSeed,
    recencyWeight,
    engagementWeight,
    affinityWeight,
    viewedPenalty,
    affinity,
  } = options;

  return items.map((item, index) => {
    const id = String(item._id || "");
    const eng = engagementScore(item);
    const rec = recencyScore(item, now);
    const aff = affinityScore(item, affinity);
    let score =
      eng * engagementWeight +
      rec * recencyWeight * 8 +
      aff * affinityWeight * 10;

    // Session rotation among near-ties — different top item each cold start
    score += seededJitter(id || String(index), sessionSeed) * 2.4;
    score += (items.length - index) * 0.0001;

    if (id && viewed.has(id)) {
      score *= 1 - viewedPenalty;
    }

    const ageMs = now - Date.parse(item.createdAt || "");
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 12 * HOUR_MS && eng < 1) {
      score += 2.5;
    }

    return { item, score, family: contentFamily(item) };
  });
}

/**
 * Rank media for a TikTok/IG-style feed ordering.
 * Items seen today are pushed below fresh ones so relaunch feels different.
 */
export function rankFeedForYou(
  items: MediaItem[],
  options: FeedRankOptions = {}
): MediaItem[] {
  if (!items?.length) return [];

  const now = Date.now();
  const viewed = normalizeIds(options.previouslyViewedIds);
  const seenToday = normalizeIds(options.seenTodayIds);
  const sessionSeed = options.sessionSeed ?? 1;
  const recencyWeight = options.recencyWeight ?? 0.4;
  const engagementWeight = options.engagementWeight ?? 0.45;
  const affinityWeight = options.affinityWeight ?? 0.35;
  const viewedPenalty = options.viewedPenalty ?? 0.55;
  const diversifyEvery = Math.max(2, options.diversifyEvery ?? 4);

  const fresh: MediaItem[] = [];
  const recycled: MediaItem[] = [];
  for (const item of items) {
    const id = String(item._id || "");
    if (id && seenToday.has(id)) recycled.push(item);
    else fresh.push(item);
  }

  const scoreOpts = {
    now,
    viewed,
    sessionSeed,
    recencyWeight,
    engagementWeight,
    affinityWeight,
    viewedPenalty,
    affinity: options.affinity,
  };

  const freshScored = scoreBucket(fresh, scoreOpts).sort(
    (a, b) => b.score - a.score
  );
  const recycledScored = scoreBucket(recycled, {
    ...scoreOpts,
    // Seen in last 24h: heavy demotion so next login isn't the same top cards
    viewedPenalty: Math.min(0.92, viewedPenalty + 0.35),
    affinityWeight: affinityWeight * 0.5,
  }).sort((a, b) => b.score - a.score);

  const ordered = [
    ...diversify(freshScored, diversifyEvery),
    ...diversify(recycledScored, diversifyEvery),
  ];

  return ordered.map((x) => x.item);
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
