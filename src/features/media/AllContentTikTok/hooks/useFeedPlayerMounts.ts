import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectMediaType,
  isAudioSermon,
} from "../../../../shared/utils";
import {
  getBestVideoUrl,
  getVideoUrlFromMedia,
} from "../../../../shared/utils/videoUrlManager";
import { shouldMountLitePlayer } from "../../../../shared/lite/liteProfile";
import {
  FEED_INITIAL_MOUNT_COUNT,
  FEED_PRELOAD_NEIGHBOR_DISTANCE,
  FEED_PRELOAD_WARM_DISTANCE,
  FEED_WARM_IDLE_MOUNT_COUNT,
} from "../../video-feed";
import { warmVideoConnection } from "../utils/videoConnectionWarmer";
import type { FeedRow } from "../types";
import type { MediaItem } from "../../../../shared/types";

export function useFeedPlayerMounts(options: {
  listData: FeedRow[];
  currentlyVisibleVideo: string | null;
  isFeedActive: boolean;
  keepVideoDecoders: boolean;
  liteActive: boolean;
  maxPlayers: number;
  hasDeterminedVisibilityRef: { current: boolean };
  mediaSeqByKeyRef: { current: Record<string, number> };
  mediaKeyBySeqRef: { current: Record<number, string> };
  mediaItemBySeqRef: { current: Record<number, MediaItem> };
}) {
  const {
    listData,
    currentlyVisibleVideo,
    isFeedActive,
    keepVideoDecoders,
    liteActive,
    maxPlayers,
    hasDeterminedVisibilityRef,
    mediaSeqByKeyRef,
    mediaKeyBySeqRef,
    mediaItemBySeqRef,
  } = options;

  const [mountedVideoKeys, setMountedVideoKeys] = useState<Set<string>>(
    () => new Set()
  );
  const visitOrderRef = useRef<string[]>([]);

  const warmSeqRange = useCallback((centerSeq: number, distance: number) => {
    for (let d = -distance; d <= distance; d++) {
      const item = mediaItemBySeqRef.current[centerSeq + d];
      if (!item) continue;
      if (isAudioSermon(item) || detectMediaType(item) !== "video") continue;
      const rawUrl = getVideoUrlFromMedia(item);
      if (!rawUrl) continue;
      warmVideoConnection(getBestVideoUrl(rawUrl));
    }
  }, [mediaItemBySeqRef]);

  useEffect(() => {
    const seqByKey = mediaSeqByKeyRef.current;
    const keyBySeq = mediaKeyBySeqRef.current;
    const hot = new Set<string>();

    if (!isFeedActive) {
      if (keepVideoDecoders) {
        for (let i = 0; i < FEED_WARM_IDLE_MOUNT_COUNT; i++) {
          const k = keyBySeq[i];
          if (k) hot.add(k);
        }
        warmSeqRange(0, FEED_PRELOAD_WARM_DISTANCE);
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
      const neighbor = liteActive ? 1 : FEED_PRELOAD_NEIGHBOR_DISTANCE;
      for (let d = 1; d <= neighbor; d++) {
        const before = keyBySeq[activeSeq - d];
        const after = keyBySeq[activeSeq + d];
        if (after && shouldMountLitePlayer(activeSeq + d, activeSeq)) {
          hot.add(after);
        }
        if (!liteActive && before) hot.add(before);
      }
      warmSeqRange(activeSeq, liteActive ? 1 : FEED_PRELOAD_WARM_DISTANCE);
    } else if (!hasDeterminedVisibilityRef.current) {
      const initial = liteActive ? 2 : FEED_INITIAL_MOUNT_COUNT;
      for (let i = 0; i < initial; i++) {
        const k = keyBySeq[i];
        if (k) hot.add(k);
      }
      warmSeqRange(0, liteActive ? 1 : FEED_PRELOAD_WARM_DISTANCE);
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

      while (next.size > maxPlayers) {
        const order = visitOrderRef.current;
        const oldest = order.find((k) => next.has(k) && !hot.has(k));
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
    liteActive,
    maxPlayers,
    hasDeterminedVisibilityRef,
    mediaKeyBySeqRef,
    mediaSeqByKeyRef,
  ]);

  return { mountedVideoKeys };
}
