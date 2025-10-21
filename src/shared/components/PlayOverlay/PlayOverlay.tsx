import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "../../constants";

interface PlayOverlayProps {
  isPlaying: boolean;
  onPress: () => void;
  showOverlay?: boolean;
  size?: "small" | "medium" | "large";
  backgroundColor?: string;
  iconColor?: string;
  className?: string;
}

export const PlayOverlay: React.FC<PlayOverlayProps> = ({
  isPlaying,
  onPress,
  showOverlay = true,
  size = "medium",
  backgroundColor = "bg-white/70",
  iconColor = UI_CONFIG.COLORS.SECONDARY,
  className = "",
}) => {
  const getSizeConfig = () => {
    switch (size) {
      case "small":
        return { container: "p-2", icon: 24 };
      case "medium":
        return { container: "p-4", icon: 40 };
      case "large":
        return { container: "p-6", icon: 56 };
      default:
        return { container: "p-4", icon: 40 };
    }
  };

  const { container, icon } = getSizeConfig();

  if (!showOverlay) return null;

  return (
    <View
      className={`absolute inset-0 justify-center items-center bg-black/20 pointer-events-box-none ${className}`}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View className={`${backgroundColor} ${container} rounded-full`}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={icon}
            color={iconColor}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default PlayOverlay;
