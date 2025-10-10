import { Video } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook to manage video playback state
 * Ensures proper synchronization between video player and controls
 */

export interface UseVideoPlaybackOptions {
  videoKey: string;
  autoPlay?: boolean;
  onPlaybackUpdate?: (status: {
    position: number;
    duration: number;
    isPlaying: boolean;
    isBuffering: boolean;
  }) => void;
}

export interface UseVideoPlaybackReturn {
  // Video ref
  videoRef: React.RefObject<Video>;

  // State
  duration: number;
  position: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isLoaded: boolean;

  // Controls
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  seekBy: (deltaMs: number) => Promise<void>;

  // Handlers for Video component
  onPlaybackStatusUpdate: (status: any) => void;
  onLoad: (status: any) => void;
  onError: (error: any) => void;
}

export function useVideoPlayback(
  options: UseVideoPlaybackOptions
): UseVideoPlaybackReturn {
  const { videoKey, autoPlay = false, onPlaybackUpdate } = options;

  // Refs
  const videoRef = useRef<Video>(null);
  const isMountedRef = useRef(true);
  const lastPositionRef = useRef(0);

  // State
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Play
  const play = useCallback(async () => {
    try {
      if (!videoRef.current) return;
      await videoRef.current.playAsync();
      setIsPlaying(true);
      console.log(`▶️ Playing video: ${videoKey}`);
    } catch (error) {
      console.error("❌ Error playing video:", error);
    }
  }, [videoKey]);

  // Pause
  const pause = useCallback(async () => {
    try {
      if (!videoRef.current) return;
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
      console.log(`⏸️ Paused video: ${videoKey}`);
    } catch (error) {
      console.error("❌ Error pausing video:", error);
    }
  }, [videoKey]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  // Seek to position
  const seek = useCallback(
    async (positionMs: number) => {
      try {
        if (!videoRef.current || duration <= 0) {
          console.warn("⚠️ Cannot seek: video not ready");
          return;
        }

        const clampedPosition = Math.max(0, Math.min(positionMs, duration));

        // Update state immediately for UI responsiveness
        setPosition(clampedPosition);
        lastPositionRef.current = clampedPosition;

        // Seek the video
        await videoRef.current.setPositionAsync(clampedPosition);

        console.log(
          `⏩ Seeked to ${(clampedPosition / 1000).toFixed(1)}s / ${(
            duration / 1000
          ).toFixed(1)}s`
        );
      } catch (error) {
        console.error("❌ Error seeking video:", error);

        // Sync position from video on error
        try {
          const status = await videoRef.current?.getStatusAsync();
          if (status?.isLoaded && status.positionMillis !== undefined) {
            setPosition(status.positionMillis);
            lastPositionRef.current = status.positionMillis;
          }
        } catch (syncError) {
          console.error("❌ Error syncing position:", syncError);
        }
      }
    },
    [duration]
  );

  // Seek by delta (forward/backward)
  const seekBy = useCallback(
    async (deltaMs: number) => {
      const newPosition = position + deltaMs;
      await seek(newPosition);
    },
    [position, seek]
  );

  // Handle playback status updates
  const onPlaybackStatusUpdate = useCallback(
    (status: any) => {
      if (!isMountedRef.current || !status?.isLoaded) return;

      try {
        // Update duration
        if (status.durationMillis && duration === 0) {
          setDuration(status.durationMillis);
          console.log(
            `📏 Video duration: ${(status.durationMillis / 1000).toFixed(1)}s`
          );
        }

        // Update position (with smoothing to prevent jitter)
        if (status.positionMillis !== undefined) {
          const newPosition = status.positionMillis;
          // Only update if position changed significantly (avoid micro-updates)
          if (Math.abs(newPosition - lastPositionRef.current) > 50) {
            setPosition(newPosition);
            lastPositionRef.current = newPosition;
          }
        }

        // Update playing state
        if (status.isPlaying !== undefined) {
          setIsPlaying(status.isPlaying);
        }

        // Update buffering state
        const buffering =
          status.isBuffering ||
          (!status.isPlaying &&
            status.playableDurationMillis < 3000 &&
            status.positionMillis > 0);
        setIsBuffering(buffering);

        // Notify parent
        onPlaybackUpdate?.({
          position: status.positionMillis || 0,
          duration: status.durationMillis || 0,
          isPlaying: status.isPlaying || false,
          isBuffering: buffering,
        });

        // Handle video completion
        if (status.didJustFinish) {
          setIsPlaying(false);
          console.log("🏁 Video finished playing");
        }
      } catch (error) {
        console.error("❌ Error in playback status update:", error);
      }
    },
    [duration, onPlaybackUpdate]
  );

  // Handle video load
  const onLoad = useCallback(
    (status: any) => {
      if (!isMountedRef.current) return;

      if (status?.isLoaded) {
        setIsLoaded(true);
        if (status.durationMillis) {
          setDuration(status.durationMillis);
        }
        console.log(`✅ Video loaded: ${videoKey}`);

        // Auto-play if enabled
        if (autoPlay) {
          play();
        }
      }
    },
    [videoKey, autoPlay, play]
  );

  // Handle video error
  const onError = useCallback(
    (error: any) => {
      if (!isMountedRef.current) return;
      console.error(`❌ Video error (${videoKey}):`, error);
    },
    [videoKey]
  );

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Unload video
      videoRef.current?.unloadAsync().catch((err) => {
        console.warn("Error unloading video:", err);
      });
    };
  }, []);

  return {
    // Ref
    videoRef,

    // State
    duration,
    position,
    isPlaying,
    isBuffering,
    isLoaded,

    // Controls
    play,
    pause,
    togglePlayPause,
    seek,
    seekBy,

    // Handlers
    onPlaybackStatusUpdate,
    onLoad,
    onError,
  };
}

export default useVideoPlayback;
