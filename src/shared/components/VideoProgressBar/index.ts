// Export the original VideoProgressBar for backward compatibility
export { default as VideoProgressBar } from "./VideoProgressBar";
export type { VideoProgressBarProps } from "./VideoProgressBar";

// Export the new modular TikTok-style progress bar
export { TikTokProgressBar } from "./TikTokProgressBar";

// Export types and utilities for advanced usage
export type { ProgressBarProps, ProgressBarConfig, ProgressBarState } from "./types";
export { formatTime, calculateProgress } from "./utils";
