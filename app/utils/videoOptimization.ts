import * as Network from "expo-network";
import { Platform } from "react-native";

/**
 * Video Optimization Utility
 * Handles buffering, retry logic, and network-aware configuration
 * for smooth video playback even on slow connections (like Render free tier)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface VideoOptimizationConfig {
  // Buffering
  preferredForwardBufferDuration?: number; // iOS only
  preferredForwardBufferDurationAndroid?: number;
  progressUpdateInterval?: number;

  // Retry
  maxRetries?: number;
  retryDelay?: number;

  // Quality
  preferLowerQuality?: boolean;
  adaptiveQuality?: boolean;

  // Preloading
  preloadAhead?: number; // Number of videos to preload
  preloadBehind?: number;
}

export interface NetworkQuality {
  type: "excellent" | "good" | "fair" | "poor" | "offline";
  effectiveType?: string;
  downlink?: number; // Mbps
}

// Default configurations based on network quality
const NETWORK_CONFIGS: Record<NetworkQuality["type"], VideoOptimizationConfig> =
  {
    excellent: {
      preferredForwardBufferDuration: 30, // Increased from 10 to 30 seconds ahead
      progressUpdateInterval: 100,
      maxRetries: 2,
      retryDelay: 1000,
      preferLowerQuality: false,
      preloadAhead: 2,
      preloadBehind: 1,
    },
    good: {
      preferredForwardBufferDuration: 45, // Increased from 15 to 45 seconds for better stability
      progressUpdateInterval: 250,
      maxRetries: 3,
      retryDelay: 1500,
      preferLowerQuality: false,
      preloadAhead: 1,
      preloadBehind: 0,
    },
    fair: {
      preferredForwardBufferDuration: 60, // Increased from 20 to 60 seconds for smoother playback
      progressUpdateInterval: 500,
      maxRetries: 3,
      retryDelay: 2000,
      preferLowerQuality: true,
      preloadAhead: 0,
      preloadBehind: 0,
    },
    poor: {
      preferredForwardBufferDuration: 90, // Increased from 30 to 90 seconds for maximum buffer
      progressUpdateInterval: 1000,
      maxRetries: 5,
      retryDelay: 3000,
      preferLowerQuality: true,
      preloadAhead: 0,
      preloadBehind: 0,
    },
    offline: {
      preferredForwardBufferDuration: 0,
      progressUpdateInterval: 1000,
      maxRetries: 0,
      retryDelay: 0,
      preferLowerQuality: true,
      preloadAhead: 0,
      preloadBehind: 0,
    },
  };

// ============================================================================
// NETWORK DETECTION
// ============================================================================

let cachedNetworkQuality: NetworkQuality | null = null;
let lastNetworkCheck = 0;
const NETWORK_CHECK_INTERVAL = 30000; // Check every 30 seconds

/**
 * Detect current network quality
 */
export async function detectNetworkQuality(): Promise<NetworkQuality> {
  try {
    // Return cached value if recent
    const now = Date.now();
    if (
      cachedNetworkQuality &&
      now - lastNetworkCheck < NETWORK_CHECK_INTERVAL
    ) {
      return cachedNetworkQuality;
    }

    const networkState = await Network.getNetworkStateAsync();

    if (!networkState.isConnected) {
      cachedNetworkQuality = { type: "offline" };
      lastNetworkCheck = now;
      return cachedNetworkQuality;
    }

    // Determine quality based on connection type
    let quality: NetworkQuality["type"] = "good";

    switch (networkState.type) {
      case Network.NetworkStateType.WIFI:
      case Network.NetworkStateType.ETHERNET:
        quality = "excellent";
        break;
      case Network.NetworkStateType.CELLULAR:
        // Could be 4G/5G (good) or 3G (fair) or 2G (poor)
        // Default to 'good' for cellular, but we could enhance this
        quality = "good";
        break;
      case Network.NetworkStateType.BLUETOOTH:
      case Network.NetworkStateType.WIMAX:
        quality = "fair";
        break;
      default:
        quality = "fair";
    }

    cachedNetworkQuality = {
      type: quality,
      effectiveType: networkState.type,
    };
    lastNetworkCheck = now;

    console.log("📡 Network quality detected:", cachedNetworkQuality);
    return cachedNetworkQuality;
  } catch (error) {
    console.warn("⚠️ Failed to detect network quality:", error);
    // Default to 'fair' on error
    return { type: "fair" };
  }
}

