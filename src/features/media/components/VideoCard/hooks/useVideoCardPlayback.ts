/**
 * useVideoCardPlayback - Orchestrates progress tracking + view analytics.
 * Progress math lives in useVideoProgressTracker; views in useVideoViewTracking.
 */
import { useCallback } from "react";
import { useVideoProgressTracker } from "./useVideoProgressTracker";
import { useVideoViewTracking } from "./useVideoViewTracking";

export interface UseVideoCardPlaybackParams {
  player: any;
  isAudioSermon: boolean;
  videoTitle: string;
  contentId: string;
  isPlaying: boolean;
  handleVideoError: (error: any) => void;
  setFailedVideoLoad: (v: boolean) => void;
  setVideoLoaded: (v: boolean) => void;
  videoLoadedRef: React.MutableRefObject<boolean>;
  hasTrackedView: boolean;
  setHasTrackedView: (v: boolean) => void;
  storeRef: React.MutableRefObject<any>;
  isMountedRef: React.MutableRefObject<boolean>;
}

export function useVideoCardPlayback({
  player,
  isAudioSermon,
  contentId,
  isPlaying,
  handleVideoError,
  setFailedVideoLoad,
  setVideoLoaded,
  videoLoadedRef,
  hasTrackedView,
  setHasTrackedView,
  storeRef,
  isMountedRef,
}: UseVideoCardPlaybackParams) {
  const { maybeRecordView } = useVideoViewTracking({
    contentId,
    hasTrackedView,
    setHasTrackedView,
    storeRef,
    isMountedRef,
  });

  const onReady = useCallback(
    (_durationMs: number) => {
      setFailedVideoLoad(false);
      setVideoLoaded(true);
      videoLoadedRef.current = true;
      if (isPlaying && player && !player.playing) {
        try {
          player.play();
        } catch {
          // no-op
        }
      }
    },
    [setFailedVideoLoad, setVideoLoaded, videoLoadedRef, isPlaying, player]
  );

  const onError = useCallback(
    (status: any) => {
      setFailedVideoLoad(true);
      handleVideoError(status);
    },
    [setFailedVideoLoad, handleVideoError]
  );

  const onTick = useCallback(
    (positionMs: number, durationMs: number, progress: number) => {
      maybeRecordView(Boolean(player?.playing), positionMs, durationMs, progress);
    },
    [maybeRecordView, player]
  );

  const {
    lastKnownDurationRef,
    videoDurationMs,
    videoPositionMs,
    videoProgress,
    setVideoPositionMs,
    setVideoProgress,
  } = useVideoProgressTracker({
    player,
    enabled: !isAudioSermon,
    updateIntervalSec: 0.1,
    isMountedRef,
    onTick,
    onReady,
    onError,
  });

  return {
    lastKnownDurationRef,
    videoDurationMs,
    videoPositionMs,
    videoProgress,
    setVideoPositionMs,
    setVideoProgress,
  };
}
