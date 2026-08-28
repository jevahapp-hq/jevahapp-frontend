/**
 * Live engagement counts from sockets.
 * Rule: sockets may update global counts only — never flip *my* liked/saved.
 */
import { useInteractionStore } from "@/store/useInteractionStore";

export type LiveCountPayload = {
  contentId?: string;
  likeCount?: number;
  totalLikes?: number;
  likes?: number;
  commentCount?: number;
  totalComments?: number;
  comments?: number;
  viewCount?: number;
  totalViews?: number;
  views?: number;
  saveCount?: number;
  totalSaves?: number;
  saves?: number;
  shareCount?: number;
  totalShares?: number;
  shares?: number;
  /** Intentionally ignored if present — never apply to local heart */
  liked?: boolean;
  hasLiked?: boolean;
  userInteraction?: { liked?: boolean };
};

function pickNonNegative(
  ...candidates: Array<number | undefined>
): number | undefined {
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return undefined;
}

/**
 * Apply authoritative live counts to the interaction store.
 * Strips any per-user liked/saved fields from the payload.
 */
export function applyLiveEngagementCounts(payload: LiveCountPayload | null | undefined): void {
  if (!payload?.contentId) return;

  const likes = pickNonNegative(
    payload.likeCount,
    payload.totalLikes,
    payload.likes
  );
  const comments = pickNonNegative(
    payload.commentCount,
    payload.totalComments,
    payload.comments
  );
  const views = pickNonNegative(
    payload.viewCount,
    payload.totalViews,
    payload.views
  );
  const saves = pickNonNegative(
    payload.saveCount,
    payload.totalSaves,
    payload.saves
  );
  const shares = pickNonNegative(
    payload.shareCount,
    payload.totalShares,
    payload.shares
  );

  if (
    likes === undefined &&
    comments === undefined &&
    views === undefined &&
    saves === undefined &&
    shares === undefined
  ) {
    return;
  }

  useInteractionStore.getState().mutateStats(String(payload.contentId), (s) => {
    const patch: Record<string, number> = {};
    if (likes !== undefined && likes !== s.likes) patch.likes = likes;
    if (comments !== undefined && comments !== s.comments) {
      patch.comments = comments;
    }
    if (views !== undefined && views !== s.views) patch.views = views;
    if (saves !== undefined && saves !== s.saves) patch.saves = saves;
    if (shares !== undefined && shares !== s.shares) patch.shares = shares;
    return patch;
  });
}
