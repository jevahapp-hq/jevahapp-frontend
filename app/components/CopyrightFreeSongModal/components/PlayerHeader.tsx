import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { UI_CONFIG } from "../../../../src/shared/constants";

export interface PlayerHeaderProps {
  onClose: () => void;
  onOptionsPress: () => void;
}

export function PlayerHeader({ onClose, onOptionsPress }: PlayerHeaderProps) {
  const closeTap = Gesture.Tap()
    .maxDistance(12)
    .blocksExternalGesture()
    .onEnd(() => {
      runOnJS(onClose)();
    });
  const optionsTap = Gesture.Tap()
    .maxDistance(12)
    .blocksExternalGesture()
    .onEnd(() => {
      runOnJS(onOptionsPress)();
    });

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: UI_CONFIG.SPACING.LG,
        paddingVertical: UI_CONFIG.SPACING.MD,
        zIndex: 20,
      }}
    >
      <GestureDetector gesture={closeTap}>
        <View
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
          }}
        >
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </View>
      </GestureDetector>

      <GestureDetector gesture={optionsTap}>
        <View
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
        </View>
      </GestureDetector>
    </View>
  );
}
