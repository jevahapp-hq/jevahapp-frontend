/**
 * useVideoCardInteractionStats - Derives like/save/comment/view counts from contentStats and video
 */
import { useHydrateContentStats } from "../../../../../shared/hooks/useHydrateContentStats";
import { useLoadingStats } from "../../../../../shared/hooks/useLoadingStats";
import type { MediaItem } from "../../../../../shared/types";
import {
  getCachedContentInteraction,
  isContentInteractionFresh,
} from "../../../../../../app/utils/contentInteractionPersist";

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

  const fallbackLikeCount = Number(
    video.likeCount ??
      video.totalLikes ??
      video.likes ??
      video.favorite ??
      0
  );
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

  const cached = getCachedContentInteraction(contentId);
  const cacheIsFresh = isContentInteractionFresh(contentId);

  const backendUserLiked =
    (cacheIsFresh && cached?.liked !== undefined
      ? cached.liked
      : undefined) ??
    stats?.userInteractions?.liked ??
    (video as any)?.hasLiked ??
    (video as any)?.userHasLiked ??
    userFavorites[contentKey];
  const backendUserSaved =
    (cacheIsFresh && cached?.saved !== undefined
      ? cached.saved
      : undefined) ??
    stats?.userInteractions?.saved ??
    (video as any)?.hasBookmarked ??
    (video as any)?.isBookmarked;

  const userLikeState = Boolean(backendUserLiked);
  const userSaveState = Boolean(backendUserSaved);

  const storeLikes = Number(stats?.likes ?? 0);
  const storeComments = Number(stats?.comments ?? 0);
  const storeSaves = Number(stats?.saves ?? 0);
  const storeViews = Number(stats?.views ?? 0);
  const globalLikes = Number(globalFavoriteCounts[contentKey] || 0);

  // A recent confirmed mutation beats stale feed/metadata. Outside that short
  // window, surface the best server/feed total available.
  let likeCount =
    cacheIsFresh && cached?.likes !== undefined
      ? Math.max(0, cached.likes)
      : Math.max(storeLikes, globalLikes, fallbackLikeCount);
  if (userLikeState && likeCount < 1) likeCount = 1;

  const saveCount = Math.max(storeSaves, fallbackSaveCount);
  const commentCount = Math.max(storeComments, fallbackCommentCount);
  const viewCount = Math.max(storeViews, fallbackViewCount);

  useHydrateContentStats(contentId, "media");
  const rawLoading = useLoadingStats(contentId);
  const isLoadingStats =
    rawLoading &&
    !stats &&
    fallbackLikeCount === 0 &&
    fallbackCommentCount === 0;

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
