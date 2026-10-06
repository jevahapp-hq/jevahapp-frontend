import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { resolveMediaAudioUrl } from "../../../../shared/audio/mapToAudioTrack";
import type { MediaItem } from "../../../../shared/types";
import {
    detectMediaType,
    isAudioSermon,
} from "../../../../shared/utils/mediaTypeDetection";
import {
    getBestVideoUrl,
    getVideoUrlFromMedia,
} from "../../../../shared/utils/videoUrlManager";
import {
    FEED_INITIAL_MOUNT_COUNT,
    FEED_PRELOAD_NEIGHBOR_DISTANCE,
    FEED_PRELOAD_WARM_DISTANCE,
    FEED_WARM_IDLE_MOUNT_COUNT,
} from "../../video-feed";
import {
    areFeedDecodersSuspended,
    subscribeFeedDecoders,
} from "../../video-feed/feedDecoderGate";
import { prefetchFirstFrames } from "../../video-feed/firstFrameCache";
import type { FeedRow } from "../types";
import { warmVideoConnection } from "../utils/videoConnectionWarmer";

export function useFeedPlayerMounts(options: {
  listData: FeedRow[];
  currentlyVisibleVideo: string | null;
  isFeedActive: boolean;
  keepVideoDecoders: boolean;
  liteActive?: boolean;
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
    maxPlayers,
    hasDeterminedVisibilityRef,
    mediaSeqByKeyRef,
    mediaKeyBySeqRef,
    mediaItemBySeqRef,
  } = options;

  const [mountedVideoKeys, setMountedVideoKeys] = useState<Set<string>>(
    () => new Set()
  );
  const decodersSuspended = useSyncExternalStore(
    subscribeFeedDecoders,
    areFeedDecodersSuspended,
    () => false
  );
  const visitOrderRef = useRef<string[]>([]);

  const isFeedVideo = useCallback((item: MediaItem | undefined) => {
    if (!item) return false;
    if (isAudioSermon(item) || detectMediaType(item) !== "video") return false;
    return true;
  }, []);

  const warmSeqRange = useCallback((centerSeq: number, distance: number) => {
    for (let d = -distance; d <= distance; d++) {
      const item = mediaItemBySeqRef.current[centerSeq + d];
      if (!item) continue;
      if (isAudioSermon(item)) {
        warmVideoConnection(resolveMediaAudioUrl(item));
        continue;
      }
      if (!isFeedVideo(item)) continue;
      const rawUrl = getVideoUrlFromMedia(item);
      if (!rawUrl) continue;
      warmVideoConnection(getBestVideoUrl(rawUrl));
    }
  }, [isFeedVideo, mediaItemBySeqRef]);

  const addVideoNeighbors = useCallback(
    (
      hot: Set<string>,
      activeSeq: number,
      keyBySeq: Record<number, string>
    ) => {
      const itemBySeq = mediaItemBySeqRef.current;
      const distance = FEED_PRELOAD_NEIGHBOR_DISTANCE;
      let behind = 0;
      for (let seq = activeSeq - 1; seq >= 0 && behind < distance; seq--) {
        const item = itemBySeq[seq];
        if (!item) continue;
        if (!isFeedVideo(item)) continue;
        const key = keyBySeq[seq];
        if (key) {
          hot.add(key);
          behind++;
        }
      }
      let ahead = 0;
      for (let seq = activeSeq + 1; ahead < distance; seq++) {
        const item = itemBySeq[seq];
        if (!item) break;
        if (!isFeedVideo(item)) continue;
        const key = keyBySeq[seq];
        if (key) {
          hot.add(key);
          ahead++;
        }
      }
    },
    [isFeedVideo, mediaItemBySeqRef]
  );

  useEffect(() => {
    if (decodersSuspended) {
      setMountedVideoKeys((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }

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
      // iPhone keeps the previous clip paused and the next ones primed.
      // Android primes only the next clip (paused on its first frame) so the
      // swipe lands on video, not a thumbnail. The clip you just left stays
      // through maxPlayers. More decoders than that and Expo Go closes.
      if (Platform.OS !== "android") {
        addVideoNeighbors(hot, activeSeq, keyBySeq);
      } else {
        for (let seq = activeSeq + 1; ; seq++) {
          const item = mediaItemBySeqRef.current[seq];
          if (!item) break;
          if (!isFeedVideo(item)) continue;
          const key = keyBySeq[seq];
          if (key) hot.add(key);
          break;
        }
      }
      warmSeqRange(activeSeq, FEED_PRELOAD_WARM_DISTANCE);
      const upcoming: string[] = [];
      for (let seq = activeSeq + 1; upcoming.length < 3; seq++) {
        const item = mediaItemBySeqRef.current[seq];
        if (!item) break;
        if (!isFeedVideo(item)) continue;
        const rawUrl = getVideoUrlFromMedia(item);
        if (rawUrl) upcoming.push(getBestVideoUrl(rawUrl));
      }
      prefetchFirstFrames(upcoming, { priority: true });
    } else if (!hasDeterminedVisibilityRef.current) {
      let mounted = 0;
      const initialCount =
        Platform.OS === "android" ? 2 : FEED_INITIAL_MOUNT_COUNT;
      for (let i = 0; mounted < initialCount; i++) {
        const item = mediaItemBySeqRef.current[i];
        if (!item) break;
        if (!isFeedVideo(item)) continue;
        const k = keyBySeq[i];
        if (k) {
          hot.add(k);
          mounted++;
        }
      }
      warmSeqRange(0, FEED_PRELOAD_WARM_DISTANCE);
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
    decodersSuspended,
    listData,
    addVideoNeighbors,
    isFeedVideo,
    warmSeqRange,
    isFeedActive,
    keepVideoDecoders,
    maxPlayers,
    hasDeterminedVisibilityRef,
    mediaItemBySeqRef,
    mediaKeyBySeqRef,
    mediaSeqByKeyRef,
  ]);

  return { mountedVideoKeys };
}
