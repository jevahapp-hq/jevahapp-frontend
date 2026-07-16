import type { VideoPlayer } from "expo-video";
import { useEffect, useRef, useState } from "react";
import contentInteractionAPI from "../../../../../../app/utils/contentInteractionAPI";

export interface UseVideoCardPlaybackParams {
  isAudioSermon: boolean;
  contentId: string;
  player: VideoPlayer | null;
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
 * Progress / duration / view-tracking driven by expo-video player events
 * (`timeUpdate`, `statusChange`, `playToEnd`, `sourceLoad`).
 */
export function useVideoCardPlayback({
  isAudioSermon,
  contentId,
  player,
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
  const hasTrackedViewRef = useRef(hasTrackedView);

  useEffect(() => {
    hasTrackedViewRef.current = hasTrackedView;
  }, [hasTrackedView]);

  useEffect(() => {
    // Reset progress when the player instance / source identity changes.
    lastKnownDurationRef.current = 0;
    setVideoDurationMs(0);
    setVideoPositionMs(0);
    setVideoProgress(0);
  }, [player]);

  useEffect(() => {
    if (isAudioSermon || !player || !isMountedRef.current) return;

    const applyDurationSeconds = (durationSec: number) => {
      if (!Number.isFinite(durationSec) || durationSec <= 0) return;
      const durationMs = Math.min(durationSec * 1000, 24 * 60 * 60 * 1000);
      if (lastKnownDurationRef.current !== durationMs) {
        lastKnownDurationRef.current = durationMs;
        setVideoDurationMs(durationMs);
      }
    };

    const applyPositionSeconds = (positionSec: number, isPlaying: boolean) => {
      if (!isMountedRef.current) return;

      const positionMs = Math.max(0, positionSec * 1000);
      const durationMs = lastKnownDurationRef.current;
      const progress =
        durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;

      setVideoPositionMs(
        durationMs > 0 ? Math.min(positionMs, durationMs) : positionMs
      );
      setVideoProgress(progress);

      const qualifies =
        isPlaying && (positionMs >= 3000 || progress >= 0.25);

      if (!hasTrackedViewRef.current && qualifies) {
        try {
          contentInteractionAPI
            .recordView(contentId, "media", {
              durationMs: positionMs,
              progressPct: Math.round(progress * 100),
              isComplete: false,
            })
            .then((result) => {
              setHasTrackedView(true);
              hasTrackedViewRef.current = true;
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
    };

    const statusSub = player.addListener("statusChange", ({ status, error }) => {
      if (!isMountedRef.current) return;

      if (status === "error") {
        setFailedVideoLoad(true);
        handleVideoError(error ?? new Error("Video playback error"));
        return;
      }

      if (status === "readyToPlay") {
        setFailedVideoLoad(false);
        setVideoLoaded(true);
        videoLoadedRef.current = true;
        applyDurationSeconds(player.duration);
      }
    });

    const sourceLoadSub = player.addListener("sourceLoad", ({ duration }) => {
      if (!isMountedRef.current) return;
      setFailedVideoLoad(false);
      setVideoLoaded(true);
      videoLoadedRef.current = true;
      applyDurationSeconds(duration);
    });

    const timeSub = player.addListener("timeUpdate", ({ currentTime }) => {
      applyPositionSeconds(currentTime, player.playing);
      if (player.duration > 0) applyDurationSeconds(player.duration);
    });

    const endSub = player.addListener("playToEnd", () => {
      if (!isMountedRef.current) return;

      const durationMs = lastKnownDurationRef.current || player.duration * 1000;
      const wasPlaying = player.playing;

      if (!hasTrackedViewRef.current) {
        try {
          contentInteractionAPI
            .recordView(contentId, "media", {
              durationMs,
              progressPct: 100,
              isComplete: true,
            })
            .then((result) => {
              setHasTrackedView(true);
              hasTrackedViewRef.current = true;
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

      try {
        player.currentTime = 0;
        setVideoPositionMs(0);
        setVideoProgress(0);
        if (wasPlaying) player.play();
      } catch {
        // no-op
      }
    });

    // Seed from current player state (may already be ready from pre-roll).
    if (player.status === "readyToPlay") {
      setFailedVideoLoad(false);
      setVideoLoaded(true);
      videoLoadedRef.current = true;
      applyDurationSeconds(player.duration);
      applyPositionSeconds(player.currentTime, player.playing);
    }

    return () => {
      statusSub.remove();
      sourceLoadSub.remove();
      timeSub.remove();
      endSub.remove();
    };
  }, [
    player,
    isAudioSermon,
    contentId,
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
    videoDurationMs,
    videoPositionMs,
    videoProgress,
  };
}
