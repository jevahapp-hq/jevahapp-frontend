/**
 * Presentational track + fill + knob + floating label.
 * Gestures are attached by the parent (keeps touch wiring debuggable).
 */
import React from "react";
import { Animated, Text, View } from "react-native";
import type { ProgressBarConfig } from "./types";
import { formatTime } from "./utils";

type Props = {
  config: ProgressBarConfig;
  barWidth: number;
  progressBarHeight: number;
  knobRadius: number;
  circleTop: number;
  labelTop: number;
  animatedValue: Animated.Value;
  currentProgress: number;
  durationMs: number;
  isDragging: boolean;
  isSeeking: boolean;
  onLayout: (e: any) => void;
  panHandlers: Record<string, any>;
};

export function ProgressBarTrack({
  config,
  barWidth,
  progressBarHeight,
  knobRadius,
  circleTop,
  labelTop,
  animatedValue,
  currentProgress,
  durationMs,
  isDragging,
  isSeeking,
  onLayout,
  panHandlers,
}: Props) {
  return (
    <View
      className="flex-1 relative"
      style={{ height: progressBarHeight + 16 }}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      {...panHandlers}
    >
      <View
        className="absolute rounded-full"
        style={{
          height: progressBarHeight,
          width: "100%",
          top: 8,
          backgroundColor: config.trackColor,
        }}
      />

      <Animated.View
        className="absolute rounded-full"
        style={{
          height: progressBarHeight,
          width: barWidth > 0 ? Animated.multiply(animatedValue, barWidth) : 0,
          top: 8,
          backgroundColor: config.progressColor,
        }}
      />

      {config.showFloatingLabel && (isDragging || isSeeking) ? (
        <Animated.View
          className="absolute bg-black/70 px-2 py-1 rounded"
          pointerEvents="none"
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
      ) : null}

      <Animated.View
        className="absolute rounded-full"
        pointerEvents="none"
        style={{
          width: knobRadius * 2,
          height: knobRadius * 2,
          top: circleTop,
          left:
            barWidth > 0
              ? Animated.subtract(
                  Animated.multiply(animatedValue, barWidth),
                  knobRadius
                )
              : 0,
          backgroundColor: config.knobColor,
          transform: [
            {
              scale: config.enlargeOnDrag && isDragging ? 1.1 : 1,
            },
          ],
          shadowColor: config.knobColor,
          shadowOffset: {
            width: 0,
            height: config.enlargeOnDrag && isDragging ? 3 : 2,
          },
          shadowOpacity: config.enlargeOnDrag && isDragging ? 0.5 : 0.35,
          shadowRadius: config.enlargeOnDrag && isDragging ? 7 : 5,
          elevation: config.enlargeOnDrag && isDragging ? 7 : 5,
          zIndex: 10,
        }}
      />
    </View>
  );
}
