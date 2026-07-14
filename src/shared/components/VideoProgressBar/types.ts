/**
 * Types for the modular TikTok-style video progress bar.
 */

export interface ProgressBarConfig {
  trackHeight: number;
  trackHeightDragging: number;
  knobSize: number;
  knobSizeDragging: number;
  trackColor: string;
  progressColor: string;
  knobColor: string;

  enableHaptics: boolean;
  enlargeOnDrag: boolean;
  showFloatingLabel: boolean;
  showTimeLabels: boolean;

  seekSyncTicks: number;
  seekMsTolerance: number;
  minProgressEpsilon: number;

  /** Seek while dragging (throttled). false = seek only on release. */
  seekDuringDrag: boolean;
  liveSeekThrottleMs: number;

  verticalScrub: {
    enabled: boolean;
    sensitivityBase: number;
    maxSlowdown: number;
  };
}

export interface ProgressBarProps {
  progress: number;
  currentMs: number;
  durationMs: number;

  isMuted: boolean;
  onToggleMute: () => void;
  onSeekToPercent: (percent: number) => void;

  /** Parent can pause position polling / loop while scrubbing (Reels, feed). */
  onScrubStart?: () => void;
  onScrubEnd?: () => void;

  showControls?: boolean;
  config?: Partial<ProgressBarConfig>;
  debug?: boolean;
}

export interface ProgressBarState {
  isDragging: boolean;
  isSeeking: boolean;
  dragProgress: number;
  targetProgress: number | null;
  stableTicks: number;
  barWidth: number;
}
