/**
 * Shared view-qualification rules (TikTok/IG-style).
 * Server re-validates; FE only posts when these pass.
 *
 * Locked product thresholds (2026-07-29):
 * - Video / reels: ≥3s OR ≥25% OR complete
 * - Audio / music / podcast: ≥10s OR ≥20% OR complete
 * - Ebook: ≥10s dwell OR ≥10% read progress OR complete
 */

export const VIEW_QUALIFICATION = {
  video: { minMs: 3000, minProgress: 0.25 },
  audio: { minMs: 10000, minProgress: 0.2 },
  ebook: { minMs: 10000, minProgress: 0.1 },
} as const;

export type ViewFamily = keyof typeof VIEW_QUALIFICATION;

export function qualifiesPlaybackView(params: {
  family: "video" | "audio";
  isPlaying: boolean;
  positionMs: number;
  progress: number; // 0–1
  durationMs?: number;
}): { qualifies: boolean; finished: boolean } {
  const rules = VIEW_QUALIFICATION[params.family];
  const finished =
    (params.durationMs || 0) > 0 &&
    (params.progress >= 0.999 ||
      params.positionMs >= Math.max(0, (params.durationMs || 0) - 250));
  const qualifies =
    finished ||
    (params.isPlaying &&
      (params.positionMs >= rules.minMs ||
        params.progress >= rules.minProgress));
  return { qualifies, finished };
}

export function qualifiesEbookView(params: {
  dwellMs: number;
  progressPct: number; // 0–100
  isComplete?: boolean;
}): boolean {
  const rules = VIEW_QUALIFICATION.ebook;
  if (params.isComplete) return true;
  if (params.dwellMs >= rules.minMs) return true;
  if (params.progressPct >= rules.minProgress * 100) return true;
  return false;
}

/** Map feed contentType → recordView path type (before mapContentTypeForBackend). */
export function viewContentTypeForItem(
  contentType: string | undefined
): string {
  const t = (contentType || "").toLowerCase().trim();
  if (
    t === "podcast" ||
    t === "podcasts"
  ) {
    return "podcast";
  }
  if (
    t === "ebook" ||
    t === "ebooks" ||
    t === "e-books" ||
    t === "books" ||
    t === "book" ||
    t === "pdf"
  ) {
    return "ebook";
  }
  if (t === "devotional" || t === "devotionals") {
    return "devotional";
  }
  // video, music, audio, sermon, media, live, etc.
  return "media";
}
