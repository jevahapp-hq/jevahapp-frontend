import {
  useCallback,
  useEffect,
  useState,
  type MutableRefObject,
} from "react";
import type { MediaItem } from "../../../../shared/types";
import {
  getBestVideoUrl,
  getVideoUrlFromMedia,
} from "../../../../shared/utils/videoUrlManager";
import { FEED_PRELOAD_WARM_DISTANCE } from "../../video-feed";
import { getFeedContentKind } from "../utils/feedContentKind";
import { warmVideoConnection } from "../utils/videoConnectionWarmer";
import type { FeedRow } from "../types";

export interface UseMostRecentFastPathParams {
  mostRecentItem: MediaItem | null | undefined;
  heroRowKey: string | null;
  listData: FeedRow[];
  isFeedActive: boolean;
  /** Reactive autoplay flag — must be a dep so cold-start retries when it flips on. */
  isAutoPlayEnabled: boolean;
  isAutoPlayEnabledRef: MutableRefObject<boolean>;
  currentlyVisibleVideoRef: MutableRefObject<string | null>;
  hasDeterminedVisibilityRef: MutableRefObject<boolean>;
  setCurrentlyVisibleVideo: (key: string | null) => void;
  playMedia: (key: string, type: "video" | "audio") => void;
  mediaItemBySeqRef: MutableRefObject<Record<number, MediaItem>>;
}

export interface UseMostRecentFastPathResult {
  /** True once the hero VideoCard reports first-frame ready (or hero is non-video). */
  heroPrimed: boolean;
  onHeroSurfaceReadyChange: (ready: boolean) => void;
  isHeroRow: (rowKey: string) => boolean;
}

function warmVideoSeqRange(
  mediaItemBySeqRef: MutableRefObject<Record<number, MediaItem>>,
  centerSeq: number,
  distance: number
) {
  for (let d = -distance; d <= distance; d++) {
    const item = mediaItemBySeqRef.current[centerSeq + d];
    if (!item) continue;
    if (getFeedContentKind(item) !== "video") continue;
    const rawUrl = getVideoUrlFromMedia(item);
    if (rawUrl) warmVideoConnection(getBestVideoUrl(rawUrl));
  }
}

/**
 * Most Recent fast path: warm CDN early, activate autoplay without waiting
 * for FlashList viewability, and expose hero primed state for decoder budget.
 */
export function useMostRecentFastPath({
  mostRecentItem,
  heroRowKey,
  listData,
  isFeedActive,
  isAutoPlayEnabled,
  isAutoPlayEnabledRef,
  currentlyVisibleVideoRef,
  hasDeterminedVisibilityRef,
  setCurrentlyVisibleVideo,
  playMedia,
  mediaItemBySeqRef,
}: UseMostRecentFastPathParams): UseMostRecentFastPathResult {
  const [heroPrimed, setHeroPrimed] = useState(false);

  useEffect(() => {
    setHeroPrimed(false);
  }, [heroRowKey]);

  useEffect(() => {
    if (!isFeedActive || !mostRecentItem) return;
    if (getFeedContentKind(mostRecentItem) !== "video") {
      setHeroPrimed(true);
      return;
    }
    const rawUrl = getVideoUrlFromMedia(mostRecentItem);
    if (rawUrl) warmVideoConnection(getBestVideoUrl(rawUrl));
  }, [isFeedActive, mostRecentItem]);

  useEffect(() => {
    if (!isFeedActive) return;
    if (hasDeterminedVisibilityRef.current) return;
    // Prefer reactive flag; refs alone never retrigger when autoplay enables.
    if (!isAutoPlayEnabled && !isAutoPlayEnabledRef.current) return;

    // Prefer the marked hero row; fall back to first media video.
    const heroMediaRow =
      listData.find(
        (row) =>
          row.rowType === "media" &&
          row.isHero &&
          getFeedContentKind(row.item) === "video"
      ) ||
      listData.find(
        (row) =>
          row.rowType === "media" && getFeedContentKind(row.item) === "video"
      );

    if (!heroMediaRow || heroMediaRow.rowType !== "media") {
      return;
    }

    // Re-assert visibility + play even if we already set the key — covers the
    // case where play fired before the decoder mounted.
    warmVideoSeqRange(mediaItemBySeqRef, 0, FEED_PRELOAD_WARM_DISTANCE);
    setCurrentlyVisibleVideo(heroMediaRow.key);
    currentlyVisibleVideoRef.current = heroMediaRow.key;
    playMedia(heroMediaRow.key, "video");
  }, [
    listData,
    isFeedActive,
    isAutoPlayEnabled,
    setCurrentlyVisibleVideo,
    playMedia,
    hasDeterminedVisibilityRef,
    currentlyVisibleVideoRef,
    isAutoPlayEnabledRef,
    mediaItemBySeqRef,
  ]);

  const onHeroSurfaceReadyChange = useCallback(
    (ready: boolean) => {
      if (!ready) return;
      setHeroPrimed(true);
      // Decoder just became ready — force audible play for the hero even if
      // the earlier playMedia() raced before the player registered.
      if (
        isFeedActive &&
        heroRowKey &&
        (isAutoPlayEnabled || isAutoPlayEnabledRef.current)
      ) {
        setCurrentlyVisibleVideo(heroRowKey);
        currentlyVisibleVideoRef.current = heroRowKey;
        playMedia(heroRowKey, "video");
      }
    },
    [
      isFeedActive,
      heroRowKey,
      isAutoPlayEnabled,
      isAutoPlayEnabledRef,
      currentlyVisibleVideoRef,
      setCurrentlyVisibleVideo,
      playMedia,
    ]
  );

  const isHeroRow = useCallback(
    (rowKey: string) => !!heroRowKey && rowKey === heroRowKey,
    [heroRowKey]
  );

  return {
    heroPrimed,
    onHeroSurfaceReadyChange,
    isHeroRow,
  };
}
