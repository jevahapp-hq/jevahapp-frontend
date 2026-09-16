/**
 * Shared engagement stats for Music / Ebook cards (same read path as Video + Reels).
 */
import { useContentLikeState } from "../../../../../shared/hooks/useContentLikeState";
import { useContentSaveState } from "../../../../../shared/hooks/useContentSaveState";
import {
  commentCountFromMetadata,
  resolveCommentDisplayCount,
} from "../../../../../shared/media/engagementDisplay";
import type { MediaItem } from "../../../../../shared/types";
import {
  useContentCount,
  useContentStats,
} from "@/store/useInteractionStore";
import { useHydrateContentStats } from "../../../../../shared/hooks/useHydrateContentStats";

export function useMediaCardStoreStats(
  contentId: string,
  item: MediaItem,
  contentType: string = "media"
) {
  const id = String(contentId || item._id || "unknown");

  const stats = useContentStats(id);
  const viewCount = useContentCount(id, "views");
  const commentCount = useContentCount(id, "comments");
  const like = useContentLikeState(id, item as any);
  const save = useContentSaveState(id, item as any);

  useHydrateContentStats(id, contentType);

  const fallbackViewCount = Number(
    (item as any).viewCount ?? (item as any).totalViews ?? item.views ?? 0
  );

  return {
    viewCount: Math.max(Number(viewCount) || 0, fallbackViewCount),
    commentCount: resolveCommentDisplayCount({
      storeComments: stats?.comments ?? commentCount,
      commentsConfirmed: stats?.commentsConfirmed,
      fallback: commentCountFromMetadata(item as any),
    }),
    saveCount: save.saveCount,
    likeCount: like.likeCount,
    userSaveState: save.saved,
    userLikeState: like.liked,
    isLoadingStats: false,
  };
}
