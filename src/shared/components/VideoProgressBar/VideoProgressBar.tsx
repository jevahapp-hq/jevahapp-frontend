/**
 * VideoProgressBar — thin compatibility shim.
 * Canonical implementation: TikTokProgressBar + hooks/utils/types.
 *
 * Progress pipeline:
 *   timeUpdate → useVideoProgressTracker → TikTokProgressBar + useSeekSync
 *   seek → useVideoCardSeek → expoVideoAdapter.seekPlayerToMs
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

/**
 * Legacy prop-compatible wrapper around the modular TikTokProgressBar.
 */
export const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  progress,
  currentMs,
  durationMs,
  isMuted,
  onToggleMute,
  onSeekToPercent,
  showControls = true,
  showFloatingLabel = true,
  enlargeOnDrag = true,
  knobSize = 8,
  knobSizeDragging = 10,
  trackHeights = { normal: 4, dragging: 8 },
  seekSyncTicks = 2,
  seekMsTolerance = 300,
  minProgressEpsilon = 0.01,
  enableHaptics = false,
  verticalScrub = { enabled: true, sensitivityBase: 60, maxSlowdown: 5 },
  debug = false,
  // bottomOffset / mutePosition / style kept for API compat; TikTok bar owns layout
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
      showControls={showControls}
      config={config}
      debug={debug}
    />
  );
};

export default VideoProgressBar;
