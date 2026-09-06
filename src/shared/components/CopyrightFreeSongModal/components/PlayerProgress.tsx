import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";

export interface PlayerProgressProps {
  displayProgress: number;
  displayPositionMs: number;
  durationMs: number;
  formatTime: (ms: number) => string;
  progressBarRef: React.RefObject<View | null>;
  panHandlers: any;
  onBarLayout?: (e: { nativeEvent: { layout: { width: number } } }) => void;
}

export function PlayerProgress({
  displayProgress,
  displayPositionMs,
  durationMs,
  formatTime,
  progressBarRef,
  panHandlers,
  onBarLayout,
}: PlayerProgressProps) {
  const seekEnabled = durationMs > 0;
  const pct = Math.max(0, Math.min(1, displayProgress));

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 10,
          paddingHorizontal: 2,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontFamily: "PlusJakartaSans-SemiBold",
            color: "rgba(255, 255, 255, 0.85)",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatTime(displayPositionMs)}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: "PlusJakartaSans-SemiBold",
            color: "rgba(255, 255, 255, 0.7)",
            fontVariant: ["tabular-nums"],
          }}
        >
          {seekEnabled ? formatTime(durationMs) : "--:--"}
        </Text>
      </View>

      <View
        ref={progressBarRef}
        onLayout={onBarLayout}
        collapsable={false}
        style={{
          height: 30,
          justifyContent: "center",
          marginBottom: UI_CONFIG.SPACING.LG,
          opacity: seekEnabled ? 1 : 0.45,
        }}
        pointerEvents={seekEnabled ? "auto" : "none"}
        {...(seekEnabled ? panHandlers : {})}
      >
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: "rgba(255, 255, 255, 0.18)",
            overflow: "visible",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255, 255, 255, 0.18)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${pct * 100}%`,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#256E63", "#5EEAD4", "#FEA74E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          </View>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: `${pct * 100}%`,
              marginLeft: -10,
              width: 20,
              height: 20,
              marginTop: -7,
              borderRadius: 10,
              backgroundColor: "#FFFFFF",
              shadowColor: "#5EEAD4",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 8,
              elevation: 10,
              borderWidth: 2,
              borderColor: "#256E63",
            }}
          />
        </View>
      </View>
    </>
  );
}
