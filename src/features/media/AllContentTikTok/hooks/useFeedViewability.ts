import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import {
  FEED_VIDEO_MIN_VIEW_MS,
  FEED_VIDEO_VISIBLE_PERCENT,
} from "../../video-feed";
import { getFeedContentKind } from "../utils/feedContentKind";
import type { FeedRow } from "../types";

export interface UseFeedViewabilityParams {
  isFeedActiveRef: MutableRefObject<boolean>;
  isAutoPlayEnabledRef: MutableRefObject<boolean>;
  currentlyVisibleVideoRef: MutableRefObject<string | null>;
  hasDeterminedVisibilityRef: MutableRefObject<boolean>;
  setCurrentlyVisibleVideo: (key: string | null) => void;
  playMedia: (key: string, type: "video" | "audio") => void;
  pauseMedia: (key: string) => void;
  playingVideos: Record<string, boolean>;
  playingAudioId: string | null;
  pauseAllAudio: () => void;
}

export interface UseFeedViewabilityResult {
  viewabilityConfigCallbackPairs: Array<{
    viewabilityConfig: {
      itemVisiblePercentThreshold: number;
      minimumViewTime: number;
    };
    onViewableItemsChanged: (info: any) => void;
  }>;
}

/**
 * FlashList viewability pairs for video autoplay + audio pause-out-of-view.
 * Callbacks stay referentially stable via refs (FlashList drops events otherwise).
 */
export function useFeedViewability({
  isFeedActiveRef,
  isAutoPlayEnabledRef,
  currentlyVisibleVideoRef,
  hasDeterminedVisibilityRef,
  setCurrentlyVisibleVideo,
  playMedia,
  pauseMedia,
  playingVideos,
  playingAudioId,
  pauseAllAudio,
}: UseFeedViewabilityParams): UseFeedViewabilityResult {
  const playingVideosRef = useRef(playingVideos);
  useEffect(() => {
    playingVideosRef.current = playingVideos;
  }, [playingVideos]);

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

  const handleVideoViewabilityImpl = useCallback(
    (info: {
      viewableItems: Array<{ item: FeedRow; isViewable: boolean }>;
    }) => {
      if (!isFeedActiveRef.current) return;

      hasDeterminedVisibilityRef.current = true;

      let topVideoKey: string | null = null;
      for (const token of info.viewableItems) {
        const row = token.item;
        if (!row || row.rowType !== "media") continue;
        if (getFeedContentKind(row.item) === "video") {
          topVideoKey = row.key;
          break;
        }
      }

      // Empty buckets during list rebuilds must not clear Most Recent.
      if (!topVideoKey) return;

      const prevKey = currentlyVisibleVideoRef.current;
      if (topVideoKey !== prevKey) {
        if (prevKey && playingVideosRef.current[prevKey]) {
          pauseMediaRef.current(prevKey);
        }
        // New video in view — stop any MusicCard/sermon audio still playing.
        if (playingAudioIdRef.current) {
          pauseAllAudioRef.current();
        }
        setCurrentlyVisibleVideo(topVideoKey);
        currentlyVisibleVideoRef.current = topVideoKey;
        if (isAutoPlayEnabledRef.current) {
          playMediaRef.current(topVideoKey, "video");
        }
      }
    },
    [
      isFeedActiveRef,
      hasDeterminedVisibilityRef,
      currentlyVisibleVideoRef,
      setCurrentlyVisibleVideo,
      isAutoPlayEnabledRef,
    ]
  );

  const handleVideoViewabilityRef = useRef(handleVideoViewabilityImpl);
  useEffect(() => {
    handleVideoViewabilityRef.current = handleVideoViewabilityImpl;
  }, [handleVideoViewabilityImpl]);

  const onVideoViewableItemsChanged = useCallback((info: any) => {
    handleVideoViewabilityRef.current(info);
  }, []);

  const handleAudioViewabilityImpl = useCallback(
    (info: {
      viewableItems: Array<{ item: FeedRow; isViewable: boolean }>;
    }) => {
      const activeAudioKey = playingAudioIdRef.current;
      if (!activeAudioKey) return;
      // playingAudioId may be feed row.key, raw content _id, or music-${_id}
      // depending on which card registered it — match all forms.
      const stillVisible = info.viewableItems.some((token) => {
        const row = token.item;
        if (!row || row.rowType !== "media") return false;
        const contentId = row.item?._id != null ? String(row.item._id) : "";
        if (row.key === activeAudioKey) return true;
        if (!contentId) return false;
        return (
          activeAudioKey === contentId ||
          activeAudioKey === `music-${contentId}` ||
          activeAudioKey.endsWith(`::${contentId}`)
        );
      });
      if (!stillVisible) {
        pauseAllAudioRef.current();
      }
    },
    []
  );

  const handleAudioViewabilityRef = useRef(handleAudioViewabilityImpl);
  useEffect(() => {
    handleAudioViewabilityRef.current = handleAudioViewabilityImpl;
  }, [handleAudioViewabilityImpl]);

  const onAudioViewableItemsChanged = useCallback((info: any) => {
    handleAudioViewabilityRef.current(info);
  }, []);

  const videoViewabilityConfig = useRef({
    itemVisiblePercentThreshold: FEED_VIDEO_VISIBLE_PERCENT,
    minimumViewTime: FEED_VIDEO_MIN_VIEW_MS,
  }).current;
  const audioViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 200,
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
  ]).current;

  return { viewabilityConfigCallbackPairs };
}
