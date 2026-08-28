import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";

export interface PlayerHeaderProps {
  onClose: () => void;
  onOptionsPress: () => void;
}

function minimizePlayer() {
  useCopyrightFreeOverlayStore.getState().minimize();
}

const hitSlop = { top: 24, bottom: 24, left: 24, right: 24 };

const iconBtn = {
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: "center" as const,
  alignItems: "center" as const,
  backgroundColor: "rgba(255, 255, 255, 0.14)",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.22)",
  elevation: 80,
  zIndex: 80,
};

export function PlayerHeader({ onClose, onOptionsPress }: PlayerHeaderProps) {
  return (
    <View
      style={{
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: UI_CONFIG.SPACING.LG,
        paddingVertical: UI_CONFIG.SPACING.SM,
      }}
    >
      <TouchableOpacity
        onPressIn={() => {
          minimizePlayer();
          onClose();
        }}
        onPress={() => {
          minimizePlayer();
          onClose();
        }}
        activeOpacity={0.7}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Minimize player"
        style={iconBtn}
      >
        <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOptionsPress}
        activeOpacity={0.7}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="More options"
        style={iconBtn}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
