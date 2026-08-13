/**
 * ReelsProgressBar — thin Reels-skinned wrapper over the shared TikTok scrubber.
 * One seek/gesture implementation (DRY). Prefer VideoProgressBar in new code.
 */
import React from "react";
import { VideoProgressBar } from "../../../src/shared/components/VideoProgressBar/VideoProgressBar";
import { getBottomNavHeight } from "../../utils/responsiveOptimized";

interface ReelsProgressBarProps {
  videoKey: string;
  videoDuration: number;
  videoPosition: number;
  isDragging?: boolean;
  mutedVideos: Record<string, boolean>;
  progressBarWidth?: number;
  onLayout?: (width: number) => void;
  onSeek: (videoKey: string, position: number) => void;
  onToggleMute: (key: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  getResponsiveSpacing: (small: number, medium: number, large: number) => number;
  formatTime?: (ms: number) => string;
}

export const ReelsProgressBar: React.FC<ReelsProgressBarProps> = ({
  videoKey,
  videoDuration,
  videoPosition,
  mutedVideos,
  onSeek,
  onToggleMute,
  onDragStart,
  onDragEnd,
  getResponsiveSpacing,
}) => {
  const progress = videoDuration > 0 ? videoPosition / videoDuration : 0;

  return (
    <VideoProgressBar
      progress={progress}
      currentMs={videoPosition}
      durationMs={videoDuration}
      isMuted={Boolean(mutedVideos[videoKey])}
      onToggleMute={() => onToggleMute(videoKey)}
      onSeekToPercent={(pct) =>
        onSeek(videoKey, Math.max(0, Math.min(1, pct)))
      }
      onScrubStart={onDragStart}
      onScrubEnd={onDragEnd}
      showControls
      bottomOffset={getBottomNavHeight() + getResponsiveSpacing(6, 8, 10)}
      enlargeOnDrag
      knobSize={10}
      knobSizeDragging={14}
      trackHeights={{ normal: 3, dragging: 8 }}
      seekDuringDrag
      liveSeekThrottleMs={32}
      enableHaptics
      style={{ zIndex: 200, elevation: 200 }}
    />
  );
};

export default ReelsProgressBar;
