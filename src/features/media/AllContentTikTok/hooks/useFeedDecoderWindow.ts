import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { MediaItem } from "../../../../shared/types";
import { getBestVideoUrl, getVideoUrlFromMedia } from "../../../../shared/utils/videoUrlManager";
import {
  FEED_HARD_MAX_PLAYERS,
  FEED_INITIAL_MOUNT_COUNT,
  FEED_PRELOAD_NEIGHBOR_DISTANCE,
  FEED_PRELOAD_WARM_DISTANCE,
  FEED_WARM_IDLE_MOUNT_COUNT,
} from "../../video-feed";
import { getFeedContentKind } from "../utils/feedContentKind";
import { warmVideoConnection } from "../utils/videoConnectionWarmer";
import type { FeedRow } from "../types";

export interface UseFeedDecoderWindowParams {
  listData: FeedRow[];
  currentlyVisibleVideo: string | null;
  currentlyVisibleVideoRef: MutableRefObject<string | null>;
  hasDeterminedVisibilityRef: MutableRefObject<boolean>;
  isFeedActive: boolean;
  keepVideoDecoders: boolean;
  /** Prefer mounting this key first (Most Recent hero). */
  heroRowKey: string | null;
  /** When false, only mount the hero until it reports first frame. */
  heroPrimed: boolean;
  mediaSeqByKeyRef: MutableRefObject<Record<string, number>>;
  mediaKeyBySeqRef: MutableRefObject<Record<number, string>>;
  mediaItemBySeqRef: MutableRefObject<Record<number, MediaItem>>;
}

export interface UseFeedDecoderWindowResult {
  mountedVideoKeys: Set<string>;
  warmSeqRange: (centerSeq: number, distance: number) => void;
  shouldRenderPlayer: (rowKey: string) => boolean;
  mountedPlayerSig: string;
}

/**
 * Grow-only decoder mounts with a hard ceiling. Hero (Most Recent) is always
 * preferred; neighbors wait until the hero has primed when possible.
 */
