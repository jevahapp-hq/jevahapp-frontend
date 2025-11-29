import { Video } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { mediaApi } from "../../src/core/api/MediaApi";

/**
 * Custom hook to manage video playback state
 * Ensures proper synchronization between video player and controls
 */

export interface UseVideoPlaybackOptions {
  videoKey: string;
  autoPlay?: boolean;
  mediaId?: string; // backend media id for playback tracking
  onPlaybackUpdate?: (status: {
    position: number;
    duration: number;
    isPlaying: boolean;
    isBuffering: boolean;
  }) => void;
}

export interface UseVideoPlaybackReturn {
  // Video ref
  videoRef: React.RefObject<Video | null>;

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
  const videoRef = useRef<Video | null>(null);
  const isMountedRef = useRef(true);
  const lastPositionRef = useRef(0);

  // State
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Backend playback session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to clear progress timer
  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  // Play
  const play = useCallback(async () => {
    try {
      if (!videoRef.current) return;

      // If we have a mediaId and duration, ensure a backend playback session exists
      if (options.mediaId && duration > 0 && !sessionId) {
        try {
          const durationSeconds = duration / 1000;
          const positionSeconds = position / 1000;
          const response = await mediaApi.startPlaybackSession(
            options.mediaId,
            {
              duration: Math.round(durationSeconds),
              position: Math.floor(positionSeconds),
            }
          );

          if (response.success) {
            const session = (response.data as any)?.data?.session;
            const resumeFrom = (response.data as any)?.data?.resumeFrom;
            if (session?._id) {
              setSessionId(session._id);
            }

            // Seek to resume position if provided
            if (
              resumeFrom != null &&
              !Number.isNaN(resumeFrom) &&
              resumeFrom > 0
            ) {
              const resumeMs = resumeFrom * 1000;
              await videoRef.current.setPositionAsync(resumeMs);
              setPosition(resumeMs);
              lastPositionRef.current = resumeMs;
            }

            // Start periodic progress updates every 10 seconds
            clearProgressTimer();
            progressTimerRef.current = setInterval(async () => {
              try {
                if (!sessionId || !videoRef.current) return;
                const status = await videoRef.current.getStatusAsync();
                if (!status?.isLoaded || !status.isPlaying) return;

                const currentMs = status.positionMillis ?? 0;
                const totalMs = status.durationMillis ?? 0;
                if (totalMs <= 0) return;

                const positionSec = currentMs / 1000;
                const durationSec = totalMs / 1000;
                const progressPercentage =
                  durationSec > 0 ? (positionSec / durationSec) * 100 : 0;

                await mediaApi.updatePlaybackProgress({
                  sessionId,
                  position: Math.floor(positionSec),
                  duration: Math.round(durationSec),
                  progressPercentage,
                });
              } catch (err) {
                console.warn("Error updating playback progress:", err);
              }
            }, 10000);
          }
        } catch (err) {
          console.warn("Failed to start backend playback session:", err);
        }
      }

      await videoRef.current.playAsync();
      setIsPlaying(true);
      console.log(`▶️ Playing video: ${videoKey}`);
    } catch (error) {
      console.error("❌ Error playing video:", error);
    }
  }, [videoKey, options.mediaId, duration, position, sessionId, clearProgressTimer]);

  // Pause
  const pause = useCallback(async () => {
    try {
      if (!videoRef.current) return;
      await videoRef.current.pauseAsync();
      setIsPlaying(false);
      console.log(`⏸️ Paused video: ${videoKey}`);

      // Notify backend about pause if we have an active session
      if (sessionId) {
        try {
          await mediaApi.pausePlayback(sessionId);
        } catch (err) {
          console.warn("Failed to pause backend playback session:", err);
        }
      }
    } catch (error) {
      console.error("❌ Error pausing video:", error);
    }
  }, [videoKey, sessionId]);

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
    async (status: any) => {
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

          // End backend playback session when video finishes
          if (sessionId) {
            try {
              const finalPositionSec = (status.positionMillis ?? 0) / 1000;
              await mediaApi.endPlaybackSession({
                sessionId,
                reason: "completed",
                finalPosition: Math.floor(finalPositionSec),
              });
            } catch (err) {
              console.warn("Failed to end backend playback session:", err);
            } finally {
              clearProgressTimer();
              setSessionId(null);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error in playback status update:", error);
      }
    },
    [duration, onPlaybackUpdate, sessionId, clearProgressTimer]
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
      clearProgressTimer();

      // Best-effort: if we still have an active session, end it as stopped
      if (sessionId) {
        mediaApi
          .endPlaybackSession({
            sessionId,
            reason: "stopped",
            finalPosition: Math.floor(lastPositionRef.current / 1000),
          })
          .catch((err) =>
            console.warn("Failed to end backend playback session on unmount:", err)
          );
      }

      // Unload video
      videoRef.current?.unloadAsync().catch((err) => {
        console.warn("Error unloading video:", err);
      });
    };
  }, [clearProgressTimer, sessionId]);

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
