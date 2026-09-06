import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";

export interface PlayerHeaderProps {
  onClose: () => void;
  onOptionsPress: () => void;
}

const iconBtn = {
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: "center" as const,
  alignItems: "center" as const,
  backgroundColor: "rgba(255, 255, 255, 0.14)",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.22)",
  elevation: 20,
  zIndex: 20,
};

function minimizeNow() {
  useCopyrightFreeOverlayStore.getState().minimize();
}

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
        paddingVertical: UI_CONFIG.SPACING.SM,
        height: 56,
        zIndex: 30,
        elevation: 24,
      }}
    >
      <View
        collapsable={false}
        accessibilityRole="button"
        accessibilityLabel="Minimize player"
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => {
          minimizeNow();
          onClose();
        }}
        style={iconBtn}
      >
        <Ionicons name="chevron-down" size={24} color="#FFFFFF" pointerEvents="none" />
      </View>

      <View
        pointerEvents="none"
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 38,
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(255, 255, 255, 0.4)",
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
        <Ionicons
          name="ellipsis-horizontal"
          size={22}
          color="#FFFFFF"
          pointerEvents="none"
        />
      </View>
    </View>
  );
}
