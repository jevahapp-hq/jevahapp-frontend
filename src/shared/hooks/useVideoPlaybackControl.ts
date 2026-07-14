import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef } from "react";
import { useGlobalVideoStore } from "../../../app/store/useGlobalVideoStore";

export const useVideoPlaybackControl = ({
  videoKey,
  videoRef,
  enableAutoPlay = false,
}: {
  videoKey: string;
  videoRef: { current: any } | { current: VideoPlayer | null };
  enableAutoPlay?: boolean;
}) => {
  const {
    playingVideos,
    currentlyPlayingVideo,
    playVideo,
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
    return () => { deactivateKeepAwake(tag); };
  }, [shouldPlayThisVideo, videoKey]);

  // Register/unregister player for imperative control
  useEffect(() => {
    const p = videoRef.current;
    if (!p) {
      unregisterVideoPlayer(videoKey);
      return;
    }

    const isExpoVideo = typeof p.play === "function" && typeof p.pause === "function" && !p.pauseAsync;

    const playerRef = {
      pause: async () => {
        const current = videoRef.current;
        if (!current) return;
        try {
          if (isExpoVideo) {
            current.pause();
          } else {
            await current.pauseAsync();
          }
          setOverlayVisible(videoKey, true);
        } catch {
          // no-op
        }
      },
      // expo-av (the branch Reels and this card both actually use) does NOT
      // get an imperative play() here on purpose - only pause() above is
      // imperative. Reels' own player registration (ReelsVideoItem.tsx)
      // does the same thing and has no playback issues. Starting playback
      // is left entirely to the declarative `shouldPlay` prop on <Video>.
      // Previously this also fired `videoRef.current.playAsync()` here,
      // which raced the same player's own internal `shouldPlay`-driven
      // play() - both trying to start the same AVPlayer/ExoPlayer at once.
      // That race was harmless when switches were rare, but got exposed as
      // "video plays but no audio" once autoplay started switching videos
      // more often (see the tightened viewability config in
      // AllContentTikTok/index.tsx).
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
    return () => { unregisterVideoPlayer(videoKey); };
  }, [videoKey, videoRef, registerVideoPlayer, unregisterVideoPlayer, setOverlayVisible]);

  // Direct imperative sync: if this is the playing video, play it; otherwise pause
  useEffect(() => {
    const p = videoRef.current;
    if (!p) return;

    const isExpoVideo = typeof p.play === "function" && typeof p.pause === "function" && !p.pauseAsync;

    if (shouldPlayThisVideo) {
      if (isExpoVideo) {
        if (!p.playing) p.play();
      }
    } else {
      if (isExpoVideo) {
        if (p.playing) {
          p.pause();
          setOverlayVisible(videoKey, true);
        }
      }
    }
  }, [shouldPlayThisVideo, videoKey, videoRef, setOverlayVisible]);

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
