/**
 * useReelsVideoPlayback
 * Seek / mute / lifecycle for expo-video reels players.
 */
import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect } from "react";
import { audioConfig } from "../../utils/audioConfig";

export interface UseReelsVideoPlaybackParams {
  videoRefs: React.RefObject<Record<string, VideoPlayer>>;
  videoDuration: number;
  modalKey: string;
  setVideoDuration: (d: number) => void;
  setVideoPosition: (p: number) => void;
  setShowPauseOverlay: (v: boolean) => void;
  setUserHasManuallyPaused: (v: boolean) => void;
  setMenuVisible: (v: boolean | ((p: boolean) => boolean)) => void;
  screenWidth: number;
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
  globalVideoStore,
  mediaStore,
  playingVideos,
  userHasManuallyPaused,
}: UseReelsVideoPlaybackParams) {
  const seekToPosition = useCallback(
    async (videoKey: string, position: number) => {
      const ref = videoRefs.current?.[videoKey];
      if (!ref || videoDuration <= 0) return;
      try {
        const seekTimeMs = Math.max(
          0,
          Math.min((position / 100) * videoDuration, videoDuration)
        );
        setVideoPosition(seekTimeMs);
        ref.currentTime = seekTimeMs / 1000;
      } catch (e) {
        console.error("❌ Error seeking video:", e);
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

  useEffect(() => {
    return () => {
      Object.values(videoRefs.current || {}).forEach((ref) => {
        if (!ref) return;
        try {
          ref.pause();
          ref.muted = true;
          ref.volume = 0;
        } catch {
          // no-op
        }
      });
    };
  }, [videoRefs]);

  useEffect(() => {
    audioConfig.configureForVideoPlayback().catch((e) =>
      console.error("❌ ReelsView: Failed to init audio:", e)
    );
  }, []);

  useEffect(() => {
    const id = setInterval(() => mediaStore.cleanupVideoCache(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [mediaStore]);

  // Play active video when modalKey changes (swipe / open).
  // Do NOT pauseAllVideos() before play — that cleared playing state and
  // raced the new expo-video player registration.
  useEffect(() => {
    if (!modalKey) return;
    setVideoDuration(0);
    setVideoPosition(0);
    setShowPauseOverlay(false);
    setUserHasManuallyPaused(false);
    mediaStore.updateLastAccessed(modalKey);
    setMenuVisible(false);

    const play = () => {
      try {
        globalVideoStore.playVideoGlobally(modalKey);
        const ref = videoRefs.current?.[modalKey];
        if (ref) {
          try {
            ref.muted = false;
            ref.play();
          } catch {
            // no-op
          }
        }
      } catch (e) {
        console.error("Error playing video:", e);
      }
    };
    play();
    const t1 = setTimeout(play, 80);
    const t2 = setTimeout(play, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [modalKey]);

  useEffect(() => {
    if (modalKey && !playingVideos[modalKey] && !userHasManuallyPaused) {
      const id = setTimeout(() => {
        try {
          globalVideoStore.playVideoGlobally(modalKey);
        } catch (e) {
          console.error("Error playing video on mount:", e);
        }
      }, 160);
      return () => clearTimeout(id);
    }
  }, [modalKey, playingVideos, userHasManuallyPaused, globalVideoStore]);

  return {
    seekToPosition,
    formatTime,
    toggleMute,
  };
}
