import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { UI_CONFIG } from "@/shared/constants";

export interface PlayerHeaderProps {
  onClose: () => void;
  onOptionsPress: () => void;
  dismissGesture?: any;
}

export function PlayerHeader({
  onClose,
  onOptionsPress,
  dismissGesture,
}: PlayerHeaderProps) {
  const handle = (
    <View
      style={{
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 10,
      }}
    >
      <View
        style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: "rgba(255, 255, 255, 0.35)",
        }}
      />
    </View>
  );

  return (
    <View style={{ width: "100%", zIndex: 20 }}>
      {dismissGesture ? (
        <GestureDetector gesture={dismissGesture}>{handle}</GestureDetector>
      ) : (
        handle
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingVertical: UI_CONFIG.SPACING.SM,
        }}
      >
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.14)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.22)",
          }}
        >
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOptionsPress}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.14)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.22)",
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
