import { Video } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import videoOptimization, {
  getBufferStatus,
  getOptimalVideoConfig,
  getOptimizedVideoProps,
  retryVideoLoad,
  type VideoOptimizationConfig,
} from "../utils/videoOptimization";

/**
 * Custom hook for optimized video playback
 * Handles buffering, retry logic, and network-aware configuration
 */

export interface UseOptimizedVideoOptions {
  videoUrl: string;
  shouldPlay?: boolean;
  isMuted?: boolean;
  isReels?: boolean;
  onLoad?: () => void;
  onError?: (error: any) => void;
  onBuffering?: (isBuffering: boolean) => void;
  maxRetries?: number;
}

export interface UseOptimizedVideoReturn {
  // Video ref
  videoRef: React.RefObject<Video>;

  // State
  isLoading: boolean;
  isBuffering: boolean;
  hasError: boolean;
  errorMessage: string;
  retryCount: number;
  bufferProgress: number;

  // Config
  videoProps: any;
  config: VideoOptimizationConfig | null;

  // Actions
  retry: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useOptimizedVideo(
  options: UseOptimizedVideoOptions
): UseOptimizedVideoReturn {
  const {
    videoUrl,
    shouldPlay = false,
    isMuted = false,
    isReels = false,
    onLoad,
    onError,
    onBuffering,
    maxRetries = 3,
  } = options;

  // Refs
  const videoRef = useRef<Video>(null);
  const loadStartTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [config, setConfig] = useState<VideoOptimizationConfig | null>(null);
  const [videoProps, setVideoProps] = useState<any>(null);

  // Load configuration on mount
  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      try {
        const [optimalConfig, optimizedProps] = await Promise.all([
          getOptimalVideoConfig(),
          getOptimizedVideoProps({ isReels, isMuted }),
        ]);

        if (mounted) {
          setConfig(optimalConfig);
          setVideoProps(optimizedProps);
          console.log("⚙️ Video optimization config loaded:", optimalConfig);
        }
      } catch (error) {
        console.error("❌ Failed to load video config:", error);
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, [isReels, isMuted]);

  // Handle video load
  const handleVideoLoad = useCallback(
    async (status: any) => {
      if (!isMountedRef.current) return;

      if (status?.isLoaded) {
        const loadTime = Date.now() - loadStartTimeRef.current;
        console.log(`✅ Video loaded in ${loadTime}ms:`, videoUrl);

        // Record performance metrics
        videoOptimization.recordVideoMetrics(videoUrl, {
          loadTime,
          successRate: 100,
        });

        setIsLoading(false);
        setHasError(false);
        setErrorMessage("");
        onLoad?.();
      }
    },
    [videoUrl, onLoad]
  );

  // Handle video error
  const handleVideoError = useCallback(
    (error: any) => {
      if (!isMountedRef.current) return;

      console.error("❌ Video error:", error);

      // Record error metrics
      videoOptimization.recordVideoMetrics(videoUrl, {
        playbackErrors: 1,
        successRate: 0,
      });

      setHasError(true);
      setErrorMessage(error?.message || "Failed to load video");
      setIsLoading(false);
      onError?.(error);
    },
    [videoUrl, onError]
  );

  // Handle playback status updates
  const handlePlaybackStatusUpdate = useCallback(
    (status: any) => {
      if (!isMountedRef.current || !status?.isLoaded) return;

      // Check buffering status
      const bufferStatus = getBufferStatus(status);

      if (bufferStatus.isBuffering !== isBuffering) {
        setIsBuffering(bufferStatus.isBuffering);
        onBuffering?.(bufferStatus.isBuffering);

        if (bufferStatus.isBuffering) {
          console.log("⏳ Video is buffering...");
        } else {
          console.log("▶️ Video playback resumed");
        }
      }

      setBufferProgress(bufferStatus.bufferProgress);
    },
    [isBuffering, onBuffering]
  );

  // Retry loading video
  const retry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      console.warn("⚠️ Maximum retry attempts reached");
      return;
    }

    console.log(
      `🔄 Retrying video load (attempt ${retryCount + 1}/${maxRetries})...`
    );
    setRetryCount((prev) => prev + 1);
    setHasError(false);
    setErrorMessage("");
    setIsLoading(true);
    loadStartTimeRef.current = Date.now();

    try {
      // Unload current video
      await videoRef.current?.unloadAsync();

      // Reload with retry logic
      const success = await retryVideoLoad(
        videoUrl,
        async (url) => {
          await videoRef.current?.loadAsync(
            { uri: url },
            { shouldPlay: false }
          );
        },
        {
          maxRetries: 1, // Single retry attempt per call
          onSuccess: handleVideoLoad,
          onFailure: handleVideoError,
        }
      );

      if (!success) {
        throw new Error("Retry failed");
      }
    } catch (error) {
      console.error("❌ Retry failed:", error);
      handleVideoError(error);
    }
  }, [videoUrl, retryCount, maxRetries, handleVideoLoad, handleVideoError]);

  // Reload video (reset everything)
  const reload = useCallback(async () => {
    console.log("🔄 Reloading video...");
    setRetryCount(0);
    setHasError(false);
    setErrorMessage("");
    setIsLoading(true);
    setIsBuffering(false);
    setBufferProgress(0);
    loadStartTimeRef.current = Date.now();

    try {
      await videoRef.current?.unloadAsync();
      await videoRef.current?.loadAsync(
        { uri: videoUrl },
        { shouldPlay: false }
      );
    } catch (error) {
      console.error("❌ Reload failed:", error);
      handleVideoError(error);
    }
  }, [videoUrl, handleVideoError]);

  // Initialize video load on mount or URL change
  useEffect(() => {
    if (!videoUrl || !videoProps) return;

    loadStartTimeRef.current = Date.now();
    setIsLoading(true);
    setHasError(false);

    return () => {
      // Cleanup on unmount
      videoRef.current?.unloadAsync().catch(console.warn);
    };
  }, [videoUrl, videoProps]);

  // Track mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    // Refs
    videoRef,

    // State
    isLoading,
    isBuffering,
    hasError,
    errorMessage,
    retryCount,
    bufferProgress,

    // Config
    videoProps: {
      ...videoProps,
      shouldPlay,
      isMuted,
      onLoad: handleVideoLoad,
      onError: handleVideoError,
      onPlaybackStatusUpdate: handlePlaybackStatusUpdate,
    },
    config,

    // Actions
    retry,
    reload,
  };
}

export default useOptimizedVideo;
