import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    PanResponder,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface VideoProgressBarProps {
  progress: number; // 0-1
  currentMs: number;
  durationMs: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onSeekToPercent: (percent: number) => void;
  showControls?: boolean;
  /**
   * Vertical offset from the bottom of the parent container (in pixels).
   * - Useful when you want the bar/timer/mute row to sit a bit above the bottom edge
   *   to be visually closer to other overlays (e.g. title text).
   * - Defaults to 0 (flush with bottom).
   */
  bottomOffset?: number;
  // UI config (optional)
  showFloatingLabel?: boolean; // default true
  enlargeOnDrag?: boolean; // default true
  knobSize?: number; // default 20
  knobSizeDragging?: number; // default 24
  trackHeights?: { normal: number; dragging: number }; // default {4,8}
  // Stability config (optional)
  seekSyncTicks?: number; // number of consecutive updates near target to finish seeking (default 2)
  seekMsTolerance?: number; // milliseconds tolerance used to derive epsilon (default 300)
  minProgressEpsilon?: number; // minimum epsilon as a fraction (default 0.01)
  // Interaction enhancements
  enableHaptics?: boolean; // default false
  verticalScrub?: {
    enabled?: boolean;
    sensitivityBase?: number;
    maxSlowdown?: number;
  }; // default enabled
}

