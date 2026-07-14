/**
 * VideoProgressBar — thin compatibility shim.
 * Canonical: TikTokProgressBar + modular seek hooks.
 *
 * Seek pipeline:
 *   gestures (useProgressBarGestures — refs) → onSeekToPercent
 *   → useVideoCardSeek / Reels seek → expoVideoAdapter / setPositionAsync
 */
import React from "react";
import { TikTokProgressBar } from "./TikTokProgressBar";
import type { ProgressBarConfig } from "./types";

export interface VideoProgressBarProps {
  progress: number;
  currentMs: number;
  durationMs: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onSeekToPercent: (percent: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  showControls?: boolean;
  bottomOffset?: number;
  showFloatingLabel?: boolean;
  enlargeOnDrag?: boolean;
  knobSize?: number;
  knobSizeDragging?: number;
  trackHeights?: { normal: number; dragging: number };
  seekSyncTicks?: number;
  seekMsTolerance?: number;
  minProgressEpsilon?: number;
  seekDuringDrag?: boolean;
  liveSeekThrottleMs?: number;
  enableHaptics?: boolean;
  verticalScrub?: {
    enabled?: boolean;
    sensitivityBase?: number;
    maxSlowdown?: number;
  };
  style?: any;
  mutePosition?: "left" | "right";
  debug?: boolean;
}

export const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  progress,
  currentMs,
  durationMs,
  isMuted,
  onToggleMute,
  onSeekToPercent,
  onScrubStart,
  onScrubEnd,
  showControls = true,
  showFloatingLabel = true,
  enlargeOnDrag = true,
  knobSize = 8,
  knobSizeDragging = 12,
  trackHeights = { normal: 3, dragging: 8 },
  seekSyncTicks = 2,
  seekMsTolerance = 300,
  minProgressEpsilon = 0.01,
  seekDuringDrag = true,
  liveSeekThrottleMs = 48,
  enableHaptics = false,
  verticalScrub = { enabled: true, sensitivityBase: 60, maxSlowdown: 5 },
  debug = false,
  bottomOffset: _bottomOffset,
  mutePosition: _mutePosition,
  style: _style,
}) => {
  const config: Partial<ProgressBarConfig> = {
    showFloatingLabel,
    enlargeOnDrag,
    knobSize,
    knobSizeDragging,
    trackHeight: trackHeights.normal,
    trackHeightDragging: trackHeights.dragging,
    seekSyncTicks,
    seekMsTolerance,
    minProgressEpsilon,
    seekDuringDrag,
    liveSeekThrottleMs,
    enableHaptics,
    verticalScrub: {
      enabled: verticalScrub.enabled ?? true,
      sensitivityBase: verticalScrub.sensitivityBase ?? 60,
      maxSlowdown: verticalScrub.maxSlowdown ?? 5,
    },
  };

  return (
    <TikTokProgressBar
      progress={progress}
      currentMs={currentMs}
      durationMs={durationMs}
      isMuted={isMuted}
      onToggleMute={onToggleMute}
      onSeekToPercent={onSeekToPercent}
      onScrubStart={onScrubStart}
      onScrubEnd={onScrubEnd}
      showControls={showControls}
      config={config}
      debug={debug}
    />
  );
};

export default VideoProgressBar;
