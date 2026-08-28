/**
 * Presentational track + fill + knob + floating label.
 * GestureDetector (RNGH) owns scrub so Reels FlatList cannot steal it.
 */
import React from "react";
import { Animated, Text, View } from "react-native";
import { GestureDetector, type GestureType } from "react-native-gesture-handler";
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
  gesture: GestureType;
};

export function ProgressBarTrack({
  config,
  barWidth,
  progressBarHeight,
  knobRadius,
  animatedValue,
  currentProgress,
  durationMs,
  isDragging,
  isSeeking,
  onLayout,
  gesture,
}: Props) {
  // Tall hit target so scrub wins over Reels vertical FlatList
  const hitHeight = Math.max(44, progressBarHeight + 28);
  const trackTop = (hitHeight - progressBarHeight) / 2;

  return (
    <GestureDetector gesture={gesture}>
      <View
        className="flex-1 relative"
        style={{ height: hitHeight, justifyContent: "center" }}
        onLayout={onLayout}
        collapsable={false}
      >
        <View
          className="absolute rounded-full"
          pointerEvents="none"
          style={{
            height: progressBarHeight,
            width: "100%",
            top: trackTop,
            backgroundColor: config.trackColor,
          }}
        />

        <Animated.View
          className="absolute rounded-full"
          pointerEvents="none"
          style={{
            height: progressBarHeight,
            width: barWidth > 0 ? Animated.multiply(animatedValue, barWidth) : 0,
            top: trackTop,
            backgroundColor: config.progressColor,
          }}
        />

        {config.showFloatingLabel &&
        durationMs > 0 &&
        (isDragging || isSeeking) ? (
          <Animated.View
            className="absolute bg-black/70 px-2 py-1 rounded"
            pointerEvents="none"
            style={{
              top: Math.max(0, trackTop - 24),
              left:
                barWidth > 0
                  ? Animated.subtract(
                      Animated.multiply(animatedValue, barWidth),
                      20
                    )
                  : 0,
            }}
          >
            <Text className="text-white text-[10px] font-jakarta">
              {formatTime(currentProgress * durationMs)}
            </Text>
          </Animated.View>
        ) : null}

        {knobRadius > 0.5 ? (
        <Animated.View
          className="absolute rounded-full"
          pointerEvents="none"
          style={{
            width: knobRadius * 2,
            height: knobRadius * 2,
            top: hitHeight / 2 - knobRadius,
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
                scale: config.enlargeOnDrag && isDragging ? 1.15 : 1,
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
        ) : null}
      </View>
    </GestureDetector>
  );
}
