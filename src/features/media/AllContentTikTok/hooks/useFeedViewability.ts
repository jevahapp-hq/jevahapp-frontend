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

    let topRow: FeedRow | null = null;
    for (const token of info.viewableItems) {
      const row = token.item;
      if (!row || row.rowType !== "media") continue;
      topRow = row;
      break;
    }

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
    if (topKey === prevKey) return;

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

  const onVideoViewableItemsChanged = useCallback((info: any) => {
    handleVideoViewabilityRef.current(info);
  }, []);

  const handleAudioViewabilityImpl = useCallback((info: ViewabilityInfo) => {
    if (!isFeedActiveRef.current) return;
    if (commentsOpenRef.current) return;

    let topRow: FeedRow | null = null;
    for (const token of info.viewableItems) {
      const row = token.item;
      if (!row || row.rowType !== "media") continue;
      topRow = row;
      break;
    }

    const topKey = topRow?.key ?? null;
    const topItem = topRow?.item;
    const isTopAudioSermon = Boolean(topItem && isAudioSermon(topItem));

    if (isTopAudioSermon && topItem && topKey) {
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
    handleAudioViewabilityRef.current(info);
  }, []);

  const handleRowFocusImpl = useCallback(
    (info: ViewabilityInfo) => {
      if (!isFeedActiveRef.current) return;
      if (commentsOpenRef.current) return;
      let topKey: string | null = null;
      for (const token of info.viewableItems) {
        const row = token.item;
        if (!row || row.rowType !== "media") continue;
        topKey = row.key;
        break;
      }
      setFocusedFeedKey((prev) => (prev === topKey ? prev : topKey));
    },
    [commentsOpenRef, isFeedActiveRef, setFocusedFeedKey]
  );
  const handleRowFocusRef = useRef(handleRowFocusImpl);
  useEffect(() => {
    handleRowFocusRef.current = handleRowFocusImpl;
  }, [handleRowFocusImpl]);
  const onRowFocusViewableItemsChanged = useCallback((info: any) => {
    handleRowFocusRef.current(info);
  }, []);

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
    minimumViewTime: 120,
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

  return { hasDeterminedVisibilityRef, viewabilityConfigCallbackPairs };
}
