/**
 * useReelsVideoPlayback
 * Seek, mute, and session lifecycle for Reels (expo-video).
 */
import type { VideoPlayer } from "expo-video";
import { RefObject, useCallback, useEffect, useRef } from "react";
import { audioConfig } from "../../utils/audioConfig";
import { pausePlaybackSession } from "../../../src/shared/audio/playOrToggleTrack";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { getAudibleReel, setAndroidAudibleReel } from "../reelAudible";
import { getReelDurationMs } from "../reelPlayheadStore";

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
  /** Length already known from the feed card, so the scrubber is not 0:00. */
  knownDurationMs?: number;
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
  userHasManuallyPaused: _userHasManuallyPaused,
  knownDurationMs = 0,
}: UseReelsVideoPlaybackParams) {
  const knownDurationRef = useRef(knownDurationMs);
  knownDurationRef.current = knownDurationMs;
  const manualPauseRef = useRef(_userHasManuallyPaused);
  manualPauseRef.current = _userHasManuallyPaused;
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
        let duration = getReelDurationMs(videoKey) || durationMsOf(player, videoDuration);
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
    let cancelled = false;
    void (async () => {
      try {
        await pausePlaybackSession();
      } catch {
        // no-op
      }
      if (cancelled) return;
      audioConfig.configureForVideoPlayback().catch((e) =>
        console.error("❌ ReelsView: Failed to init audio:", e)
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modalKey) return;
    setVideoDuration(knownDurationRef.current);
    setShowPauseOverlay(false);
    setUserHasManuallyPaused(false);
    manualPauseRef.current = false;
    useGlobalVideoStore.setState({ currentlyVisibleVideo: modalKey });
    // The feed blur used to pause every player after this start, so fullscreen
    // sat on the play icon. Start now and once more after that blur.
      const play = () => {
      if (manualPauseRef.current) return;
      // A swipe may already have handed sound to the page on screen.
      // Replaying this key would start the reel that just left.
      const audible = getAudibleReel();
      if (audible && audible !== modalKey) return;
      setAndroidAudibleReel(modalKey);
      try {
        // State only. The mounted player starts itself. playVideoGlobally
        // also paused every feed player still registered on the way in.
        useGlobalVideoStore.getState().playVideo(modalKey);
      } catch (e) {
        console.error("Error playing video:", e);
      }
    };
    play();
    const frame = requestAnimationFrame(play);
    const later = setTimeout(play, 160);
    setMenuVisible(false);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(later);
    };
  }, [modalKey, globalVideoStore, setMenuVisible, setShowPauseOverlay, setUserHasManuallyPaused, setVideoDuration]);

  return {
    seekToPosition,
    formatTime,
    toggleMute,
  };
}
