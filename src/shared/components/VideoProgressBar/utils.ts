/**
 * Utility functions for the video progress bar
 * Centralized calculations and formatting for easy debugging
 */

/**
 * Format milliseconds to MM:SS format
 */
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Calculate progress percentage from current and duration
 */
export const calculateProgress = (currentMs: number, durationMs: number): number => {
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(1, currentMs / durationMs));
};

/**
 * Calculate epsilon (tolerance) for seek completion
 */
export const calculateSeekEpsilon = (
  durationMs: number,
  seekMsTolerance: number,
  minProgressEpsilon: number
): number => {
  if (durationMs <= 0) return minProgressEpsilon;
  return Math.max(minProgressEpsilon, seekMsTolerance / durationMs);
};

/**
 * Check if progress is close enough to target (within epsilon)
 */
export const isProgressCloseEnough = (
  current: number,
  target: number,
  epsilon: number
): boolean => {
  return Math.abs(current - target) <= epsilon;
};

/**
 * Clamp value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Calculate vertical scrub slowdown factor
 * TikTok-style: dragging vertically slows down horizontal scrubbing
 */
export const calculateVerticalScrubSlowdown = (
  verticalDelta: number,
  sensitivityBase: number,
  maxSlowdown: number
): number => {
  if (sensitivityBase <= 0) return 1;
  return Math.min(maxSlowdown, 1 + Math.abs(verticalDelta) / sensitivityBase);
};

/**
 * Calculate progress from touch position
 */
export const calculateProgressFromTouch = (
  touchX: number,
  barWidth: number,
  startProgress: number,
  horizontalDelta: number,
  verticalDelta: number,
  verticalScrubConfig: { enabled: boolean; sensitivityBase: number; maxSlowdown: number }
): number => {
  if (barWidth <= 0) return startProgress;
  
  // Apply vertical scrub slowdown if enabled
  const slowdown = verticalScrubConfig.enabled
    ? calculateVerticalScrubSlowdown(
        verticalDelta,
        verticalScrubConfig.sensitivityBase,
        verticalScrubConfig.maxSlowdown
      )
    : 1;
  
  // Calculate delta progress with slowdown applied
  const deltaProgress = horizontalDelta / barWidth / slowdown;
  
  return clamp(startProgress + deltaProgress, 0, 1);
};

/**
 * Debug logger - only logs when debug mode is enabled
 */
export const debugLog = (message: string, data?: any, enabled: boolean = false) => {
  if (enabled) {
    console.log(`[ProgressBar] ${message}`, data || '');
  }
};


