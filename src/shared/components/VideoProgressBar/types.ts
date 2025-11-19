/**
 * Types and interfaces for the modular TikTok-style video progress bar
 * This file centralizes all type definitions for easy debugging and maintenance
 */

export interface ProgressBarConfig {
  // Visual configuration
  trackHeight: number;
  trackHeightDragging: number;
  knobSize: number;
  knobSizeDragging: number;
  trackColor: string;
  progressColor: string;
  knobColor: string;
  
  // Behavior configuration
  enableHaptics: boolean;
  enlargeOnDrag: boolean;
  showFloatingLabel: boolean;
  showTimeLabels: boolean;
  
  // Seek configuration
  seekSyncTicks: number; // Number of consecutive stable updates to finish seeking
  seekMsTolerance: number; // Milliseconds tolerance for seek completion
  minProgressEpsilon: number; // Minimum progress difference to consider stable
  
  // Vertical scrub configuration (TikTok-style)
  verticalScrub: {
    enabled: boolean;
    sensitivityBase: number; // Pixels for base sensitivity
    maxSlowdown: number; // Maximum slowdown factor (1-5x)
  };
}

export interface ProgressBarProps {
  // Core data
  progress: number; // 0-1
  currentMs: number;
  durationMs: number;
  
  // Controls
  isMuted: boolean;
  onToggleMute: () => void;
  onSeekToPercent: (percent: number) => void;
  
  // Optional overrides
  showControls?: boolean;
  config?: Partial<ProgressBarConfig>;
  
  // Debug mode
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

export interface GestureHandlers {
  onPress: (event: any) => void;
  onDragStart: (event: any) => void;
  onDragMove: (event: any) => void;
  onDragEnd: () => void;
  onDragCancel: () => void;
}