/**
 * Get optimal video configuration for current network
 */
export async function getOptimalVideoConfig(): Promise<VideoOptimizationConfig> {
  const networkQuality = await detectNetworkQuality();
  const config = NETWORK_CONFIGS[networkQuality.type];

  console.log(
    "⚙️ Using video config for network type:",
    networkQuality.type,
    config
  );
  return config;
}

// ============================================================================
// VIDEO PROPS GENERATION
// ============================================================================

/**
 * Generate optimized video props for expo-av Video component
 */
export async function getOptimizedVideoProps(options?: {
  forceConfig?: VideoOptimizationConfig;
  isReels?: boolean;
  isMuted?: boolean;
}) {
  const config = options?.forceConfig || (await getOptimalVideoConfig());

  const baseProps = {
    // Buffering configuration
    progressUpdateIntervalMillis: config.progressUpdateInterval || 250,

    // iOS specific
    ...(Platform.OS === "ios" && {
      preferredForwardBufferDuration:
        config.preferredForwardBufferDuration || 30,
      shouldCorrectPitch: true,
    }),

    // Android specific - expo-av supports preferredForwardBufferDuration on Android too
    ...(Platform.OS === "android" && {
      preferredForwardBufferDuration:
        config.preferredForwardBufferDuration || 30,
    }),

    // Error handling
    onError: (error: any) => {
      console.error("❌ Video playback error:", error);
    },

    // Smooth playback
    shouldPlay: false, // Controlled externally
    useNativeControls: false,

    // Volume
    isMuted: options?.isMuted ?? false,
    volume: options?.isMuted ? 0 : 1.0,

    // Prevent pitch correction issues
    ...(Platform.OS === "android" && {
      shouldCorrectPitch: false,
    }),
  };

  return baseProps;
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  onSuccess?: () => void;
  onFailure?: (error: any) => void;
}

/**
 * Retry a video load with exponential backoff
 */
