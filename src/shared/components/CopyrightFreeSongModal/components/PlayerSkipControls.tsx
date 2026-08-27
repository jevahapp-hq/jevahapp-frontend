import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";

export interface PlayerSkipControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenPlaylistView: () => void;
  onShare?: () => void;
}

/** Footer row: mute, playlist, share (skip ±15 lives in PlayerTransport). */
export function PlayerSkipControls({
  isMuted,
  onToggleMute,
  onOpenPlaylistView,
  onShare,
}: PlayerSkipControlsProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 2,
      }}
    >
      <TouchableOpacity
        onPress={onToggleMute}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isMuted
            ? "rgba(255, 107, 107, 0.22)"
            : "rgba(255, 255, 255, 0.12)",
          borderWidth: 1,
          borderColor: isMuted
            ? "rgba(255, 107, 107, 0.45)"
            : "rgba(255, 255, 255, 0.2)",
        }}
      >
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-high"}
          size={20}
          color={isMuted ? "#FF6B6B" : "#FFFFFF"}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOpenPlaylistView}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingVertical: 10,
          borderRadius: 24,
          backgroundColor: "rgba(255, 255, 255, 0.16)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.26)",
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="library-outline" size={18} color="#5EEAD4" />
        <Text
          style={{
            marginLeft: 8,
            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
            fontFamily: "PlusJakartaSans-SemiBold",
            color: "#FFFFFF",
          }}
        >
          My Playlists
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onShare}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.12)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.2)",
          opacity: onShare ? 1 : 0.4,
        }}
        disabled={!onShare}
      >
        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
