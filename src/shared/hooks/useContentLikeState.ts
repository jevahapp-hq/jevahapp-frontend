/**
 * The single read path for "is this liked, and by how many".
 *
 * The feed and Reels used to derive this differently: the feed layered the
 * sticky 30-day AsyncStorage flag and item metadata on top of the store, while
 * Reels read the store alone. So a like made in the feed showed as unliked in
 * Reels whenever the store entry was missing (cold start, deep link) or had
 * been healed back to `false` by a metadata refetch returning `hasLiked: false`.
 *
 * Both surfaces now call this, so they cannot disagree.
 */
import {
  getCachedContentInteraction,
  isContentInteractionFresh,
  resolveLikedFlag,
} from "../../../app/utils/contentInteractionPersist";
import {
  useContentCount,
  useInteractionStore,
  useUserInteraction,
} from "@/store/useInteractionStore";

/** Any shape carrying like metadata from a feed/reels payload. */
export type LikeMetadataSource = {
  hasLiked?: boolean | null;
  userHasLiked?: boolean | null;
  likeCount?: number | null;
  totalLikes?: number | null;
  likes?: number | null;
  favorite?: number | null;
} | null | undefined;

export type ContentLikeState = {
  liked: boolean;
  likeCount: number;
  /** Seed for `toggleLike`, so an optimistic flip starts from the truth. */
  toggleSeed: { initialLiked: boolean; initialLikes: number };
};

/** Best like total the item payload itself can offer. */
export function likeCountFromMetadata(item: LikeMetadataSource): number {
  const raw =
    item?.likeCount ?? item?.totalLikes ?? item?.likes ?? item?.favorite ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Liked boolean the item payload itself can offer. */
export function likedFromMetadata(
  item: LikeMetadataSource
): boolean | undefined {
  if (typeof item?.hasLiked === "boolean") return item.hasLiked;
  if (typeof item?.userHasLiked === "boolean") return item.userHasLiked;
  return undefined;
}

/**
 * Non-hook equivalent for imperative call sites (tap handlers reading via
 * `getState()`). Kept next to the hook so the two can't drift.
 */
export function resolveLikeSeed(
  contentId: string,
  item?: LikeMetadataSource
): { initialLiked: boolean; initialLikes: number } {
  const stats = useInteractionStore.getState().contentStats[contentId];
  const cached = getCachedContentInteraction(contentId);
  const cacheIsFresh = isContentInteractionFresh(contentId);

  const initialLiked = Boolean(
    resolveLikedFlag(
      contentId,
      stats?.userInteractions?.liked ?? likedFromMetadata(item)
    )
  );

  const initialLikes = Number(
    stats?.likes ??
      (cacheIsFresh ? cached?.likes : undefined) ??
      likeCountFromMetadata(item)
  );

  return {
    initialLiked,
    initialLikes: Number.isFinite(initialLikes) ? Math.max(0, initialLikes) : 0,
  };
}

export function useContentLikeState(
  contentId: string,
  item?: LikeMetadataSource,
  /** Extra liked hint from a surface-local map, e.g. the feed's userFavorites. */
  likedHint?: boolean,
  /** Extra count hint from a surface-local map, e.g. globalFavoriteCounts. */
  countHint?: number
): ContentLikeState {
  const storeLiked = useUserInteraction(contentId, "liked");
  const storeLikes = useContentCount(contentId, "likes");

  const metadataLiked = likedFromMetadata(item);
  const metadataCount = likeCountFromMetadata(item);

  // Sticky local flag wins over a stale server `hasLiked: false`.
  const liked = Boolean(
    resolveLikedFlag(contentId, storeLiked || metadataLiked || likedHint)
  );

  const cached = getCachedContentInteraction(contentId);
  const cacheIsFresh = isContentInteractionFresh(contentId);

  // A recently confirmed mutation beats stale feed metadata; outside that
  // window show the highest total any source knows about.
  let likeCount =
    cacheIsFresh && cached?.likes !== undefined
      ? Math.max(0, cached.likes)
      : Math.max(
          Number(storeLikes) || 0,
          Number(countHint) || 0,
          metadataCount
        );

  // A liked item can never legitimately read zero.
  if (liked && likeCount < 1) likeCount = 1;

  return {
    liked,
    likeCount,
    toggleSeed: { initialLiked: liked, initialLikes: likeCount },
  };
}
