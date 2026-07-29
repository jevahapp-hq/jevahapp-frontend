/**
 * Shared engagement stats for Music / Ebook cards (interaction store).
 */
import { useEffect } from "react";
import {
  useContentCount,
  useContentStats,
  useUserInteraction,
} from "../../../../../../app/store/useInteractionStore";
import { useHydrateContentStats } from "../../../../../shared/hooks/useHydrateContentStats";
import { useLoadingStats } from "../../../../../shared/hooks/useLoadingStats";
import type { MediaItem } from "../../../../../shared/types";

export function useMediaCardStoreStats(
  contentId: string,
  item: MediaItem,
  contentType: string = "media"
) {
  const id = String(contentId || item._id || "unknown");

  // Hooks must run unconditionally
  const stats = useContentStats(id);
  const viewCount = useContentCount(id, "views");
  const commentCount = useContentCount(id, "comments");
  const saveCount = useContentCount(id, "saves");
  const likeCount = useContentCount(id, "likes");
  const userSaveState = useUserInteraction(id, "saved");
  const userLikeState = useUserInteraction(id, "liked");

  useHydrateContentStats(id, contentType);
  const isLoadingStats = useLoadingStats(id);

  useEffect(() => {
    if (!contentId && !item._id) return;
    try {
      const {
        useInteractionStore,
      } = require("../../../../../../app/store/useInteractionStore");
      const load = useInteractionStore.getState().loadContentStats as (
        cid: string,
        type?: string
      ) => Promise<void>;
      void load(id, contentType);
    } catch {
      // ignore
    }
  }, [id, contentType, contentId, item._id]);

  const feedComments = Number(
    (item as any).commentCount ?? item.comments ?? item.comment ?? 0
  );

  return {
    viewCount: viewCount || item.views || 0,
    // `0 || feed` kept stale badges after list returned empty — treat 0 as real.
    commentCount: stats?.commentsConfirmed
      ? Math.max(0, Number(stats.comments ?? 0))
      : Math.max(Number(commentCount || 0), feedComments),
    saveCount: saveCount || (item as any).saves || 0,
    likeCount: likeCount || (item as any).likes || 0,
    userSaveState: !!userSaveState,
    userLikeState: !!userLikeState,
    isLoadingStats,
  };
}