export const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  progress,
  currentMs,
  durationMs,
  isMuted,
  onToggleMute,
  onSeekToPercent,
  showControls = true,
  bottomOffset = 0,
  showFloatingLabel = true,
  enlargeOnDrag = true,
  knobSize = 20,
  knobSizeDragging = 24,
  trackHeights = { normal: 4, dragging: 8 },
  seekSyncTicks = 2,
  seekMsTolerance = 300,
  minProgressEpsilon = 0.01,
  enableHaptics = false,
  verticalScrub = { enabled: true, sensitivityBase: 60, maxSlowdown: 5 },
}) => {
  // Optional runtime import for haptics (no crash if not installed)
  let Haptics: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Haptics = require("expo-haptics");
  } catch {}
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressBarRef = useRef<View>(null);
  const animatedValue = useRef(new Animated.Value(progress)).current;
  const [isSeeking, setIsSeeking] = useState(false);
  const targetProgressRef = useRef<number | null>(null);
  const [barWidth, setBarWidth] = useState(0);
  const stableTicksRef = useRef(0);
  const dragStartPercentRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);

  const formatTime = (ms: number) => {
    // Validate and clamp input to prevent invalid displays
    if (!Number.isFinite(ms) || ms < 0 || isNaN(ms)) {
      return "0:00";
    }
    
    // Clamp to reasonable maximum (24 hours)
    const clampedMs = Math.min(ms, 24 * 60 * 60 * 1000);
    
    const totalSeconds = Math.floor(clampedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleProgressBarPress = (event: any) => {
    if (!showControls) return;

    const { locationX } = event.nativeEvent;
    progressBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
      const percent = Math.max(0, Math.min(1, locationX / width));
      // Immediate visual feedback to tapped position
      setDragProgress(percent);
      animatedValue.setValue(percent);
      // Keep indicator at tapped location until external progress catches up
      setIsSeeking(true);
      targetProgressRef.current = percent;
      onSeekToPercent(percent);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to touches on the progress bar area
      return true;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Respond to moves when dragging
      return isDragging;
    },
    onPanResponderGrant: (evt, gestureState) => {
      setIsDragging(true);
      progressBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
        const percent = Math.max(
          0,
          Math.min(1, evt.nativeEvent.locationX / width)
        );
        setDragProgress(percent);
        animatedValue.setValue(percent);
        dragStartPercentRef.current = percent;
        // Reset seeking state when starting new drag
        setIsSeeking(false);
        targetProgressRef.current = null;
        stableTicksRef.current = 0;
      });
      if (enableHaptics && Haptics?.impactAsync) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    onPanResponderMove: (evt, gestureState) => {
      if (isDragging) {
        progressBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
          const basePercent = dragStartPercentRef.current;
          const dx = gestureState.dx || 0;
          const dy = gestureState.dy || 0;
          const slowdownEnabled = verticalScrub?.enabled !== false;
          const sensitivityBase = verticalScrub?.sensitivityBase ?? 60; // pixels
          const maxSlowdown = verticalScrub?.maxSlowdown ?? 5; // 1..5x
          const slowFactor = slowdownEnabled
            ? Math.min(maxSlowdown, 1 + Math.abs(dy) / sensitivityBase)
            : 1;
          const deltaPercent = width > 0 ? dx / width / slowFactor : 0;
          const nextPercent = Math.max(
            0,
            Math.min(1, basePercent + deltaPercent)
          );
          setDragProgress(nextPercent);
          animatedValue.setValue(nextPercent);
        });
      }
    },
    onPanResponderRelease: () => {
      setIsDragging(false);
      // Keep indicator at released location until external progress catches up
      setIsSeeking(true);
      targetProgressRef.current = dragProgress;
      onSeekToPercent(dragProgress);
      if (enableHaptics && Haptics?.impactAsync) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    },
    onPanResponderTerminate: () => {
      setIsDragging(false);
    },
  });

  // Drive the animated value from the effective progress source-of-truth
  // (drag position when dragging, target when seeking, live progress otherwise)
  // This ensures the orange circle always follows the intended position.

  // While seeking, hold the indicator at target until the external progress stabilizes near it
  useEffect(() => {
    if (!isSeeking || targetProgressRef.current == null) {
      stableTicksRef.current = 0;
      return;
    }
    const target = targetProgressRef.current;
    const externalProgress =
      durationMs > 0
        ? Math.max(0, Math.min(1, currentMs / durationMs))
        : progress;
    const epsilon =
      durationMs > 0
        ? Math.max(minProgressEpsilon, seekMsTolerance / durationMs)
        : Math.max(minProgressEpsilon, 0.02); // within ms tolerance or min epsilon
    const closeEnough = Math.abs(externalProgress - target) <= epsilon;

    if (closeEnough) {
      stableTicksRef.current += 1;
    } else {
      stableTicksRef.current = 0;
    }

    if (stableTicksRef.current >= seekSyncTicks) {
      setIsSeeking(false);
      targetProgressRef.current = null;
      animatedValue.setValue(externalProgress);
    }
  }, [
    currentMs,
    durationMs,
    progress,
    isSeeking,
    animatedValue,
    seekSyncTicks,
    seekMsTolerance,
    minProgressEpsilon,
  ]);

  // Derive a reliable external progress from currentMs/durationMs when available
  const externalProgress =
    durationMs > 0
      ? Math.max(0, Math.min(1, currentMs / durationMs))
      : progress;

  // Use the most recent progress value for better responsiveness
  const currentProgress = isDragging
    ? dragProgress
    : isSeeking && targetProgressRef.current != null
    ? targetProgressRef.current
    : externalProgress;
  const progressBarHeight = enlargeOnDrag
    ? isDragging
      ? trackHeights.dragging
      : trackHeights.normal
    : trackHeights.normal;

  // Ensure the indicator position always matches the effective progress
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    // Use smooth animation for non-dragging updates to make progress bar responsive
    if (!isDragging && !isSeeking) {
      // Throttle updates to prevent too frequent animations during playback
      if (timeSinceLastUpdate > 50) {
        // Update at most every 50ms
        Animated.timing(animatedValue, {
          toValue: currentProgress,
          duration: Math.min(100, timeSinceLastUpdate), // Adaptive duration
          useNativeDriver: false,
        }).start();
        lastUpdateTimeRef.current = now;
      }
    } else {
      // Immediate updates during drag/seek
      animatedValue.setValue(currentProgress);
      lastUpdateTimeRef.current = now;
    }
  }, [currentProgress, animatedValue, isDragging, isSeeking]);

  // Precompute circle geometry for clean centering over the track
  const circleRadius =
    (enlargeOnDrag ? (isDragging ? knobSizeDragging : knobSize) : knobSize) / 2;
  const circleTop = 8 + progressBarHeight / 2 - circleRadius; // center on track (track top = 8)
  const labelTop = Math.max(0, circleTop - 24); // place label above the knob

  if (!showControls) return null;

  return (
    <View
      className="absolute left-0 right-0 flex-row items-center justify-center px-4 pb-4 pt-2"
      style={{ bottom: bottomOffset }}
    >
      {/* Progress Bar - Full width container */}
      <View className="flex-1 flex-row items-center max-w-full">
        <Text className="text-white text-xs font-rubik mr-3 min-w-[40px] text-right">
          {formatTime(currentProgress * durationMs)}
        </Text>

        <View
          ref={progressBarRef}
          className="flex-1 relative"
          style={{ height: progressBarHeight + 16 }} // Extra height for touch area
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w && Math.abs(w - barWidth) > 0.5) {
              setBarWidth(w);
            }
          }}
          {...panResponder.panHandlers}
        >
          {/* Background Track */}
          <View
            className="absolute bg-white/30 rounded-full"
            style={{
              height: progressBarHeight,
              width: "100%",
              top: 8, // Center vertically in touch area
            }}
          />

          {/* Progress Fill - Orange (ends at the indicator position) */}
          <Animated.View
            className="absolute bg-[#FEA74E] rounded-full"
            style={{
              height: progressBarHeight,
              width: barWidth ? Animated.multiply(animatedValue, barWidth) : 0,
              top: 8,
            }}
          />

          {/* Floating time label while dragging/seeking */}
          {showFloatingLabel && (isDragging || isSeeking) && (
            <Animated.View
              className="absolute bg-black/70 px-2 py-1 rounded"
              style={{
                top: labelTop,
                left:
                  barWidth > 0
                    ? Animated.subtract(
                        Animated.multiply(animatedValue, barWidth),
                        20
                      )
                    : 0,
              }}
            >
              <Text className="text-white text-[10px] font-rubik">
                {formatTime(currentProgress * durationMs)}
              </Text>
            </Animated.View>
          )}

          {/* Draggable Orange Indicator - Main Control */}
          <Animated.View
            className="absolute bg-[#FEA74E] rounded-full"
            style={{
              width: circleRadius * 2,
              height: circleRadius * 2,
              top: circleTop,
              left:
                barWidth > 0
                  ? Animated.subtract(
                      Animated.multiply(animatedValue, barWidth),
                      circleRadius
                    )
                  : 0,
              transform: [
                {
                  scale: enlargeOnDrag && isDragging ? 1.1 : 1,
                },
              ],
              shadowColor: "#FEA74E",
              shadowOffset: {
                width: 0,
                height: enlargeOnDrag && isDragging ? 3 : 2,
              },
              shadowOpacity: enlargeOnDrag && isDragging ? 0.5 : 0.35,
              shadowRadius: enlargeOnDrag && isDragging ? 7 : 5,
              elevation: enlargeOnDrag && isDragging ? 7 : 5,
              zIndex: 10, // Ensure it's on top
            }}
          />
        </View>

        <Text className="text-white text-xs font-rubik ml-3 min-w-[40px]">
          {formatTime(durationMs)}
        </Text>
      </View>

      {/* Mute Button - positioned on the right with proper spacing */}
      <TouchableOpacity
        onPress={onToggleMute}
        className="bg-black/60 p-2.5 rounded-full ml-3"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-high"}
          size={18}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
};

export default VideoProgressBar;
