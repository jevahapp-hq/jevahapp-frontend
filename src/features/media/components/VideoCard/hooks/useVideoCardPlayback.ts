import { useCallback, useRef, useState } from "react";
import contentInteractionAPI from "../../../../../../app/utils/contentInteractionAPI";

export interface UseVideoCardPlaybackParams {
  isAudioSermon: boolean;
  contentId: string;
  videoRef: React.MutableRefObject<any>;
  handleVideoError: (error: any) => void;
  setFailedVideoLoad: (v: boolean) => void;
  setVideoLoaded: (v: boolean) => void;
  videoLoadedRef: React.MutableRefObject<boolean>;
  hasTrackedView: boolean;
  setHasTrackedView: (v: boolean) => void;
  storeRef: React.MutableRefObject<any>;
  isMountedRef: React.MutableRefObject<boolean>;
}

/**
 * Drives progress/duration state and view tracking from expo-av's
 * onLoad/onPlaybackStatusUpdate callbacks (used instead of expo-video's
 * useVideoPlayer, which has a known Android bug where the native surface
 * doesn't repaint when a player/view is recycled inside a virtualized list -
 * https://github.com/expo/expo/issues/35012, #38426).
 */
export function useVideoCardPlayback({
  isAudioSermon,
  contentId,
  videoRef,
  handleVideoError,
  setFailedVideoLoad,
  setVideoLoaded,
  videoLoadedRef,
  hasTrackedView,
  setHasTrackedView,
  storeRef,
  isMountedRef,
}: UseVideoCardPlaybackParams) {
  const lastKnownDurationRef = useRef(0);
  const [videoDurationMs, setVideoDurationMs] = useState(0);
  const [videoPositionMs, setVideoPositionMs] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);

  const handleLoad = useCallback(
    (status: any) => {
      if (isAudioSermon || !status?.isLoaded) return;

      setFailedVideoLoad(false);
      setVideoLoaded(true);
      videoLoadedRef.current = true;

      const rawDuration = status.durationMillis;
      if (typeof rawDuration === "number" && Number.isFinite(rawDuration) && rawDuration > 0) {
        const durationMs = Math.min(rawDuration, 24 * 60 * 60 * 1000);
        lastKnownDurationRef.current = durationMs;
        setVideoDurationMs(durationMs);
      }
    },
    [isAudioSermon, setFailedVideoLoad, setVideoLoaded, videoLoadedRef]
  );

  const handleStatusUpdate = useCallback(
    (status: any) => {
      if (isAudioSermon || !isMountedRef.current) return;

      if (!status?.isLoaded) {
        if (status?.error) {
          setFailedVideoLoad(true);
          handleVideoError(status.error);
        }
        return;
      }

      const positionMs = Math.max(0, status.positionMillis ?? 0);
      const rawDuration = status.durationMillis ?? lastKnownDurationRef.current;
      const durationMs = Math.max(0, Math.min(rawDuration || 0, 24 * 60 * 60 * 1000));

      if (durationMs > 0 && lastKnownDurationRef.current !== durationMs) {
        lastKnownDurationRef.current = durationMs;
        setVideoDurationMs(durationMs);
      }

      const progress = durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;
      setVideoPositionMs(Math.min(positionMs, durationMs || positionMs));
      setVideoProgress(progress);

      const qualifies = status.isPlaying && (positionMs >= 3000 || progress >= 0.25);
      const finished = !!status.didJustFinish;

      if (finished && isMountedRef.current) {
        try {
          videoRef.current?.setPositionAsync(0);
          if (status.isPlaying) {
            videoRef.current?.playAsync();
          }
        } catch {
          // no-op
        }
      }

      if (!hasTrackedView && (qualifies || finished)) {
        try {
          contentInteractionAPI
            .recordView(contentId, "media", {
              durationMs: finished ? durationMs : positionMs,
              progressPct: Math.round(progress * 100),
              isComplete: finished,
            })
            .then((result) => {
              setHasTrackedView(true);
              if (result?.totalViews != null && storeRef.current?.mutateStats) {
                storeRef.current.mutateStats(contentId, () => ({
                  views: Number(result.totalViews) || 0,
                }));
              }
            })
            .catch(() => {});
        } catch {
          // no-op
        }
      }
    },
    [
      isAudioSermon,
      isMountedRef,
      contentId,
      hasTrackedView,
      handleVideoError,
      setFailedVideoLoad,
      setHasTrackedView,
      storeRef,
      videoRef,
    ]
  );

  return {
    lastKnownDurationRef,
    videoDurationMs,
    videoPositionMs,
    videoProgress,
    handleLoad,
    handleStatusUpdate,
  };
}
