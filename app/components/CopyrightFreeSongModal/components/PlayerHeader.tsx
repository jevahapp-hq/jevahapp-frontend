import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "../../../../src/shared/constants";

export interface PlayerHeaderProps {
  onClose: () => void;
  onOptionsPress: () => void;
}

export function PlayerHeader({ onClose, onOptionsPress }: PlayerHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: UI_CONFIG.SPACING.LG,
        paddingVertical: UI_CONFIG.SPACING.MD,
        zIndex: 10,
      }}
    >
      <TouchableOpacity
        onPress={onClose}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOptionsPress}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
