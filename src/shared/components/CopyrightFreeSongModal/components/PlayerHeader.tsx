import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";

export interface PlayerHeaderProps {
  onClose: () => void;
  onOptionsPress: () => void;
}

const iconBtn = {
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center" as const,
  alignItems: "center" as const,
  backgroundColor: "rgba(255,255,255,0.08)",
};

export function PlayerHeader({ onClose, onOptionsPress }: PlayerHeaderProps) {
  return (
    <View
      collapsable={false}
      pointerEvents="box-none"
      style={{
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: UI_CONFIG.SPACING.LG,
        height: 52,
        zIndex: 30,
      }}
    >
      <View
        collapsable={false}
        accessibilityRole="button"
        accessibilityLabel="Close player"
        onStartShouldSetResponder={() => true}
        onResponderGrant={onClose}
        style={iconBtn}
      >
        <Ionicons name="close" size={22} color="#FFFFFF" pointerEvents="none" />
      </View>

      <View
        pointerEvents="none"
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.35)",
          }}
        />
      </View>

      <View
        collapsable={false}
        accessibilityRole="button"
        accessibilityLabel="More options"
        onStartShouldSetResponder={() => true}
        onResponderGrant={onOptionsPress}
        style={iconBtn}
      >
        <Ionicons name="list" size={20} color="#FFFFFF" pointerEvents="none" />
      </View>
    </View>
  );
}
