import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { detectMediaType, isAudioSermon } from "../../../../shared/utils";
import type { FeedRow } from "../types";
import {
  FEED_VIDEO_MIN_VIEW_MS,
  FEED_VIDEO_VISIBLE_PERCENT,
} from "../../video-feed";

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
  setCurrentlyVisibleVideo: (key: string | null) => void;
  setFocusedFeedKey: (updater: (prev: string | null) => string | null) => void;
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
    setCurrentlyVisibleVideo,
    setFocusedFeedKey,
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

  const handleVideoViewabilityImpl = useCallback((info: ViewabilityInfo) => {
    if (!isFeedActiveRef.current) return;
    if (commentsOpenRef.current) return;

    hasDeterminedVisibilityRef.current = true;

    let topVideoKey: string | null = null;
    for (const token of info.viewableItems) {
      const row = token.item;
      if (!row || row.rowType !== "media") continue;
      const mediaType = isAudioSermon(row.item)
        ? "audio"
        : detectMediaType(row.item);
      if (mediaType === "video") {
        topVideoKey = row.key;
        break;
      }
    }

    const prevKey = currentlyVisibleVideoRef.current;
    if (topVideoKey !== prevKey) {
      if (prevKey && useGlobalVideoStore.getState().playingVideos[prevKey]) {
        pauseMediaRef.current(prevKey);
      }
      setCurrentlyVisibleVideo(topVideoKey);
      currentlyVisibleVideoRef.current = topVideoKey;
      if (topVideoKey && isAutoPlayEnabledRef.current) {
        playMediaRef.current(topVideoKey, "video");
      }
    }
  }, [
    commentsOpenRef,
    currentlyVisibleVideoRef,
    isAutoPlayEnabledRef,
    isFeedActiveRef,
    setCurrentlyVisibleVideo,
  ]);

  const handleVideoViewabilityRef = useRef(handleVideoViewabilityImpl);
  useEffect(() => {
    handleVideoViewabilityRef.current = handleVideoViewabilityImpl;
  }, [handleVideoViewabilityImpl]);

  const onVideoViewableItemsChanged = useCallback((info: any) => {
    handleVideoViewabilityRef.current(info);
  }, []);

  const handleAudioViewabilityImpl = useCallback((info: ViewabilityInfo) => {
    const feedAudioId = playingAudioIdRef.current;
    const activeKeys = feedAudioId ? [feedAudioId] : [];
    if (activeKeys.length === 0) return;

    const stillVisible = info.viewableItems.some((token) => {
      if (token.item?.rowType !== "media") return false;
      const item = token.item.item;
      const id = item?._id ? String(item._id) : "";
      return activeKeys.some(
        (key) =>
          key === token.item.key ||
          key === id ||
          key === `music-${id}` ||
          (id && key.includes(id))
      );
    });
    if (!stillVisible) {
      pauseAllAudioRef.current();
    }
  }, []);

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
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 200,
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
