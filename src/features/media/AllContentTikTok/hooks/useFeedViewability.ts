import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import type { MediaItem } from "../../../../shared/types";
import { detectMediaType, isAudioSermon } from "../../../../shared/utils/mediaTypeDetection";
import {
  FEED_AUDIO_MIN_VIEW_MS,
  FEED_VIDEO_MIN_VIEW_MS,
  FEED_VIDEO_VISIBLE_PERCENT,
} from "../../video-feed";
import type { FeedRow } from "../types";
/** Backup if the list stops and viewability never fires again. */
const SCROLL_SETTLE_MS = 32;

function firstMediaRow(info: ViewabilityInfo | null | undefined): FeedRow | null {
  const items = info?.viewableItems;
  if (!Array.isArray(items)) return null;
  for (const token of items) {
    const row = token?.item;
    if (!row || row.rowType !== "media") continue;
    return row;
  }
  return null;
}

type ViewabilityInfo = {
  viewableItems: Array<{ item: FeedRow; isViewable: boolean }>;
};

export function useFeedViewability(options: {
  isFeedActiveRef: MutableRefObject<boolean>;
  commentsOpenRef: MutableRefObject<boolean>;
  currentlyVisibleVideoRef: MutableRefObject<string | null>;
  isAutoPlayEnabledRef: MutableRefObject<boolean>;
  playingAudioId: string | null | undefined;
  pauseAllAudio: () => void;
  pauseMedia: (key: string) => void;
  playMedia: (key: string, type: "video" | "audio") => void;
  playAudioSermon?: (item: MediaItem) => void;
  setCurrentlyVisibleVideo: (key: string | null) => void;
  setFocusedFeedKey: (updater: (prev: string | null) => string | null) => void;
  pendingResumeKeyRef?: MutableRefObject<string | null>;
}) {
  const {
    isFeedActiveRef,
    commentsOpenRef,
    currentlyVisibleVideoRef,
    isAutoPlayEnabledRef,
    playingAudioId,
    pauseAllAudio,
    pauseMedia,
    playMedia,
    playAudioSermon,
    setCurrentlyVisibleVideo,
    setFocusedFeedKey,
    pendingResumeKeyRef,
  } = options;

  const hasDeterminedVisibilityRef = useRef(false);
  const visibleIsVideoRef = useRef(false);
  const scrollingRef = useRef(false);
  const pausedForScrollKeyRef = useRef<string | null>(null);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playingAudioIdRef = useRef(playingAudioId);
  useEffect(() => {
    playingAudioIdRef.current = playingAudioId;
  }, [playingAudioId]);

  const pauseAllAudioRef = useRef(pauseAllAudio);
  useEffect(() => {
    pauseAllAudioRef.current = pauseAllAudio;
  }, [pauseAllAudio]);

  const pauseMediaRef = useRef(pauseMedia);
  useEffect(() => {
    pauseMediaRef.current = pauseMedia;
  }, [pauseMedia]);

  const playMediaRef = useRef(playMedia);
  useEffect(() => {
    playMediaRef.current = playMedia;
  }, [playMedia]);

  const playAudioSermonRef = useRef(playAudioSermon);
  useEffect(() => {
    playAudioSermonRef.current = playAudioSermon;
  }, [playAudioSermon]);

  const handleVideoViewabilityImpl = useCallback((info: ViewabilityInfo) => {
    if (!isFeedActiveRef.current) return;
    if (commentsOpenRef.current) return;

    hasDeterminedVisibilityRef.current = true;

    let topRow: FeedRow | null = firstMediaRow(info);

    const topKey = topRow?.key ?? null;
    const topItem = topRow?.item;
    const isTopAudioSermon = Boolean(topItem && isAudioSermon(topItem));
    const isTopVideo =
      Boolean(topItem) &&
      !isTopAudioSermon &&
      detectMediaType(topItem) === "video";

    const pending = pendingResumeKeyRef?.current;
    if (pending && topKey !== pending) {
      return;
    }
    if (pending && topKey === pending) {
      pendingResumeKeyRef.current = null;
    }

    const prevKey = currentlyVisibleVideoRef.current;
    if (topKey === prevKey) {
      // A flick pauses the clip under the finger. Landing back on it must
      // start it again — the equal-key path used to swallow that replay.
      if (
        topKey &&
        isTopVideo &&
        pausedForScrollKeyRef.current === topKey &&
        isAutoPlayEnabledRef.current
      ) {
        pausedForScrollKeyRef.current = null;
        playMediaRef.current(topKey, "video");
      }
      return;
    }
    pausedForScrollKeyRef.current = null;

    if (prevKey && useGlobalVideoStore.getState().playingVideos[prevKey]) {
      pauseMediaRef.current(prevKey);
    }

    if (isTopAudioSermon) {
      if (prevKey && useGlobalVideoStore.getState().playingVideos[prevKey]) {
        pauseMediaRef.current(prevKey);
      }
      return;
    }

    pauseAllAudioRef.current();
    if (useCopyrightFreeOverlayStore.getState().surface === "full") {
      useCopyrightFreeOverlayStore.getState().minimize();
    }

    visibleIsVideoRef.current = isTopVideo;
    setCurrentlyVisibleVideo(isTopVideo ? topKey : null);
    currentlyVisibleVideoRef.current = isTopVideo ? topKey : null;
    if (isTopVideo && topKey && isAutoPlayEnabledRef.current) {
      playMediaRef.current(topKey, "video");
    }
  }, [
    commentsOpenRef,
    currentlyVisibleVideoRef,
    isAutoPlayEnabledRef,
    isFeedActiveRef,
    setCurrentlyVisibleVideo,
    pendingResumeKeyRef,
  ]);

  const handleVideoViewabilityRef = useRef(handleVideoViewabilityImpl);
  useEffect(() => {
    handleVideoViewabilityRef.current = handleVideoViewabilityImpl;
  }, [handleVideoViewabilityImpl]);

  const pendingVideoInfoRef = useRef<ViewabilityInfo | null>(null);
  const pendingAudioInfoRef = useRef<ViewabilityInfo | null>(null);
  const pendingFocusInfoRef = useRef<ViewabilityInfo | null>(null);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleViewabilityRef = useRef<(info: ViewabilityInfo | null) => void>(
    () => {}
  );

  const handleAudioViewabilityImpl = useCallback((info: ViewabilityInfo) => {
    if (!isFeedActiveRef.current) return;
    if (commentsOpenRef.current) return;

    let topRow: FeedRow | null = firstMediaRow(info);

    const topKey = topRow?.key ?? null;
    const topItem = topRow?.item;
    const isTopAudioSermon = Boolean(topItem && isAudioSermon(topItem));

    if (isTopAudioSermon && topItem && topKey) {
      visibleIsVideoRef.current = false;
      const prevKey = currentlyVisibleVideoRef.current;
      if (
        prevKey &&
        prevKey !== topKey &&
        useGlobalVideoStore.getState().playingVideos[prevKey]
      ) {
        pauseMediaRef.current(prevKey);
      }
      setCurrentlyVisibleVideo(topKey);
      currentlyVisibleVideoRef.current = topKey;
      if (isAutoPlayEnabledRef.current) {
        playAudioSermonRef.current?.(topItem);
      }
      return;
    }

    pauseAllAudioRef.current();
    if (useCopyrightFreeOverlayStore.getState().surface === "full") {
      useCopyrightFreeOverlayStore.getState().minimize();
    }
  }, [
    commentsOpenRef,
    currentlyVisibleVideoRef,
    isAutoPlayEnabledRef,
    isFeedActiveRef,
    setCurrentlyVisibleVideo,
  ]);

  const handleAudioViewabilityRef = useRef(handleAudioViewabilityImpl);
  useEffect(() => {
    handleAudioViewabilityRef.current = handleAudioViewabilityImpl;
  }, [handleAudioViewabilityImpl]);

  const onAudioViewableItemsChanged = useCallback((info: any) => {
    pendingAudioInfoRef.current = info;
    scheduleViewabilityRef.current(info);
  }, []);

  const handleRowFocusImpl = useCallback(
    (info: ViewabilityInfo) => {
      if (!isFeedActiveRef.current) return;
      if (commentsOpenRef.current) return;
      let topKey: string | null = firstMediaRow(info)?.key ?? null;
      setFocusedFeedKey((prev) => (prev === topKey ? prev : topKey));
    },
    [commentsOpenRef, isFeedActiveRef, setFocusedFeedKey]
  );
  const handleRowFocusRef = useRef(handleRowFocusImpl);
  useEffect(() => {
    handleRowFocusRef.current = handleRowFocusImpl;
  }, [handleRowFocusImpl]);
  const onRowFocusViewableItemsChanged = useCallback((info: any) => {
    pendingFocusInfoRef.current = info;
    scheduleViewabilityRef.current(info);
  }, []);

  const topMediaKey = (info: ViewabilityInfo | null): string | null =>
    firstMediaRow(info)?.key ?? null;

  const flushViewability = useCallback(() => {
    const video = pendingVideoInfoRef.current;
    const audio = pendingAudioInfoRef.current;
    const focus = pendingFocusInfoRef.current;
    if (video) handleVideoViewabilityRef.current(video);
    if (audio) handleAudioViewabilityRef.current(audio);
    if (focus) handleRowFocusRef.current(focus);
  }, []);

  const scheduleViewability = useCallback(
    (info: ViewabilityInfo | null) => {
      const nextKey = topMediaKey(info);
      const prevKey = currentlyVisibleVideoRef.current;
      // Silence the clip being left in this same turn, then start the one
      // now on screen. Waiting for the fling to settle left the next card
      // paused until the finger stopped.
      if (
        prevKey &&
        nextKey &&
        prevKey !== nextKey &&
        useGlobalVideoStore.getState().playingVideos[prevKey]
      ) {
        pauseMediaRef.current(prevKey);
        pausedForScrollKeyRef.current = scrollingRef.current ? prevKey : null;
        if (!scrollingRef.current) currentlyVisibleVideoRef.current = null;
      }
      if (switchTimerRef.current) {
        clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
      flushViewability();
    },
    [currentlyVisibleVideoRef, flushViewability]
  );
  scheduleViewabilityRef.current = scheduleViewability;

  const armIdleSettle = useCallback(() => {
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    // Play the card that is actually on screen once motion stops.
    // Android often drops momentum-end, which used to leave the feed paused.
    scrollEndTimerRef.current = setTimeout(() => {
      scrollEndTimerRef.current = null;
      scrollingRef.current = false;
      flushViewability();
    }, SCROLL_SETTLE_MS);
  }, [flushViewability]);

  const onFeedScrollState = useCallback(
    (phase: "begin" | "end" | "settle" | "tick") => {
      if (phase === "begin") {
        scrollingRef.current = true;
        if (switchTimerRef.current) {
          clearTimeout(switchTimerRef.current);
          switchTimerRef.current = null;
        }
        armIdleSettle();
        return;
      }
      if (phase === "tick") {
        if (scrollingRef.current) armIdleSettle();
        return;
      }
      if (phase === "end") {
        armIdleSettle();
        return;
      }
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = null;
      }
      scrollingRef.current = false;
      flushViewability();
    },
    [armIdleSettle, flushViewability]
  );

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    };
  }, []);

  const onVideoViewableItemsChanged = useCallback(
    (info: any) => {
      pendingVideoInfoRef.current = info;
      scheduleViewability(info);
    },
    [scheduleViewability]
  );

  const videoViewabilityConfig = useRef({
    itemVisiblePercentThreshold: FEED_VIDEO_VISIBLE_PERCENT,
    minimumViewTime: FEED_VIDEO_MIN_VIEW_MS,
  }).current;
  const audioViewabilityConfig = useRef({
    itemVisiblePercentThreshold: FEED_VIDEO_VISIBLE_PERCENT,
    minimumViewTime: FEED_AUDIO_MIN_VIEW_MS,
  }).current;
  const rowFocusViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 35,
    minimumViewTime: 0,
  }).current;

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: videoViewabilityConfig,
      onViewableItemsChanged: onVideoViewableItemsChanged,
    },
    {
      viewabilityConfig: audioViewabilityConfig,
      onViewableItemsChanged: onAudioViewableItemsChanged,
    },
    {
      viewabilityConfig: rowFocusViewabilityConfig,
      onViewableItemsChanged: onRowFocusViewableItemsChanged,
    },
  ]).current;

  return {
    hasDeterminedVisibilityRef,
    viewabilityConfigCallbackPairs,
    onFeedScrollState,
  };
}
