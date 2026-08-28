/**
 * Progress bar config defaults — single source for TikTok-style scrubber.
 */
import type { ProgressBarConfig } from "./types";

export const DEFAULT_CONFIG: ProgressBarConfig = {
  trackHeight: 4,
  trackHeightDragging: 8,
  knobSize: 8,
  knobSizeDragging: 10,
  trackColor: "rgba(255, 255, 255, 0.3)",
  progressColor: "#FEA74E",
  knobColor: "#FEA74E",
  enableHaptics: false,
  enlargeOnDrag: true,
  showFloatingLabel: true,
  showTimeLabels: true,
  seekSyncTicks: 2,
  seekMsTolerance: 300,
  minProgressEpsilon: 0.01,
  seekDuringDrag: true,
  liveSeekThrottleMs: 48,
  verticalScrub: {
    enabled: true,
    sensitivityBase: 60,
    maxSlowdown: 5,
  },
};
