/**
 * useVideoCardInteractionStats - Derives like/save/comment/view counts from contentStats and video
 */
import { useContentLikeState } from "../../../../../shared/hooks/useContentLikeState";
import { useHydrateContentStats } from "../../../../../shared/hooks/useHydrateContentStats";
import type { MediaItem } from "../../../../../shared/types";
import { resolveSavedFlag } from "../../../../../../app/utils/contentInteractionPersist";

export interface UseVideoCardInteractionStatsParams {
  video: MediaItem;
  contentId: string;
  contentKey: string;
  contentStats: Record<string, any>;
  userFavorites: Record<string, boolean>;
  globalFavoriteCounts: Record<string, number>;
}

export function useVideoCardInteractionStats({
  video,
  contentId,
  contentKey,
  contentStats,
  userFavorites,
  globalFavoriteCounts,
}: UseVideoCardInteractionStatsParams) {
  const bookmarkCount =
    typeof (video as any)?.bookmarkCount === "number"
      ? (video as any).bookmarkCount
      : undefined;

  const stats = contentStats[contentId];

  const fallbackSaveCount = Number(
    video.saves ??
      video.saved ??
      (video as any)?.saveCount ??
      bookmarkCount ??
      0
  );
  const fallbackCommentCount = Number(
    video.commentCount ?? video.comments ?? video.comment ?? 0
  );
  const fallbackViewCount = Number(
    video.viewCount ?? video.totalViews ?? video.views ?? 0
  );

  // Shared with Reels so the two surfaces cannot disagree about a like.
  const like = useContentLikeState(
    contentId,
    video as any,
    userFavorites[contentKey],
    globalFavoriteCounts[contentKey]
  );

  // Saved flag is sticky (30d) so a bad API hasBookmarked:false can't clear it.
  const backendUserSaved = resolveSavedFlag(
    contentId,
    stats?.userInteractions?.saved ??
      (video as any)?.hasBookmarked ??
      (video as any)?.isBookmarked
  );

  const userLikeState = like.liked;
  const likeCount = like.likeCount;
  const userSaveState = Boolean(backendUserSaved);

  const storeComments = Number(stats?.comments ?? 0);
  const storeSaves = Number(stats?.saves ?? 0);
  const storeViews = Number(stats?.views ?? 0);

  const saveCount = Math.max(storeSaves, fallbackSaveCount);
  // After comments list loads, store total is truth (incl. 0). Never Math.max with stale feed.
  const commentCount = stats?.commentsConfirmed
    ? Math.max(0, storeComments)
    : Math.max(storeComments, fallbackCommentCount);
  const viewCount = Math.max(storeViews, fallbackViewCount);

  useHydrateContentStats(contentId, "media");

  return {
    likeCount,
    saveCount,
    commentCount,
    viewCount,
    userLikeState,
    userSaveState,
    isLoadingStats: false,
    /** Pass to `toggleLike` so the optimistic flip starts from the truth. */
    likeToggleSeed: like.toggleSeed,
  };
}
