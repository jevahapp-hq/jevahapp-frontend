/**
 * useReelsVideoPlayback
 * Seek, mute, and session lifecycle for Reels (expo-video).
 */
import type { VideoPlayer } from "expo-video";
import { RefObject, useCallback, useEffect } from "react";
import { audioConfig } from "../../utils/audioConfig";
import { useGlobalVideoStore } from "../../store/useGlobalVideoStore";

export interface UseReelsVideoPlaybackParams {
  videoRefs: RefObject<Record<string, VideoPlayer>>;
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
  userHasManuallyPaused: boolean;
}

function durationMsOf(player: VideoPlayer | undefined, knownMs: number): number {
  if (knownMs > 0) return knownMs;
  const sec = Number(player?.duration) || 0;
  return sec > 0 ? sec * 1000 : 0;
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
  userHasManuallyPaused,
}: UseReelsVideoPlaybackParams) {
  /**
   * Seek active reel. `position` is 0–1 fraction (preferred).
   * Values > 1 are treated as legacy 0–100 percent for older callers.
   */
  const seekToPosition = useCallback(
    async (videoKey: string, position: number) => {
      const player = videoRefs.current[videoKey];
      if (!player) {
        if (__DEV__) {
          console.warn(
            "[reels.seek] missing player ref",
            videoKey,
            Object.keys(videoRefs.current || {})
          );
        }
        return;
      }
      try {
        let duration = durationMsOf(player, videoDuration);
        if (duration > 0) setVideoDuration(duration);
        if (!(duration > 0)) {
          if (__DEV__) {
            console.warn("[reels.seek] duration unknown", videoKey);
          }
          return;
        }

        const pct =
          position > 1
            ? Math.max(0, Math.min(100, position)) / 100
            : Math.max(0, Math.min(1, position));
        const seekTimeMs = Math.max(
          0,
          Math.min(pct * duration, Math.max(0, duration - 40))
        );
        setVideoPosition(seekTimeMs);
        player.currentTime = seekTimeMs / 1000;
      } catch (e) {
        console.error("❌ Error seeking video:", e);
        try {
          const sec = Number(player.currentTime) || 0;
          setVideoPosition(sec * 1000);
        } catch {
          // no-op
        }
      }
    },
    [videoRefs, videoDuration, setVideoPosition, setVideoDuration]
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
      Object.values(videoRefs.current).forEach((player) => {
        try {
          player.pause();
          player.muted = true;
          player.volume = 0;
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
    if (!modalKey) return;
    setVideoDuration(0);
    setVideoPosition(0);
    setShowPauseOverlay(false);
    setUserHasManuallyPaused(false);
    useGlobalVideoStore.setState({ currentlyVisibleVideo: modalKey });

    globalVideoStore.pauseAllVideos();
    const play = () => {
      try {
        globalVideoStore.playVideoGlobally(modalKey);
      } catch (e) {
        console.error("Error playing video:", e);
      }
    };
    play();
    const timeoutId = setTimeout(play, 150);
    setMenuVisible(false);
    return () => clearTimeout(timeoutId);
  }, [modalKey]);

  const isThisPlaying = useGlobalVideoStore(
    (s) => (modalKey ? s.playingVideos[modalKey] ?? false : false)
  );

  useEffect(() => {
    if (modalKey && !isThisPlaying && !userHasManuallyPaused) {
      const id = setTimeout(() => {
        try {
          globalVideoStore.playVideoGlobally(modalKey);
        } catch (e) {
          console.error("Error playing video on mount:", e);
        }
      }, 200);
      return () => clearTimeout(id);
    }
  }, [modalKey, isThisPlaying, userHasManuallyPaused, globalVideoStore]);

  return {
    seekToPosition,
    formatTime,
    toggleMute,
  };
}
