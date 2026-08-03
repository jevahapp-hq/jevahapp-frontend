import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "../../../../src/shared/constants";

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
        paddingTop: UI_CONFIG.SPACING.SM,
        marginTop: -UI_CONFIG.SPACING.MD,
      }}
    >
      <TouchableOpacity
        onPress={onToggleMute}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.2)",
        }}
      >
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-high"}
          size={22}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOpenPlaylistView}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingVertical: UI_CONFIG.SPACING.MD,
          borderRadius: 25,
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.3)",
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="list" size={20} color="#FFFFFF" />
        <Text
          style={{
            marginLeft: 8,
            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
            fontFamily: "Rubik-SemiBold",
            color: "#FFFFFF",
          }}
        >
          Playlist
        </Text>
      </TouchableOpacity>

      {onShare ? (
        <TouchableOpacity
          onPress={onShare}
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          }}
        >
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
