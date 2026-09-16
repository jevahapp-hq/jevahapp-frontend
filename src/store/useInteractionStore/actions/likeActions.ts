import type { ContentStats } from "@/app/utils/contentInteractionAPI";
import { persistContentInteraction } from "@/app/utils/contentInteractionPersist";
import {
  ensureAuthenticatedForInteraction,
  isAuthenticatedForInteractionSync,
  isGuestForInteractionSync,
  promptInteractionLogin,
} from "@/app/utils/auth/requireAuthForInteraction";
import {
  isRateLimitError,
  RateLimitError,
} from "@/app/utils/contentInteraction/errors";
import { createGestureIdempotencyKey } from "@/app/utils/contentInteraction/idempotency";
import {
  baselineToggleCount,
  baselineToggleFlag,
  reconcileToggleCount,
  reconcileToggleFlag,
} from "@/shared/media/engagementToggle";
import type { StoreGet, StoreSet } from "../types";

export type ToggleLikeOptions = {
  initialLikes?: number;
  initialLiked?: boolean;
};

export type ToggleLikeResult = {
  liked: boolean;
  totalLikes: number;
  rateLimited?: boolean;
  message?: string;
  offlineQueued?: boolean;
  /** Guest / expired session — heart was not changed */
  authRequired?: boolean;
};

const DEFAULT_COOLDOWN_MS = 3000;
let lastRateLimitAlertAt = 0;
/** Latest-wins: ignore stale API responses after rapid like/unlike. */
const likeGeneration = new Map<string, number>();

function rollbackOptimisticLike(set: StoreSet, contentId: string, key: string) {
  set((state: any) => {
    const s = state.contentStats[contentId];
    if (!s) {
      return {
        loadingInteraction: { ...state.loadingInteraction, [key]: false },
      };
    }
    const liked = !s.userInteractions.liked;
    const likes = Math.max(0, (s.likes || 0) + (liked ? 1 : -1));
    return {
      contentStats: {
        ...state.contentStats,
        [contentId]: {
          ...s,
          likes,
          userInteractions: { ...s.userInteractions, liked },
        },
      },
      loadingInteraction: { ...state.loadingInteraction, [key]: false },
    };
  });
}

