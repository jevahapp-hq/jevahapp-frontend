/**
 * useReelsVideoPlayback
 * Video seeking, formatTime, mute, and playback lifecycle effects.
 * Isolates playback logic for easier debugging.
 */
import { Video } from "expo-av";
import { useCallback, useEffect } from "react";
import { audioConfig } from "../../utils/audioConfig";

export interface UseReelsVideoPlaybackParams {
  videoRefs: React.RefObject<Record<string, Video>>;
  videoDuration: number;
  modalKey: string;
  setVideoDuration: (d: number) => void;
  setVideoPosition: (p: number) => void;
  setShowPauseOverlay: (v: boolean) => void;
  setUserHasManuallyPaused: (v: boolean) => void;
  setMenuVisible: (v: boolean | ((p: boolean) => boolean)) => void;
  screenWidth: number;
  reelsProgressBarWidth: number;
  setIsDragging: (v: boolean) => void;
  globalVideoStore: any;
  mediaStore: any;
  playingVideos: Record<string, boolean>;
  userHasManuallyPaused: boolean;
}

export function useReelsVideoPlayback({
  videoRefs,
  videoDuration,
  modalKey,
  setVideoDuration,
  setVideoPosition,
  setShowPauseOverlay,
  setUserHasManuallyPaused,
  setMenuVisible,
  screenWidth,
  reelsProgressBarWidth,
  setIsDragging,
  globalVideoStore,
  mediaStore,
  playingVideos,
  userHasManuallyPaused,
}: UseReelsVideoPlaybackParams) {
  const seekToPosition = useCallback(
    async (videoKey: string, position: number) => {
      const ref = videoRefs.current[videoKey];
      if (!ref || videoDuration <= 0) return;
      try {
        const seekTime = Math.max(
          0,
          Math.min((position / 100) * videoDuration, videoDuration)
        );
        setVideoPosition(seekTime);
        await ref.setPositionAsync(seekTime);
      } catch (e) {
        console.error("❌ Error seeking video:", e);
        try {
          const status = await ref.getStatusAsync();
          if (status.isLoaded && status.positionMillis !== undefined)
            setVideoPosition(status.positionMillis);
        } catch {}
      }
    },
    [videoRefs, videoDuration, setVideoPosition]
  );

  const formatTime = useCallback((ms: number): string => {
    if (!Number.isFinite(ms) || ms < 0 || isNaN(ms)) return "0:00";
    const clampedMs = Math.min(ms, 24 * 60 * 60 * 1000);
    const totalSeconds = Math.floor(clampedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  const toggleMute = useCallback(
    (key: string) => {
      globalVideoStore.toggleVideoMute(key);
    },
    [globalVideoStore]
  );

  // Cleanup on unmount - pause videos, keep refs for faster resume
  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach((ref) => {
        if (ref) {
          try {
            ref.pauseAsync();
          } catch {}
        }
      });
    };
  }, []);

  // Audio session for video playback
  useEffect(() => {
    audioConfig.configureForVideoPlayback().catch((e) =>
      console.error("❌ ReelsView: Failed to init audio:", e)
    );
  }, []);

  // Periodic cache cleanup
  useEffect(() => {
    const id = setInterval(() => mediaStore.cleanupVideoCache(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [mediaStore]);

  // Play active video when modalKey changes
  useEffect(() => {
    if (!modalKey) return;
    setVideoDuration(0);
    setVideoPosition(0);
    setShowPauseOverlay(false);
    setUserHasManuallyPaused(false);
    mediaStore.updateLastAccessed(modalKey);

    const videoRef = videoRefs.current[modalKey];
    if (videoRef) {
      globalVideoStore.registerVideoPlayer(modalKey, {
        pause: async () => {
          try {
            await videoRef.pauseAsync();
            globalVideoStore.setOverlayVisible(modalKey, true);
          } catch (err) {
            console.warn(`Failed to pause ${modalKey}:`, err);
          }
        },
        showOverlay: () => globalVideoStore.setOverlayVisible(modalKey, true),
        key: modalKey,
      });
    }

    globalVideoStore.pauseAllVideos();
    const play = () => {
      try {
        globalVideoStore.playVideoGlobally(modalKey);
        videoRef?.playAsync().catch(() => {});
      } catch (e) {
        console.error("Error playing video:", e);
      }
    };
    play();
    const timeoutId = setTimeout(play, 150);
    setMenuVisible(false);
    return () => clearTimeout(timeoutId);
  }, [modalKey]);

  // Ensure video plays on initial mount when not manually paused
  useEffect(() => {
    if (
      modalKey &&
      !playingVideos[modalKey] &&
      !userHasManuallyPaused
    ) {
      const id = setTimeout(() => {
        try {
          globalVideoStore.playVideoGlobally(modalKey);
        } catch (e) {
          console.error("Error playing video on mount:", e);
        }
      }, 200);
      return () => clearTimeout(id);
    }
  }, [modalKey, playingVideos, userHasManuallyPaused, globalVideoStore]);

  return {
    seekToPosition,
    formatTime,
    toggleMute,
  };
}
