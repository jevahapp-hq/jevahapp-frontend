import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect } from "react";
import { useGlobalVideoStore } from "../../../app/store/useGlobalVideoStore";

/**
 * Centralized hook for video playback control
 * Manages video play/pause state with proper Instagram/TikTok-like behavior
 * - Only one video plays at a time
 * - Manual play/pause control (NO auto-play)
 * - Proper state synchronization
 * Supports both expo-av Video refs and expo-video VideoPlayer instances
 */
export const useVideoPlaybackControl = ({
  videoKey,
  videoRef,
  enableAutoPlay = false,
}: {
  videoKey: string;
  videoRef: React.RefObject<any> | { current: VideoPlayer | null };
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
    playVideoGlobally,
  } = useGlobalVideoStore();

  const isPlaying = playingVideos[videoKey] || false;
  const isCurrentlyPlaying = currentlyPlayingVideo === videoKey;
  const shouldPlayThisVideo = isPlaying && isCurrentlyPlaying;

  // Register/unregister video player for imperative control
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    // Check if it's expo-video player (has .play/.pause methods directly)
    const isExpoVideoPlayer = typeof player.play === 'function' && typeof player.pause === 'function' && !player.pauseAsync;

    const playerRef = {
      pause: async () => {
        if (player) {
          try {
            if (isExpoVideoPlayer) {
              player.pause();
            } else {
              // expo-av Video
              await player.pauseAsync();
            }
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
    const player = videoRef.current;
    if (!player) return;

    // Only sync if auto-play is explicitly enabled or if video was manually played
    if (!enableAutoPlay && !isCurrentlyPlaying && !shouldPlayThisVideo) {
      return;
    }

    const syncPlayback = async () => {
      try {
        // Check if it's expo-video player
        const isExpoVideoPlayer = typeof player.play === 'function' && typeof player.pause === 'function' && !player.pauseAsync;

        if (shouldPlayThisVideo) {
          // Video should be playing
          if (isExpoVideoPlayer) {
            if (!player.playing) {
              console.log(`▶️ Syncing playback: Playing ${videoKey}`);
              player.play();
            }
          } else {
            // expo-av Video
            const status = await player.getStatusAsync();
            if (status?.isLoaded && !status.isPlaying) {
              console.log(`▶️ Syncing playback: Playing ${videoKey}`);
              await player.playAsync();
            }
          }
        } else {
          // Video should be paused
          if (isExpoVideoPlayer) {
            if (player.playing) {
              console.log(`⏸️ Syncing playback: Pausing ${videoKey}`);
              player.pause();
              setOverlayVisible(videoKey, true);
            }
          } else {
            // expo-av Video
            const status = await player.getStatusAsync();
            if (status?.isLoaded && status.isPlaying) {
              console.log(`⏸️ Syncing playback: Pausing ${videoKey}`);
              await player.pauseAsync();
              setOverlayVisible(videoKey, true);
            }
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
    // Use global play to ensure only one video plays at a time
    playVideoGlobally(videoKey);
  }, [videoKey, playVideoGlobally]);

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
