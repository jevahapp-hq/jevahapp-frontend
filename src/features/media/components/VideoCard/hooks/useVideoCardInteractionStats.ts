/**
 * useVideoCardInteractionStats - Derives like/save/comment/view counts from contentStats and video
 */
import { useHydrateContentStats } from "../../../../../shared/hooks/useHydrateContentStats";
import { useLoadingStats } from "../../../../../shared/hooks/useLoadingStats";
import type { MediaItem } from "../../../../shared/types";

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

  const stats = contentStats[contentId] || {};
  const fallbackLikeCount =
    globalFavoriteCounts[contentKey] ??
    video.likeCount ??
    video.totalLikes ??
    video.likes ??
    video.favorite ??
    0;
  const fallbackSaveCount =
    video.saves ??
    video.saved ??
    (video as any)?.saveCount ??
    bookmarkCount ??
    0;
  const fallbackCommentCount =
    video.commentCount ?? video.comments ?? video.comment ?? 0;
  const fallbackViewCount =
    video.viewCount ?? video.totalViews ?? video.views ?? 0;

  const backendUserLiked =
    contentStats[contentId]?.userInteractions?.liked ??
    (video as any)?.hasLiked ??
    (video as any)?.userHasLiked ??
    userFavorites[contentKey];
  const backendUserSaved =
    contentStats[contentId]?.userInteractions?.saved ??
    (video as any)?.hasBookmarked ??
    (video as any)?.isBookmarked;

  const userLikeState = Boolean(backendUserLiked);
  const userSaveState = Boolean(backendUserSaved);
  const likeCount =
    stats?.likes != null ? Math.max(stats.likes, fallbackLikeCount) : fallbackLikeCount;
  const saveCount =
    stats?.saves != null ? Math.max(stats.saves, fallbackSaveCount) : fallbackSaveCount;
  const commentCount =
    stats?.comments != null
      ? Math.max(stats.comments, fallbackCommentCount)
      : fallbackCommentCount;
  const viewCount =
    stats?.views != null ? Math.max(stats.views, fallbackViewCount) : fallbackViewCount;

  useHydrateContentStats(contentId, "media");
  const isLoadingStats = useLoadingStats(contentId);

  return {
    likeCount,
    saveCount,
    commentCount,
    viewCount,
    userLikeState,
    userSaveState,
    isLoadingStats,
  };
}
