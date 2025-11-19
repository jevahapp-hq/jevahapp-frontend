/**
 * Custom hooks for progress bar state management and gesture handling
 * Separated for easy debugging and testing
 */

import { useEffect, useRef, useState } from 'react';
import { PanResponder } from 'react-native';
import type { ProgressBarConfig, ProgressBarState, GestureHandlers } from './types';
import {
  calculateProgress,
  calculateSeekEpsilon,
  isProgressCloseEnough,
  calculateProgressFromTouch,
  debugLog,
  clamp,
} from './utils';

export const DEFAULT_CONFIG: ProgressBarConfig = {
  trackHeight: 4,
  trackHeightDragging: 8,
  knobSize: 20,
  knobSizeDragging: 24,
  trackColor: 'rgba(255, 255, 255, 0.3)',
  progressColor: '#FEA74E',
  knobColor: '#FEA74E',
  enableHaptics: false,
  enlargeOnDrag: true,
  showFloatingLabel: true,
  showTimeLabels: true,
  seekSyncTicks: 2,
  seekMsTolerance: 300,
  minProgressEpsilon: 0.01,
  verticalScrub: {
    enabled: true,
    sensitivityBase: 60,
    maxSlowdown: 5,
  },
};

/**
 * Hook for managing progress bar state
 */
export const useProgressBarState = (config: ProgressBarConfig, debug: boolean = false) => {
  const [state, setState] = useState<ProgressBarState>({
    isDragging: false,
    isSeeking: false,
    dragProgress: 0,
    targetProgress: null,
    stableTicks: 0,
    barWidth: 0,
  });

  const updateState = (updates: Partial<ProgressBarState>) => {
    setState((prev) => ({ ...prev, ...updates }));
    debugLog('State updated', updates, debug);
  };

  return { state, updateState };
};

/**
 * Hook for managing seek synchronization
 * Ensures the progress bar stays at target position until video catches up
 */
export const useSeekSync = (
  currentMs: number,
  durationMs: number,
  isSeeking: boolean,
  targetProgress: number | null,
  stableTicks: number,
  config: ProgressBarConfig,
  onSeekComplete: () => void,
  onStableTickUpdate: (ticks: number) => void,
  debug: boolean = false
) => {
  useEffect(() => {
    if (!isSeeking || targetProgress === null) {
      if (stableTicks > 0) {
        onStableTickUpdate(0);
      }
      return;
    }

    const externalProgress = calculateProgress(currentMs, durationMs);
    const epsilon = calculateSeekEpsilon(
      durationMs,
      config.seekMsTolerance,
      config.minProgressEpsilon
    );
    const closeEnough = isProgressCloseEnough(externalProgress, targetProgress, epsilon);

    debugLog('Seek sync check', {
      externalProgress,
      targetProgress,
      epsilon,
      closeEnough,
      stableTicks,
    }, debug);

    if (closeEnough) {
      const newStableTicks = stableTicks + 1;
      onStableTickUpdate(newStableTicks);
      if (newStableTicks >= config.seekSyncTicks) {
        debugLog('Seek completed', { targetProgress, externalProgress }, debug);
        onSeekComplete();
      }
    } else {
      if (stableTicks > 0) {
        debugLog('Seek not close enough, resetting ticks', {
          diff: Math.abs(externalProgress - targetProgress),
          epsilon,
        }, debug);
        onStableTickUpdate(0);
      }
    }
  }, [currentMs, durationMs, isSeeking, targetProgress, stableTicks, config, onSeekComplete, onStableTickUpdate, debug]);
};

/**
 * Hook for creating gesture handlers (TikTok-style pan responder)
 */
export const useProgressBarGestures = (
  barWidth: number,
  startProgress: number,
  config: ProgressBarConfig,
  onSeek: (percent: number) => void,
  onDragStart: () => void,
  onDragEnd: () => void,
  updateDragProgress: (progress: number) => void,
  updateIsDragging: (isDragging: boolean) => void,
  debug: boolean = false
): GestureHandlers => {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal movement
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: (evt) => {
        debugLog('Drag started', { locationX: evt.nativeEvent.locationX, barWidth }, debug);
        onDragStart();
        
        // Calculate initial progress from touch position
        const initialProgress = barWidth > 0
          ? clamp(evt.nativeEvent.locationX / barWidth, 0, 1)
          : startProgress;
        
        updateDragProgress(initialProgress);
        updateIsDragging(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        const newProgress = calculateProgressFromTouch(
          evt.nativeEvent.locationX,
          barWidth,
          startProgress,
          gestureState.dx,
          gestureState.dy,
          config.verticalScrub
        );
        
        debugLog('Drag move', {
          dx: gestureState.dx,
          dy: gestureState.dy,
          newProgress,
        }, debug);
        
        updateDragProgress(newProgress);
      },
      onPanResponderRelease: () => {
        debugLog('Drag ended', {}, debug);
        updateIsDragging(false);
        onDragEnd();
      },
      onPanResponderTerminate: () => {
        debugLog('Drag cancelled', {}, debug);
        updateIsDragging(false);
        onDragEnd();
      },
    })
  ).current;

  const handlePress = (event: any) => {
    if (barWidth <= 0) return;
    
    const { locationX } = event.nativeEvent;
    const percent = clamp(locationX / barWidth, 0, 1);
    
    debugLog('Progress bar pressed', { locationX, percent, barWidth }, debug);
    onSeek(percent);
  };

  return panResponder.panHandlers;
};

/**
 * Hook for haptic feedback (optional, only if expo-haptics is available)
 */
export const useHaptics = (enabled: boolean) => {
  const hapticsRef = useRef<any>(null);

  useEffect(() => {
    if (enabled) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        hapticsRef.current = require('expo-haptics');
      } catch {
        // Haptics not available, silently fail
      }
    }
  }, [enabled]);

  const trigger = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticsRef.current) return;
    
    try {
      const ImpactFeedbackStyle = hapticsRef.current.ImpactFeedbackStyle;
      const styleMap = {
        light: ImpactFeedbackStyle.Light,
        medium: ImpactFeedbackStyle.Medium,
        heavy: ImpactFeedbackStyle.Heavy,
      };
      hapticsRef.current.impactAsync(styleMap[style]).catch(() => {});
    } catch {
      // Silently fail if haptics not available
    }
  };

  return { trigger };
};

