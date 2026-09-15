import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect } from "react";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";

export const useVideoPlaybackControl = ({
  videoKey,
  videoRef,
  enableAutoPlay = false,
  /**
   * When false, skip imperative play/pause sync and treat store-driven
   * pause() as a no-op so muted first-frame pre-roll can finish decoding.
   */
  playbackReady = true,
  /**
   * Reels owns play/mute itself. Dual sync (this hook + the reel surface)
   * unmutes a playing decoder and cracks Android audio.
   */
  syncPlayback = true,
}: {
  videoKey: string;
  videoRef: { current: any } | { current: VideoPlayer | null };
  enableAutoPlay?: boolean;
  playbackReady?: boolean;
  syncPlayback?: boolean;
}) => {
  const isPlaying = useGlobalVideoStore(
    (s) => s.playingVideos[videoKey] ?? false
  );
  const currentlyPlayingVideo = useGlobalVideoStore(
    (s) => s.currentlyPlayingVideo
  );
  const pauseVideo = useGlobalVideoStore((s) => s.pauseVideo);
  const setOverlayVisible = useGlobalVideoStore((s) => s.setOverlayVisible);
  const registerVideoPlayer = useGlobalVideoStore((s) => s.registerVideoPlayer);
  const unregisterVideoPlayer = useGlobalVideoStore(
    (s) => s.unregisterVideoPlayer
  );
  const playVideoGlobally = useGlobalVideoStore((s) => s.playVideoGlobally);

  const shouldPlayThisVideo = currentlyPlayingVideo === videoKey && isPlaying;

  // Keep-awake management
  useEffect(() => {
    const tag = `video-playback-${videoKey}`;
    if (shouldPlayThisVideo) {
      activateKeepAwakeAsync(tag);
    } else {
      deactivateKeepAwake(tag);
    }
    return () => {
      deactivateKeepAwake(tag);
    };
  }, [shouldPlayThisVideo, videoKey]);

  // Register/unregister player for imperative control
  useEffect(() => {
    const p = videoRef.current;
    if (!p) {
      unregisterVideoPlayer(videoKey);
      return;
    }

    let isExpoVideo = false;
    try {
      isExpoVideo =
        typeof p.play === "function" &&
        typeof p.pause === "function" &&
        !p.pauseAsync;
    } catch {
      unregisterVideoPlayer(videoKey);
      return;
    }

    const playerRef = {
      pause: async () => {
        const current = videoRef.current;
        if (!current) return;
        try {
          if (isExpoVideo) {
            // Silence first, then pause — pausing an unmuted player pops.
            current.muted = true;
            current.volume = 0;
            current.pause();
          } else {
            await current.pauseAsync();
          }
          setOverlayVisible(videoKey, true);
        } catch {
          // no-op
        }
      },
      // expo-video: imperative play/pause for feed and Reels.
      play: async () => {
        if (!videoRef.current) return;
        try {
          if (isExpoVideo) {
            const current = videoRef.current;
            const muted =
              useGlobalVideoStore.getState().mutedVideos[videoKey] ?? false;
            const targetVol = muted ? 0 : 1;
            // Mute/volume before play — unmuting an already-playing
            // decoder is what pops on Android.
            if (current.muted !== muted) current.muted = muted;
            if (Math.abs((Number(current.volume) || 0) - targetVol) > 0.02) {
              current.volume = targetVol;
            }
            if (!current.playing) current.play();
          }
        } catch {
          // no-op
        }
      },
      showOverlay: () => setOverlayVisible(videoKey, true),
      key: videoKey,
      seekToPercent: (percent: number) => {
        const current = videoRef.current;
        if (!current || !isExpoVideo) return;
        try {
          const durationSec = Number(current.duration) || 0;
          if (durationSec <= 0) return;
          current.currentTime =
            Math.max(0, Math.min(1, percent)) * durationSec;
        } catch {
          // no-op
        }
      },
      getSnapshot: () => {
        const current = videoRef.current;
        if (!current || !isExpoVideo) {
          return { progress: 0, currentMs: 0, durationMs: 0 };
        }
        try {
          const durationSec = Number(current.duration) || 0;
          const currentSec = Number(current.currentTime) || 0;
          return {
            currentMs: currentSec * 1000,
            durationMs: durationSec * 1000,
            progress:
              durationSec > 0
                ? Math.max(0, Math.min(1, currentSec / durationSec))
                : 0,
          };
        } catch {
          return { progress: 0, currentMs: 0, durationMs: 0 };
        }
      },
    };

    registerVideoPlayer(videoKey, playerRef);
    return () => {
      unregisterVideoPlayer(videoKey);
    };
  }, [
    videoKey,
    videoRef,
    playbackReady,
    registerVideoPlayer,
    unregisterVideoPlayer,
    setOverlayVisible,
  ]);

  // Direct imperative sync: if this is the playing video, play it; otherwise pause.
  // Skipped during pre-roll so neighbors can decode a frozen first frame.
  useEffect(() => {
    if (!syncPlayback || !playbackReady) return;

    const p = videoRef.current;
    if (!p) return;

    try {
      const isExpoVideo =
        typeof p.play === "function" &&
        typeof p.pause === "function" &&
        !p.pauseAsync;
      if (!isExpoVideo) return;

      if (shouldPlayThisVideo) {
        const muted =
          useGlobalVideoStore.getState().mutedVideos[videoKey] ?? false;
        if (p.muted !== muted) p.muted = muted;
        const targetVol = muted ? 0 : 1;
        if (Math.abs((Number(p.volume) || 0) - targetVol) > 0.02) {
          p.volume = targetVol;
        }
        if (!p.playing) p.play();
      } else {
        if (!p.muted) p.muted = true;
        if ((Number(p.volume) || 0) !== 0) p.volume = 0;
        if (p.playing) {
          p.pause();
          setOverlayVisible(videoKey, true);
        }
      }
    } catch {
      // Native player already released.
    }
  }, [
    shouldPlayThisVideo,
    videoKey,
    videoRef,
    playbackReady,
    syncPlayback,
    setOverlayVisible,
  ]);

  const play = useCallback(() => {
    playVideoGlobally(videoKey);
  }, [videoKey, playVideoGlobally]);

  const pause = useCallback(() => {
    pauseVideo(videoKey);
  }, [videoKey, pauseVideo]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  return { isPlaying, shouldPlayThisVideo, play, pause, toggle };
};
