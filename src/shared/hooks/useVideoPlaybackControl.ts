import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect } from "react";
import { useGlobalVideoStore } from "../../../app/store/useGlobalVideoStore";

export const useVideoPlaybackControl = ({
  videoKey,
  videoRef,
  enableAutoPlay = false,
  /**
   * When false, skip imperative play/pause sync and treat store-driven
   * pause() as a no-op so muted first-frame pre-roll can finish decoding.
   */
  playbackReady = true,
}: {
  videoKey: string;
  videoRef: { current: any } | { current: VideoPlayer | null };
  enableAutoPlay?: boolean;
  playbackReady?: boolean;
}) => {
  const {
    playingVideos,
    currentlyPlayingVideo,
    pauseVideo,
    setOverlayVisible,
    registerVideoPlayer,
    unregisterVideoPlayer,
    playVideoGlobally,
  } = useGlobalVideoStore();

  const isPlaying = playingVideos[videoKey] || false;
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

    const isExpoVideo =
      typeof p.play === "function" &&
      typeof p.pause === "function" &&
      !p.pauseAsync;

    const playerRef = {
      pause: async () => {
        const current = videoRef.current;
        if (!current) return;
        try {
          if (isExpoVideo) {
            current.pause();
            // Always silence non-active players — prevents echo when multiple
            // feed panes or neighbors are mounted with the same content.
            current.muted = true;
            current.volume = 0;
          } else {
            await current.pauseAsync();
          }
          setOverlayVisible(videoKey, true);
        } catch {
          // no-op
        }
      },
      // expo-video: imperative play/pause. expo-av Reels still rely on
      // declarative `shouldPlay` for start; only pause is imperative there.
      play: async () => {
        if (!videoRef.current) return;
        try {
          if (isExpoVideo) {
            videoRef.current.play();
          }
        } catch {
          // no-op
        }
      },
      showOverlay: () => setOverlayVisible(videoKey, true),
      key: videoKey,
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
    if (!playbackReady) return;

    const p = videoRef.current;
    if (!p) return;

    const isExpoVideo =
      typeof p.play === "function" &&
      typeof p.pause === "function" &&
      !p.pauseAsync;

    if (shouldPlayThisVideo) {
      if (isExpoVideo) {
        if (!p.playing) p.play();
      }
    } else {
      if (isExpoVideo) {
        p.muted = true;
        p.volume = 0;
        if (p.playing) {
          p.pause();
          setOverlayVisible(videoKey, true);
        }
      }
    }
  }, [
    shouldPlayThisVideo,
    videoKey,
    videoRef,
    playbackReady,
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
