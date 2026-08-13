/**
 * TikTok/IG-style scrubber.
 *
 * Seek pipeline (debug here first if scrub fails):
 *   RNGH Gesture.Pan (useProgressBarGestures — refs + runOnJS)
 *   → onLiveSeek / onDragEnd / onTapSeek
 *   → onSeekToPercent(parent)
 *   → useVideoCardSeek / Reels seekToPosition
 *   → expoVideoAdapter / setPositionAsync
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { DEFAULT_CONFIG } from "./defaultConfig";
import { ProgressBarTrack } from "./ProgressBarTrack";
import type { ProgressBarConfig, ProgressBarProps } from "./types";
import { useHaptics } from "./useHaptics";
import { useProgressBarGestures } from "./useProgressBarGestures";
import { useProgressBarState } from "./useProgressBarState";
import { useSeekSync } from "./useSeekSync";
import { calculateProgress, formatTime } from "./utils";

export const TikTokProgressBar: React.FC<ProgressBarProps> = ({
  progress: _progress,
  currentMs,
  durationMs,
  isMuted,
  onToggleMute,
  onSeekToPercent,
  onScrubStart,
  onScrubEnd,
  showControls = true,
  config: configOverride,
  debug = false,
  bottomOffset = 12,
  top,
  style,
}) => {
  const config: ProgressBarConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  );

  const { state, updateState } = useProgressBarState(config, debug);
  const {
    isDragging,
    isSeeking,
    dragProgress,
    targetProgress,
    stableTicks,
    barWidth,
  } = state;

  const animatedValue = useRef(new Animated.Value(0)).current;
  const lastUpdateTimeRef = useRef(0);
  const { trigger: triggerHaptic } = useHaptics(config.enableHaptics);

  const externalProgress = calculateProgress(currentMs, durationMs);
  const currentProgress = isDragging
    ? dragProgress
    : isSeeking && targetProgress !== null
      ? targetProgress
      : externalProgress;

  const handleSeekComplete = useCallback(() => {
    updateState({
      isSeeking: false,
      targetProgress: null,
      stableTicks: 0,
    });
    // onScrubEnd already fired on finger-up in applySeek; keep for abort/timeout
    onScrubEnd?.();
  }, [updateState, onScrubEnd]);

  useSeekSync(
    currentMs,
    durationMs,
    isSeeking,
    targetProgress,
    stableTicks,
    config,
    handleSeekComplete,
    (ticks) => updateState({ stableTicks: ticks }),
    debug
  );

  const applySeek = useCallback(
    (percent: number, { fromDragEnd }: { fromDragEnd: boolean }) => {
      const clamped = Math.max(0, Math.min(1, percent));
      // Always move the knob + notify parent. Parent no-ops player seek
      // until duration is known; hold UI at target until sync/timeout.
      updateState({
        isDragging: false,
        isSeeking: true,
        dragProgress: clamped,
        targetProgress: clamped,
        stableTicks: 0,
      });
      animatedValue.setValue(clamped);
      // Unlock parent scroll (Reels FlatList) as soon as finger lifts
      onScrubEnd?.();
      onSeekToPercent(clamped);
      if (fromDragEnd && config.enableHaptics) triggerHaptic("medium");
      else if (config.enableHaptics) triggerHaptic("light");
    },
    [
      animatedValue,
      config.enableHaptics,
      onScrubEnd,
      onSeekToPercent,
      triggerHaptic,
      updateState,
    ]
  );

  const gestureCallbacks = useMemo(
    () => ({
      getStartProgress: () => externalProgress,
      onDragStart: (grant: number) => {
        onScrubStart?.();
        updateState({
          isDragging: true,
          isSeeking: false,
          targetProgress: null,
          stableTicks: 0,
          dragProgress: grant,
        });
        animatedValue.setValue(grant);
        if (config.enableHaptics) triggerHaptic("light");
      },
      onDragMove: (next: number) => {
        updateState({ dragProgress: next, isDragging: true });
        animatedValue.setValue(next);
      },
      onLiveSeek: (next: number) => {
        if (!(durationMs > 0)) return;
        onSeekToPercent(Math.max(0, Math.min(1, next)));
      },
      onDragEnd: (finalProgress: number) => {
        applySeek(finalProgress, { fromDragEnd: true });
      },
      onTapSeek: (percent: number) => {
        onScrubStart?.();
        applySeek(percent, { fromDragEnd: false });
      },
    }),
    [
      applySeek,
      animatedValue,
      config.enableHaptics,
      durationMs,
      externalProgress,
      onScrubStart,
      onSeekToPercent,
      triggerHaptic,
      updateState,
    ]
  );

  const { gesture } = useProgressBarGestures(
    barWidth,
    config,
    gestureCallbacks,
    debug
  );

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    if (!isDragging && !isSeeking) {
      if (timeSinceLastUpdate > 40) {
        Animated.timing(animatedValue, {
          toValue: currentProgress,
          duration: Math.min(90, timeSinceLastUpdate),
          useNativeDriver: false,
        }).start();
        lastUpdateTimeRef.current = now;
      }
    } else {
      animatedValue.setValue(currentProgress);
      lastUpdateTimeRef.current = now;
    }
  }, [currentProgress, animatedValue, isDragging, isSeeking]);

  const handleLayout = (e: any) => {
    const width = e.nativeEvent.layout.width;
    if (width && Math.abs(width - barWidth) > 0.5) {
      updateState({ barWidth: width });
    }
  };

  const progressBarHeight =
    config.enlargeOnDrag && isDragging
      ? config.trackHeightDragging
      : config.trackHeight;
  const knobRadius =
    config.enlargeOnDrag && isDragging
      ? config.knobSizeDragging / 2
      : config.knobSize / 2;
  const circleTop = 8 + progressBarHeight / 2 - knobRadius;
  const labelTop = Math.max(0, circleTop - 24);

  if (!showControls) return null;

  const positionStyle =
    typeof top === "number" ? { top } : { bottom: bottomOffset };

  return (
    <View
      style={[
        {
          position: "absolute",
          left: 12,
          right: 12,
          zIndex: 50,
          elevation: 50,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
        },
        positionStyle,
        style,
      ]}
      // Block parent play/pause tap while interacting with the scrubber
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
    >
      <View className="flex-1 flex-row items-center">
        {config.showTimeLabels ? (
          <Text className="text-white text-xs font-rubik mr-2 min-w-[35px]">
            {durationMs > 0 ? formatTime(currentProgress * durationMs) : "0:00"}
          </Text>
        ) : null}

        <ProgressBarTrack
          config={config}
          barWidth={barWidth}
          progressBarHeight={progressBarHeight}
          knobRadius={knobRadius}
          circleTop={circleTop}
          labelTop={labelTop}
          animatedValue={animatedValue}
          currentProgress={currentProgress}
          durationMs={durationMs}
          isDragging={isDragging}
          isSeeking={isSeeking}
          onLayout={handleLayout}
          gesture={gesture}
        />

        {config.showTimeLabels ? (
          <Text className="text-white text-xs font-rubik ml-2 min-w-[35px]">
            {durationMs > 0 ? formatTime(durationMs) : "--:--"}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={onToggleMute}
        className="bg-black/50 p-2 rounded-full"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-high"}
          size={16}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
};

export default TikTokProgressBar;
