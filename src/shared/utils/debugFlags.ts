/**
 * Centralized debug flags for noisy logs.
 *
 * Default: all false (quiet), so dev performance isn't impacted by log spam.
 * Flip to true temporarily when diagnosing a specific subsystem.
 */
export const DEBUG_FLAGS = {
  // Video feed + autoplay/visibility logic
  videoAutoPause: false,
  videoPlayback: false,
  videoHover: false,

  // Bible API request tracing
  bibleApi: false,
} as const;