export async function retryVideoLoad(
  videoUrl: string,
  loadFunction: (url: string) => Promise<any>,
  options?: RetryOptions
): Promise<boolean> {
  const config = await getOptimalVideoConfig();
  const maxRetries = options?.maxRetries ?? config.maxRetries ?? 3;
  const baseDelay = options?.retryDelay ?? config.retryDelay ?? 1500;

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1.5s, 3s, 6s, 12s...
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(
          `🔄 Retrying video load (attempt ${attempt}/${maxRetries}) after ${delay}ms...`
        );

        options?.onRetry?.(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      await loadFunction(videoUrl);

      if (attempt > 0) {
        console.log(`✅ Video loaded successfully after ${attempt} retries`);
      }

      options?.onSuccess?.();
      return true;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Video load attempt ${attempt + 1} failed:`, error);

      if (attempt === maxRetries) {
        console.error(`❌ Video load failed after ${maxRetries} retries`);
        options?.onFailure?.(lastError);
        return false;
      }
    }
  }

  return false;
}

// ============================================================================
// PRELOADING
// ============================================================================

interface PreloadCache {
  [url: string]: {
    preloaded: boolean;
    timestamp: number;
  };
}

const preloadCache: PreloadCache = {};
const PRELOAD_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a video should be preloaded based on configuration
 */
export function shouldPreloadVideo(
  currentIndex: number,
  targetIndex: number,
  config: VideoOptimizationConfig
): boolean {
  const difference = targetIndex - currentIndex;

  // Check if within preload range
  if (difference > 0 && difference <= (config.preloadAhead || 0)) {
    return true;
  }

  if (difference < 0 && Math.abs(difference) <= (config.preloadBehind || 0)) {
    return true;
  }

  return false;
}

/**
 * Mark a video as preloaded
 */
export function markVideoPreloaded(videoUrl: string): void {
  preloadCache[videoUrl] = {
    preloaded: true,
    timestamp: Date.now(),
  };
}

/**
 * Check if a video is already preloaded
 */
export function isVideoPreloaded(videoUrl: string): boolean {
  const cached = preloadCache[videoUrl];
  if (!cached) return false;

  // Check if cache is still valid
  const age = Date.now() - cached.timestamp;
  if (age > PRELOAD_CACHE_DURATION) {
    delete preloadCache[videoUrl];
    return false;
  }

  return cached.preloaded;
}

/**
 * Clear preload cache
 */
export function clearPreloadCache(): void {
  Object.keys(preloadCache).forEach((key) => delete preloadCache[key]);
  console.log("🗑️ Preload cache cleared");
}

// ============================================================================
// BUFFER MONITORING
// ============================================================================

interface BufferStatus {
  isBuffering: boolean;
  bufferProgress: number;
  estimatedTimeToPlay: number;
}

/**
 * Monitor buffering status from playback updates
 */
export function getBufferStatus(status: any): BufferStatus {
  if (!status?.isLoaded) {
    return {
      isBuffering: true,
      bufferProgress: 0,
      estimatedTimeToPlay: 0,
    };
  }

  const isBuffering =
    status.isBuffering ||
    (!status.isPlaying && status.playableDurationMillis < 3000);
  const bufferProgress = status.playableDurationMillis
    ? (status.playableDurationMillis / status.durationMillis) * 100
    : 0;

  // Estimate time to play based on buffer rate
  const estimatedTimeToPlay = isBuffering
    ? Math.max(0, 3000 - (status.playableDurationMillis || 0))
    : 0;

  return {
    isBuffering,
    bufferProgress,
    estimatedTimeToPlay,
  };
}

// ============================================================================
// URL OPTIMIZATION
// ============================================================================

/**
 * Add cache-busting and optimization params to video URL
 */
export function optimizeVideoUrl(
  url: string,
  options?: {
    preferLowerQuality?: boolean;
    cacheBust?: boolean;
  }
): string {
  try {
    const urlObj = new URL(url);

    // Add cache control for better performance
    if (options?.cacheBust) {
      urlObj.searchParams.set("t", Date.now().toString());
    }

    // Add quality hints if supported by backend
    if (options?.preferLowerQuality) {
      urlObj.searchParams.set("quality", "medium");
    }

    return urlObj.toString();
  } catch (error) {
    console.warn("⚠️ Failed to optimize video URL:", error);
    return url;
  }
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

interface VideoPerformanceMetrics {
  loadTime: number;
  bufferTime: number;
  playbackErrors: number;
  successRate: number;
}

const performanceMetrics: Map<string, VideoPerformanceMetrics> = new Map();

/**
 * Record video performance metrics
 */
export function recordVideoMetrics(
  videoUrl: string,
  metrics: Partial<VideoPerformanceMetrics>
): void {
  const existing = performanceMetrics.get(videoUrl) || {
    loadTime: 0,
    bufferTime: 0,
    playbackErrors: 0,
    successRate: 100,
  };

  performanceMetrics.set(videoUrl, {
    ...existing,
    ...metrics,
  });
}

/**
 * Get video performance metrics
 */
export function getVideoMetrics(
  videoUrl: string
): VideoPerformanceMetrics | null {
  return performanceMetrics.get(videoUrl) || null;
}

/**
 * Get average performance across all videos
 */
export function getAveragePerformance(): VideoPerformanceMetrics {
  if (performanceMetrics.size === 0) {
    return {
      loadTime: 0,
      bufferTime: 0,
      playbackErrors: 0,
      successRate: 100,
    };
  }

  const metrics = Array.from(performanceMetrics.values());
  const avg = metrics.reduce(
    (acc, m) => ({
      loadTime: acc.loadTime + m.loadTime,
      bufferTime: acc.bufferTime + m.bufferTime,
      playbackErrors: acc.playbackErrors + m.playbackErrors,
      successRate: acc.successRate + m.successRate,
    }),
    { loadTime: 0, bufferTime: 0, playbackErrors: 0, successRate: 0 }
  );

  const count = metrics.length;
  return {
    loadTime: avg.loadTime / count,
    bufferTime: avg.bufferTime / count,
    playbackErrors: avg.playbackErrors / count,
    successRate: avg.successRate / count,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const videoOptimization = {
  // Network
  detectNetworkQuality,
  getOptimalVideoConfig,

  // Props
  getOptimizedVideoProps,

  // Retry
  retryVideoLoad,

  // Preload
  shouldPreloadVideo,
  markVideoPreloaded,
  isVideoPreloaded,
  clearPreloadCache,

  // Buffer
  getBufferStatus,

  // URL
  optimizeVideoUrl,

  // Metrics
  recordVideoMetrics,
  getVideoMetrics,
  getAveragePerformance,
};

export default videoOptimization;
