import { Video } from "expo-av";
import { useCallback, useEffect } from "react";
import { useGlobalVideoStore } from "../../../app/store/useGlobalVideoStore";

/**
 * Centralized hook for video playback control
 * Manages video play/pause state with proper Instagram/TikTok-like behavior
 * - Only one video plays at a time
 * - Manual play/pause control (NO auto-play)
 * - Proper state synchronization
 */
export const useVideoPlaybackControl = ({
  videoKey,
  videoRef,
  enableAutoPlay = false,
}: {
  videoKey: string;
  videoRef: React.RefObject<Video>;
  enableAutoPlay?: boolean;
}) => {
  const {
    playingVideos,
    currentlyPlayingVideo,
    playVideo,
    pauseVideo,
    pauseAllVideos,
    setOverlayVisible,
    isAutoPlayEnabled,
    registerVideoPlayer,
    unregisterVideoPlayer,
  } = useGlobalVideoStore();

  const isPlaying = playingVideos[videoKey] || false;
  const isCurrentlyPlaying = currentlyPlayingVideo === videoKey;
  const shouldPlayThisVideo = isPlaying && isCurrentlyPlaying;

  // Register/unregister video player for imperative control
  useEffect(() => {
    if (!videoRef.current) return;

    const playerRef = {
      pause: async () => {
        if (videoRef.current) {
          try {
            await videoRef.current.pauseAsync();
            setOverlayVisible(videoKey, true);
          } catch (err) {
            console.warn(`Failed to pause ${videoKey}:`, err);
          }
        }
      },
      showOverlay: () => {
        setOverlayVisible(videoKey, true);
      },
      key: videoKey,
    };

    registerVideoPlayer(videoKey, playerRef);

    return () => {
      unregisterVideoPlayer(videoKey);
    };
  }, [
    videoKey,
    videoRef,
    registerVideoPlayer,
    unregisterVideoPlayer,
    setOverlayVisible,
  ]);

  // Sync video playback with global state (NO AUTO-PLAY unless explicitly enabled)
  useEffect(() => {
    if (!videoRef.current) return;

    // Only sync if auto-play is explicitly enabled or if video was manually played
    if (!enableAutoPlay && !isCurrentlyPlaying && !shouldPlayThisVideo) {
      return;
    }

    const syncPlayback = async () => {
      try {
        if (shouldPlayThisVideo) {
          // Video should be playing
          const status = await videoRef.current?.getStatusAsync();
          if (status?.isLoaded && !status.isPlaying) {
            console.log(`▶️ Syncing playback: Playing ${videoKey}`);
            await videoRef.current?.playAsync();
          }
        } else {
          // Video should be paused
          const status = await videoRef.current?.getStatusAsync();
          if (status?.isLoaded && status.isPlaying) {
            console.log(`⏸️ Syncing playback: Pausing ${videoKey}`);
            await videoRef.current?.pauseAsync();
            setOverlayVisible(videoKey, true);
          }
        }
      } catch (error) {
        console.error(`❌ Error syncing playback for ${videoKey}:`, error);
      }
    };

    syncPlayback();
  }, [
    shouldPlayThisVideo,
    videoKey,
    videoRef,
    setOverlayVisible,
    enableAutoPlay,
    isCurrentlyPlaying,
  ]);

  // Manual play control
  const play = useCallback(() => {
    console.log(`🎮 Manual play triggered for: ${videoKey}`);
    playVideo(videoKey);
  }, [videoKey, playVideo]);

  // Manual pause control
  const pause = useCallback(() => {
    console.log(`🎮 Manual pause triggered for: ${videoKey}`);
    pauseVideo(videoKey);
  }, [videoKey, pauseVideo]);

  // Toggle play/pause
  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  return {
    isPlaying,
    isCurrentlyPlaying,
    shouldPlayThisVideo,
    play,
    pause,
    toggle,
  };
};
