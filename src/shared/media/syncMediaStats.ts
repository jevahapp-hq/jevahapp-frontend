import { useInteractionStore } from "@/store/useInteractionStore";
import {
  getCachedContentInteraction,
  isContentInteractionFresh,
} from "../../../app/utils/contentInteractionPersist";
import type { MediaItem } from "../types";

/** Sync stats from media items to useInteractionStore to prevent redundant metadata fetches */
export function syncMediaStatsToInteractionStore(items: MediaItem[]): void {
  if (!items || items.length === 0) return;

  try {
    const store = useInteractionStore.getState();
    const statsUpdate: Record<string, any> = {};

    items.forEach((item) => {
      const id = item._id;
      if (!id) return;

      const mediaLikes =
        item.totalLikes ?? item.likeCount ?? item.likes ?? item.favorite ?? 0;
      const mediaSaves = item.saves ?? item.saved ?? 0;
      const mediaShares =
        item.totalShares ?? item.shareCount ?? item.shares ?? 0;
      const mediaViews = item.totalViews ?? item.viewCount ?? item.views ?? 0;
      const mediaComments =
        item.commentCount ?? item.comments ?? item.comment ?? 0;
      const mediaLiked = Boolean(item.hasLiked);
      const mediaSaved = Boolean(item.hasBookmarked);

      const existing = store.contentStats[id];
      const cached = getCachedContentInteraction(id);
      const cacheIsFresh = isContentInteractionFresh(id);
      if (!existing) {
        statsUpdate[id] = {
          contentId: id,
          likes:
            cacheIsFresh && cached?.likes !== undefined
              ? Math.max(0, cached.likes)
              : mediaLikes,
          saves:
            cacheIsFresh && cached?.saves !== undefined
              ? Math.max(0, cached.saves)
              : mediaSaves,
          shares: mediaShares,
          views: mediaViews,
          comments: mediaComments,
          userInteractions: {
            liked:
              cacheIsFresh && cached?.liked !== undefined
                ? cached.liked
                : mediaLiked,
            saved:
              cacheIsFresh && cached?.saved !== undefined
                ? cached.saved
                : mediaSaved,
            shared: Boolean(item.hasShared),
            viewed: Boolean(item.hasViewed),
          },
        };
        return;
      }

      const nextLikes =
        cacheIsFresh && cached?.likes !== undefined
          ? Math.max(0, cached.likes)
          : (existing.likes ?? 0) > 0
            ? existing.likes
            : Math.max(existing.likes ?? 0, mediaLikes);
      const nextComments =
        (existing.comments ?? 0) > 0
          ? existing.comments
          : Math.max(existing.comments ?? 0, mediaComments);
      const nextSaves =
        (existing.saves ?? 0) > 0
          ? existing.saves
          : Math.max(existing.saves ?? 0, mediaSaves);
      const nextViews =
        (existing.views ?? 0) > 0
          ? existing.views
          : Math.max(existing.views ?? 0, mediaViews);

      const nextLiked =
        cacheIsFresh && cached?.liked !== undefined
          ? cached.liked
          : existing.userInteractions?.liked || mediaLiked;
      const nextSaved =
        cacheIsFresh && cached?.saved !== undefined
          ? cached.saved
          : existing.userInteractions?.saved || mediaSaved;

      if (
        nextLikes !== existing.likes ||
        nextComments !== existing.comments ||
        nextSaves !== existing.saves ||
        nextViews !== existing.views ||
        nextLiked !== existing.userInteractions?.liked ||
        nextSaved !== existing.userInteractions?.saved
      ) {
        statsUpdate[id] = {
          ...existing,
          likes: nextLikes,
          saves: nextSaves,
          shares: Math.max(existing.shares ?? 0, mediaShares),
          views: nextViews,
          comments: nextComments,
          userInteractions: {
            ...existing.userInteractions,
            liked: nextLiked,
            saved: nextSaved,
          },
        };
      }
    });

    if (Object.keys(statsUpdate).length > 0) {
      useInteractionStore.setState((state) => ({
        contentStats: { ...state.contentStats, ...statsUpdate },
      }));
    }
  } catch (err) {
    if (__DEV__) console.warn("Failed to sync media stats:", err);
  }
}
