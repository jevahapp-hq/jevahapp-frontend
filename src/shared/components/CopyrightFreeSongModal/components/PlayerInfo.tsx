import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";

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
          fontFamily: "PlusJakartaSans-Bold",
          color: "#FFFFFF",
          marginBottom: 4,
          textAlign: "center",
          letterSpacing: -0.3,
          textShadowColor: "rgba(0, 0, 0, 0.6)",
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 6,
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 16,
          fontFamily: "PlusJakartaSans-Medium",
          color: "rgba(255, 255, 255, 0.78)",
          marginBottom: 14,
          textAlign: "center",
          textShadowColor: "rgba(0, 0, 0, 0.4)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
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
        }}
      >
        <TouchableOpacity
          onPress={onToggleLike}
          disabled={isTogglingLike}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 16,
            paddingVertical: 7,
            borderRadius: 20,
            backgroundColor: isLiked
              ? "rgba(255, 107, 107, 0.22)"
              : "rgba(255, 255, 255, 0.12)",
            borderWidth: 1,
            borderColor: isLiked
              ? "rgba(255, 107, 107, 0.45)"
              : "rgba(255, 255, 255, 0.2)",
          }}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={18}
            color={isLiked ? "#FF6B6B" : "#FFFFFF"}
          />
          <Text
            style={{
              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
              fontFamily: "PlusJakartaSans-SemiBold",
              color: isLiked ? "#FF6B6B" : "#FFFFFF",
            }}
          >
            {likeCount > 0 ? likeCount.toLocaleString() : "0"}
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 16,
            paddingVertical: 7,
            borderRadius: 20,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          }}
        >
          <Ionicons name="eye-outline" size={18} color="rgba(255, 255, 255, 0.9)" />
          <Text
            style={{
              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
              fontFamily: "PlusJakartaSans-SemiBold",
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
