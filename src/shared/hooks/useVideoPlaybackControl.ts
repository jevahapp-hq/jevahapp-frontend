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
  // CRITICAL: Register immediately when player is available, not in useEffect
  // This ensures player is ready when playVideoGlobally is called
  useEffect(() => {
    const player = videoRef.current;
    if (!player) {
      // If player not ready, unregister any existing registration
      unregisterVideoPlayer(videoKey);
      return;
    }

    // Check if it's expo-video player (has .play/.pause methods directly)
    const isExpoVideoPlayer = typeof player.play === 'function' && typeof player.pause === 'function' && !player.pauseAsync;

    const playerRef = {
      pause: async () => {
        const currentPlayer = videoRef.current;
        if (currentPlayer) {
          try {
            if (isExpoVideoPlayer) {
              currentPlayer.pause();
            } else {
              // expo-av Video
              await currentPlayer.pauseAsync();
            }
            setOverlayVisible(videoKey, true);
          } catch (err) {
            console.warn(`Failed to pause ${videoKey}:`, err);
          }
        }
      },
      play: async () => {
        const currentPlayer = videoRef.current;
        if (currentPlayer) {
          try {
            if (isExpoVideoPlayer) {
              // For expo-video, ensure player is ready before playing
              if (currentPlayer.currentTime === undefined || currentPlayer.duration === undefined) {
                // Player might still be loading, wait a bit
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              currentPlayer.play();
            } else {
              // expo-av Video - ensure loaded before playing
              const status = await currentPlayer.getStatusAsync();
              if (status?.isLoaded) {
                return currentPlayer.playAsync();
              } else {
                // Wait for load, then play
                return new Promise((resolve, reject) => {
                  const checkStatus = async () => {
                    const s = await currentPlayer.getStatusAsync();
                    if (s?.isLoaded) {
                      currentPlayer.playAsync().then(resolve).catch(reject);
                    } else {
                      setTimeout(checkStatus, 50);
                    }
                  };
                  checkStatus();
                });
              }
            }
          } catch (err) {
            console.warn(`Failed to play ${videoKey}:`, err);
            throw err;
          }
        }
      },
      showOverlay: () => {
        setOverlayVisible(videoKey, true);
      },
      key: videoKey,
    };

    // Register immediately - don't wait
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
  // CRITICAL: Only sync when state changes, don't trigger delayed playback
  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;

    // CRITICAL FIX: Only sync if this video is CURRENTLY the playing video
    // This prevents delayed playback when clicking on other videos
    const isCurrentlyThePlayingVideo = currentlyPlayingVideo === videoKey;
    
    // Only sync if auto-play is explicitly enabled OR if this is the currently playing video
    if (!enableAutoPlay && !isCurrentlyThePlayingVideo && !shouldPlayThisVideo) {
      return;
    }

    // CRITICAL: If another video is playing, immediately pause this one
    // This prevents overlap when clicking multiple videos quickly
    if (currentlyPlayingVideo && currentlyPlayingVideo !== videoKey && shouldPlayThisVideo) {
      // Another video is playing, pause this one immediately
      const isExpoVideoPlayer = typeof player.play === 'function' && typeof player.pause === 'function' && !player.pauseAsync;
      if (isExpoVideoPlayer) {
        if (player.playing) {
          player.pause();
          setOverlayVisible(videoKey, true);
        }
      } else {
        player.getStatusAsync().then((status) => {
          if (status?.isLoaded && status.isPlaying) {
            player.pauseAsync().then(() => {
              setOverlayVisible(videoKey, true);
            }).catch(console.warn);
          }
        }).catch(console.warn);
      }
      return;
    }

    const syncPlayback = async () => {
      try {
        // Check if it's expo-video player
        const isExpoVideoPlayer = typeof player.play === 'function' && typeof player.pause === 'function' && !player.pauseAsync;

        if (shouldPlayThisVideo && isCurrentlyThePlayingVideo) {
          // Video should be playing AND it's the currently selected video
          if (isExpoVideoPlayer) {
            if (!player.playing) {
              player.play();
            }
          } else {
            // expo-av Video
            const status = await player.getStatusAsync();
            if (status?.isLoaded && !status.isPlaying) {
              await player.playAsync();
            }
          }
        } else {
          // Video should be paused (either not selected or not in playing state)
          if (isExpoVideoPlayer) {
            if (player.playing) {
              player.pause();
              setOverlayVisible(videoKey, true);
            }
          } else {
            // expo-av Video
            const status = await player.getStatusAsync();
            if (status?.isLoaded && status.isPlaying) {
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
    currentlyPlayingVideo, // CRITICAL: Add this dependency
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
