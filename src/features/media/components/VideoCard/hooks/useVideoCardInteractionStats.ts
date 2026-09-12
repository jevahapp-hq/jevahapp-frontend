/**
 * useVideoCardInteractionStats - Derives like/save/comment/view counts from contentStats and video
 */
import { useContentLikeState } from "../../../../../shared/hooks/useContentLikeState";
import { useContentSaveState } from "../../../../../shared/hooks/useContentSaveState";
import { useHydrateContentStats } from "../../../../../shared/hooks/useHydrateContentStats";
import {
  commentCountFromMetadata,
  resolveCommentDisplayCount,
} from "../../../../../shared/media/engagementDisplay";
import type { MediaItem } from "../../../../../shared/types";
import {
  useContentCount,
  useContentStats,
} from "@/store/useInteractionStore";

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

  const stats = useContentStats(contentId) || contentStats[contentId];
  const liveComments = useContentCount(contentId, "comments");
  const liveViews = useContentCount(contentId, "views");

  const fallbackCommentCount = commentCountFromMetadata(video as any);
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
  const save = useContentSaveState(contentId, {
    hasBookmarked: (video as any)?.hasBookmarked,
    isBookmarked: (video as any)?.isBookmarked,
    bookmarkCount,
    saveCount: (video as any)?.saveCount,
    saves: video.saves,
    saved: video.saved,
  });

  const userLikeState = like.liked;
  const likeCount = like.likeCount;
  const userSaveState = save.saved;
  const saveCount = save.saveCount;

  const storeComments = Number(stats?.comments ?? liveComments ?? 0);
  const storeViews = Number(stats?.views ?? liveViews ?? 0);

  const commentCount = resolveCommentDisplayCount({
    storeComments,
    commentsConfirmed: stats?.commentsConfirmed,
    fallback: fallbackCommentCount,
  });
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