export function useFeedDecoderWindow({
  listData,
  currentlyVisibleVideo,
  currentlyVisibleVideoRef,
  hasDeterminedVisibilityRef,
  isFeedActive,
  keepVideoDecoders,
  heroRowKey,
  heroPrimed,
  mediaSeqByKeyRef,
  mediaKeyBySeqRef,
  mediaItemBySeqRef,
}: UseFeedDecoderWindowParams): UseFeedDecoderWindowResult {
  const [mountedVideoKeys, setMountedVideoKeys] = useState<Set<string>>(
    () => new Set()
  );
  const visitOrderRef = useRef<string[]>([]);

  const warmSeqRange = useCallback(
    (centerSeq: number, distance: number) => {
      for (let d = -distance; d <= distance; d++) {
        const item = mediaItemBySeqRef.current[centerSeq + d];
        if (!item) continue;
        if (getFeedContentKind(item) !== "video") continue;
        const rawUrl = getVideoUrlFromMedia(item);
        if (rawUrl) warmVideoConnection(getBestVideoUrl(rawUrl));
      }
    },
    [mediaItemBySeqRef]
  );

  useEffect(() => {
    const seqByKey = mediaSeqByKeyRef.current;
    const keyBySeq = mediaKeyBySeqRef.current;
    const hot = new Set<string>();

    if (!isFeedActive) {
      if (keepVideoDecoders) {
        const idleKeys: string[] = [];
        const lastVisible = currentlyVisibleVideoRef.current;
        if (lastVisible && seqByKey[lastVisible] !== undefined) {
          idleKeys.push(lastVisible);
        }
        for (let i = 0; idleKeys.length < FEED_WARM_IDLE_MOUNT_COUNT; i++) {
          const k = keyBySeq[i];
          if (!k) break;
          if (!idleKeys.includes(k)) idleKeys.push(k);
        }
        idleKeys.forEach((k) => hot.add(k));
        const warmAnchorSeq = lastVisible ? seqByKey[lastVisible] ?? 0 : 0;
        warmSeqRange(warmAnchorSeq, FEED_PRELOAD_WARM_DISTANCE);
      } else {
        setMountedVideoKeys((prev) => (prev.size === 0 ? prev : new Set()));
        return;
      }
    } else if (
      currentlyVisibleVideo &&
      seqByKey[currentlyVisibleVideo] !== undefined
    ) {
      const activeSeq = seqByKey[currentlyVisibleVideo];
      hot.add(currentlyVisibleVideo);
      // Until the hero has painted a frame, only keep 1 neighbor to free
      // decoder slots / CDN bandwidth for Most Recent.
      const neighborDist = heroPrimed
        ? FEED_PRELOAD_NEIGHBOR_DISTANCE
        : Math.min(1, FEED_PRELOAD_NEIGHBOR_DISTANCE);
      for (let d = 1; d <= neighborDist; d++) {
        const before = keyBySeq[activeSeq - d];
        const after = keyBySeq[activeSeq + d];
        if (before) hot.add(before);
        if (after) hot.add(after);
      }
      warmSeqRange(activeSeq, FEED_PRELOAD_WARM_DISTANCE);
    } else if (!hasDeterminedVisibilityRef.current) {
      // Cold start: hero first, then at most one more until primed.
      if (heroRowKey) hot.add(heroRowKey);
      const initialCount = heroPrimed
        ? FEED_INITIAL_MOUNT_COUNT
        : Math.min(1, FEED_INITIAL_MOUNT_COUNT);
      for (let i = 0; i < initialCount; i++) {
        const k = keyBySeq[i];
        if (k) hot.add(k);
      }
      warmSeqRange(0, FEED_PRELOAD_WARM_DISTANCE);
    }

    // Always force-include hero when active — never let prune drop it early.
    if (isFeedActive && heroRowKey) {
      hot.add(heroRowKey);
    }

    if (hot.size === 0) return;

    setMountedVideoKeys((prev) => {
      if (!isFeedActive && keepVideoDecoders) {
        const same =
          prev.size === hot.size && [...hot].every((k) => prev.has(k));
        return same ? prev : hot;
      }

      const next = new Set(prev);
      let changed = false;

      hot.forEach((key) => {
        if (!next.has(key)) {
          next.add(key);
          changed = true;
        }
        const order = visitOrderRef.current;
        const idx = order.indexOf(key);
        if (idx >= 0) order.splice(idx, 1);
        order.push(key);
      });

      while (next.size > FEED_HARD_MAX_PLAYERS) {
        const order = visitOrderRef.current;
        // Never prune the hero while this feed is active.
        const oldest = order.find(
          (k) => next.has(k) && !hot.has(k) && k !== heroRowKey
        );
        if (!oldest) break;
        next.delete(oldest);
        const oi = order.indexOf(oldest);
        if (oi >= 0) order.splice(oi, 1);
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [
    currentlyVisibleVideo,
    listData,
    warmSeqRange,
    isFeedActive,
    keepVideoDecoders,
    heroRowKey,
    heroPrimed,
    mediaSeqByKeyRef,
    mediaKeyBySeqRef,
    currentlyVisibleVideoRef,
    hasDeterminedVisibilityRef,
  ]);

  const shouldRenderPlayer = useCallback(
    (rowKey: string) =>
      mountedVideoKeys.has(rowKey) || currentlyVisibleVideo === rowKey,
    [mountedVideoKeys, currentlyVisibleVideo]
  );

  const mountedPlayerSig = useMemo(
    () => Array.from(mountedVideoKeys).sort().join("|"),
    [mountedVideoKeys]
  );

  return {
    mountedVideoKeys,
    warmSeqRange,
    shouldRenderPlayer,
    mountedPlayerSig,
  };
}
