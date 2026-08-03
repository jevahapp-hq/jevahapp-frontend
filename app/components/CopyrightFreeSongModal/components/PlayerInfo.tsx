import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "../../../../src/shared/constants";

export interface PlayerInfoProps {
  title: string;
  artist: string;
  isLiked: boolean;
  likeCount: number;
  viewCount: number;
  isTogglingLike: boolean;
  onToggleLike: () => void;
}

export function PlayerInfo({
  title,
  artist,
  isLiked,
  likeCount,
  viewCount,
  isTogglingLike,
  onToggleLike,
}: PlayerInfoProps) {
  return (
    <View
      style={{
        alignItems: "center",
        marginBottom: UI_CONFIG.SPACING.MD,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontFamily: "Rubik-SemiBold",
          color: "#FFFFFF",
          marginBottom: 6,
          textAlign: "center",
          textShadowColor: "rgba(0, 0, 0, 0.5)",
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4,
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 16,
          fontFamily: "Rubik",
          color: "rgba(255, 255, 255, 0.8)",
          marginBottom: 12,
          textAlign: "center",
          textShadowColor: "rgba(0, 0, 0, 0.3)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }}
        numberOfLines={1}
      >
        {artist}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: UI_CONFIG.SPACING.MD,
          marginTop: UI_CONFIG.SPACING.SM,
        }}
      >
        <TouchableOpacity
          onPress={onToggleLike}
          disabled={isTogglingLike}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: UI_CONFIG.SPACING.LG,
            paddingVertical: UI_CONFIG.SPACING.SM,
            borderRadius: 20,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          }}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={18}
            color={isLiked ? "#FF6B6B" : "rgba(255, 255, 255, 0.9)"}
          />
          <Text
            style={{
              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
              fontFamily: "Rubik-SemiBold",
              color: "#FFFFFF",
            }}
          >
            {likeCount > 0 ? likeCount.toLocaleString() : "0"}
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: UI_CONFIG.SPACING.LG,
            paddingVertical: UI_CONFIG.SPACING.SM,
            borderRadius: 20,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          }}
        >
          <Ionicons name="eye-outline" size={18} color="rgba(255, 255, 255, 0.9)" />
          <Text
            style={{
              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
              fontFamily: "Rubik-SemiBold",
              color: "#FFFFFF",
            }}
          >
            {viewCount > 0 ? viewCount.toLocaleString() : "0"}
          </Text>
        </View>
      </View>
    </View>
  );
}