export function createLikeActions(set: StoreSet, get: StoreGet, api: any) {
  return {
    toggleLike: async (
      contentId: string,
      contentType: string,
      options: ToggleLikeOptions = {}
    ): Promise<ToggleLikeResult> => {
      const key = `${contentId}_like`;
      const now = Date.now();
      const cooldownUntil = get().likeCooldownUntil?.[contentId] ?? 0;

      const currentSnapshot = () => {
        const current = get().contentStats[contentId];
        return {
          liked:
            current?.userInteractions?.liked ?? options.initialLiked ?? false,
          totalLikes: current?.likes ?? options.initialLikes ?? 0,
        };
      };

      // Sync for logged-in users. Guests get the login sheet without a heart flip.
      if (isGuestForInteractionSync()) {
        promptInteractionLogin({
          action: "like",
          message: "Log in to like this and keep it across devices.",
        });
        return { ...currentSnapshot(), authRequired: true };
      }
      if (!isAuthenticatedForInteractionSync()) {
        const auth = await ensureAuthenticatedForInteraction({
          action: "like",
          message: "Log in to like this and keep it across devices.",
        });
        if (!auth.ok) {
          return { ...currentSnapshot(), authRequired: true };
        }
      }

      if (cooldownUntil > now) {
        return {
          ...currentSnapshot(),
          rateLimited: true,
          message: "Please wait a moment before liking again.",
        };
      }

      // IG/TikTok: never block the next tap while a request is in flight.
      // Latest generation wins; stale responses are ignored.
      const generation = (likeGeneration.get(contentId) ?? 0) + 1;
      likeGeneration.set(contentId, generation);

      const existingBefore = get().contentStats[contentId];
      // Seed is the UI truth. A hydrated `liked: false` must not invert a tap
      // on a heart that's red from sticky cache / metadata.
      const baselineLiked = baselineToggleFlag(
        options.initialLiked,
        existingBefore?.userInteractions?.liked
      );
      const baselineLikes = baselineToggleCount(
        options.initialLikes,
        existingBefore?.likes
      );

      const defaultStats: ContentStats = {
        contentId,
        likes: baselineLikes,
        saves: existingBefore?.saves ?? 0,
        shares: existingBefore?.shares ?? 0,
        views: existingBefore?.views ?? 0,
        comments: existingBefore?.comments ?? 0,
        userInteractions: {
          liked: baselineLiked,
          saved: existingBefore?.userInteractions?.saved ?? false,
          shared: existingBefore?.userInteractions?.shared ?? false,
          viewed: existingBefore?.userInteractions?.viewed ?? false,
        },
      };

      set((state: any) => {
        const existing = state.contentStats[contentId];
        const s: ContentStats = existing
          ? {
              ...existing,
              likes: baselineLikes,
              userInteractions: {
                ...existing.userInteractions,
                liked: baselineLiked,
              },
            }
          : defaultStats;

        const liked = !s.userInteractions.liked;
        const likes = Math.max(0, (s.likes || 0) + (liked ? 1 : -1));
        return {
          contentStats: {
            ...state.contentStats,
            [contentId]: {
              ...s,
              likes,
              userInteractions: { ...s.userInteractions, liked },
            },
          },
          // Guard hydrate/socket until this gesture settles. The heart itself
          // already flipped optimistically — this flag is not a UI lock.
          loadingInteraction: { ...state.loadingInteraction, [key]: true },
        };
      });

      const optimistic = get().contentStats[contentId];
      if (optimistic) {
        void persistContentInteraction(contentId, {
          likes: optimistic.likes,
          liked: optimistic.userInteractions?.liked,
          comments: optimistic.comments,
          saves: optimistic.saves,
          views: optimistic.views,
        });
      }

      const idempotencyKey = createGestureIdempotencyKey();

      try {
        const result = await api.toggleLike(contentId, contentType, {
          idempotencyKey,
          baselineLiked,
          expectedLiked: Boolean(optimistic?.userInteractions?.liked),
          expectedTotalLikes: optimistic?.likes ?? 0,
        });

        // A newer tap already moved the heart — ignore this response.
        if (likeGeneration.get(contentId) !== generation) {
          return currentSnapshot();
        }

        // Offline queue accepted the optimistic state — keep heart, clear loading.
        if (result?.offlineQueued || result?.offlineCancelled) {
          return {
            liked: result.liked,
            totalLikes: result.totalLikes,
            offlineQueued: Boolean(result.offlineQueued),
          };
        }

        // Backend `liked` is intermittently pre-toggle. Keep the optimistic
        // heart on mismatch; only adopt the server count when the flag agrees.
        const optimisticLiked = Boolean(optimistic?.userInteractions?.liked);
        const liked = reconcileToggleFlag({
          optimistic: optimisticLiked,
          server: result.liked,
        });
        const flagMismatch = liked !== Boolean(result.liked);
        const nextLikes = reconcileToggleCount({
          optimisticCount: optimistic?.likes ?? 0,
          serverCount: result.totalLikes,
          flagMismatch,
        });
        if (flagMismatch && __DEV__) {
          console.log(
            `ℹ️ LIKE MISMATCH ${contentId}: optimistic=${optimisticLiked} server=${Boolean(
              result.liked
            )} count=${result.totalLikes}. Keeping optimistic liked.`
          );
        }

        set((state: any) => {
          const s = state.contentStats[contentId];
          if (!s) return state;
          return {
            contentStats: {
              ...state.contentStats,
              [contentId]: {
                ...s,
                likes: nextLikes,
                userInteractions: {
                  ...s.userInteractions,
                  liked,
                },
              },
            },
            loadingInteraction: { ...state.loadingInteraction, [key]: false },
          };
        });

        const latest = get().contentStats[contentId];
        if (latest) {
          void persistContentInteraction(contentId, {
            likes: latest.likes,
            liked: latest.userInteractions?.liked,
            comments: latest.comments,
            saves: latest.saves,
            views: latest.views,
          });
        }

        return {
          liked: latest?.userInteractions?.liked ?? liked,
          totalLikes: latest?.likes ?? result.totalLikes,
        };
      } catch (error) {
        // Only roll back if this tap is still the latest gesture.
        if (likeGeneration.get(contentId) !== generation) {
          return currentSnapshot();
        }

        rollbackOptimisticLike(set, contentId, key);

        const currentState = get().contentStats[contentId];
        if (currentState) {
          void persistContentInteraction(contentId, {
            likes: currentState.likes,
            liked: currentState.userInteractions?.liked,
          });
        }

        if (isRateLimitError(error)) {
          const retryAfterMs =
            error instanceof RateLimitError
              ? error.retryAfterMs
              : DEFAULT_COOLDOWN_MS;
          const message =
            error instanceof Error
              ? error.message
              : "Please wait a moment before liking again.";

          set((state: any) => ({
            likeCooldownUntil: {
              ...(state.likeCooldownUntil || {}),
              [contentId]: Date.now() + retryAfterMs,
            },
          }));

          if (Date.now() - lastRateLimitAlertAt > 2000) {
            lastRateLimitAlertAt = Date.now();
            console.warn(`⏳ Like rate-limited for ${contentId}: ${message}`);
          }

          return {
            liked: currentState?.userInteractions?.liked ?? false,
            totalLikes: currentState?.likes ?? 0,
            rateLimited: true,
            message,
          };
        }

        console.error("Error toggling like:", error);
        return {
          liked: currentState?.userInteractions?.liked ?? false,
          totalLikes: currentState?.likes ?? 0,
        };
      }
    },
  };
}
