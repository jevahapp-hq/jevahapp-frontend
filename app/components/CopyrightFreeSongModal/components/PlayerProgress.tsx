import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";
import { UI_CONFIG } from "../../../../src/shared/constants";

export interface PlayerProgressProps {
  displayProgress: number;
  displayPositionMs: number;
  durationMs: number;
  formatTime: (ms: number) => string;
  progressBarRef: React.RefObject<View | null>;
  panHandlers: any;
}

export function PlayerProgress({
  displayProgress,
  displayPositionMs,
  durationMs,
  formatTime,
  progressBarRef,
  panHandlers,
}: PlayerProgressProps) {
  const seekEnabled = durationMs > 0;

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Rubik-Medium",
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          {formatTime(displayPositionMs)}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Rubik-Medium",
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          {seekEnabled ? formatTime(durationMs) : "--:--"}
        </Text>
      </View>

      <View
        ref={progressBarRef}
        style={{
          height: 24,
          justifyContent: "center",
          marginBottom: UI_CONFIG.SPACING.XL,
          opacity: seekEnabled ? 1 : 0.45,
        }}
        pointerEvents={seekEnabled ? "auto" : "none"}
        {...(seekEnabled ? panHandlers : {})}
      >
        <View
          style={{
            height: 5,
            borderRadius: 999,
            backgroundColor: "rgba(255, 255, 255, 0.25)",
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={["#FEA74E", "#FF8C42"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: "100%",
              borderRadius: 999,
              width: `${displayProgress * 100}%`,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: `${displayProgress * 100}%`,
            transform: [{ translateX: -12 }],
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "#FFFFFF",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
              elevation: 8,
            }}
          />
        </View>
      </View>
    </>
  );
}
