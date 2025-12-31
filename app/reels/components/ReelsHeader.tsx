import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface ReelsHeaderProps {
  onBackPress: () => void;
  getResponsiveSpacing: (small: number, medium: number, large: number) => number;
  getResponsiveSize: (small: number, medium: number, large: number) => number;
  getTouchTargetSize: () => number;
}

export const ReelsHeader: React.FC<ReelsHeaderProps> = ({
  onBackPress,
  getResponsiveSpacing,
  getResponsiveSize,
  getTouchTargetSize,
}) => {
  const isIOS = Platform.OS === "ios";

  return (
    <View
      style={{
        position: "absolute",
        top: getResponsiveSpacing(40, 48, 56) + (isIOS ? 20 : 0),
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: getResponsiveSpacing(16, 20, 24),
        zIndex: 50,
      }}
    >
      {/* Back Arrow */}
      <TouchableOpacity
        onPress={onBackPress}
        style={{
          padding: getResponsiveSpacing(8, 10, 12),
          minWidth: getTouchTargetSize(),
          minHeight: getTouchTargetSize(),
          alignItems: "center",
          justifyContent: "center",
        }}
        activeOpacity={0.7}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <MaterialIcons
          name="arrow-back"
          size={getResponsiveSize(24, 28, 32)}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Title */}
      <Text
        style={{
          fontSize: getResponsiveSize(18, 20, 22),
          color: "#FFFFFF",
          fontWeight: "600",
          fontFamily: "Rubik-SemiBold",
          textShadowColor: "rgba(0, 0, 0, 0.5)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}
      >
        Reels
      </Text>

      {/* Close Icon */}
      <TouchableOpacity
        onPress={onBackPress}
        style={{
          padding: getResponsiveSpacing(8, 10, 12),
          minWidth: getTouchTargetSize(),
          minHeight: getTouchTargetSize(),
          alignItems: "center",
          justifyContent: "center",
        }}
        activeOpacity={0.7}
        accessibilityLabel="Close video player"
        accessibilityRole="button"
      >
        <MaterialIcons
          name="close"
          size={getResponsiveSize(24, 28, 32)}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
};

