/**
 * useVideoCardPlayback - Video statusChange/timeUpdate handling and progress tracking
 */
import { useEffect, useRef, useState } from "react";
import contentInteractionAPI from "../../../../../../app/utils/contentInteractionAPI";

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
  videoTitle,
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
  const lastKnownDurationRef = useRef(0);
  const [videoPositionMs, setVideoPositionMs] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);

  useEffect(() => {
    if (!player || isAudioSermon) return;

    const statusSubscription = player.addListener("statusChange", (status: any) => {
      if (__DEV__) {
        console.log(`📡 [useVideoCardPlayback] statusChange (${videoTitle}):`, status);
      }
      if (status.status === "readyToPlay") {
        setFailedVideoLoad(false);
        setVideoLoaded(true);
        videoLoadedRef.current = true;

        const rawDuration =
          typeof status.duration === "number"
            ? status.duration
            : typeof player.duration === "number"
              ? player.duration
              : 0;

        if (rawDuration && Number.isFinite(rawDuration) && rawDuration > 0) {
          const durationMs = Math.min(
            rawDuration * 1000,
            24 * 60 * 60 * 1000
          );
          if (!isNaN(durationMs)) {
            lastKnownDurationRef.current = durationMs;
          }
        }

        if (isPlaying) {
          player.play();
        }
      } else if (status.status === "error") {
        console.error(`❌ Video load error for ${videoTitle}:`, status);
        setFailedVideoLoad(true);
        handleVideoError(status);
      }
    });

    const timeUpdateSubscription = player.addListener("timeUpdate", (event: any) => {
      if (!isMountedRef.current) return;

      const currentTime =
        typeof event?.currentTime === "number"
          ? event.currentTime
          : typeof player.currentTime === "number"
            ? player.currentTime
            : 0;

      const rawDuration =
        typeof event?.duration === "number"
          ? event.duration
          : typeof player.duration === "number"
            ? player.duration
            : lastKnownDurationRef.current / 1000 || 0;

      const durationMs = Math.max(
        0,
        Math.min(rawDuration * 1000, 24 * 60 * 60 * 1000)
      );
      const positionMs = Math.max(0, Math.min(currentTime * 1000, durationMs));

      if (
        Number.isFinite(durationMs) &&
        durationMs > 0 &&
        !isNaN(durationMs)
      ) {
        lastKnownDurationRef.current = durationMs;
      }

      const progress =
        durationMs > 0
          ? Math.max(0, Math.min(1, positionMs / durationMs))
          : 0;

      setVideoPositionMs(positionMs);
      setVideoProgress(progress);

      if (__DEV__ && currentTime > 0 && Math.floor(currentTime) % 5 === 0) { // Log every 5s
        console.log(`⏱️ [useVideoCardPlayback] timeUpdate (${videoTitle}):`, {
          currentTime,
          duration: rawDuration,
          progress
        });
      }

      const qualifies =
        player.playing && (positionMs >= 3000 || progress >= 0.25);
      const finished =
        rawDuration > 0 && currentTime >= rawDuration - 0.25;

      if (finished && isMountedRef.current) {
        try {
          player.currentTime = 0;
          if (player.playing) {
            player.play();
          }
        } catch (error) {
          console.warn("Failed to restart video:", error);
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
              if (
                result?.totalViews != null &&
                storeRef.current?.mutateStats
              ) {
                storeRef.current.mutateStats(contentId, () => ({
                  views: Number(result.totalViews) || 0,
                }));
              }
            })
            .catch(() => { });
        } catch {
          // Swallow analytics errors
        }
      }
    });

    return () => {
      statusSubscription.remove();
      timeUpdateSubscription.remove();
    };
  }, [
    player,
    videoTitle,
    isPlaying,
    isAudioSermon,
    contentId,
    hasTrackedView,
    handleVideoError,
    setFailedVideoLoad,
    setVideoLoaded,
    videoLoadedRef,
    setHasTrackedView,
    storeRef,
    isMountedRef,
  ]);

  return {
    lastKnownDurationRef,
    videoPositionMs,
    videoProgress,
    setVideoPositionMs,
    setVideoProgress,
  };
}
