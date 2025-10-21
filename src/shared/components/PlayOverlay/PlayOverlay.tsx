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
  disabled?: boolean;
  immediateFeedback?: boolean;
}

export const PlayOverlay: React.FC<PlayOverlayProps> = ({
  isPlaying,
  onPress,
  showOverlay = true,
  size = "medium",
  backgroundColor = "bg-white/70",
  iconColor = UI_CONFIG.COLORS.SECONDARY,
  className = "",
  disabled = false,
  immediateFeedback = true,
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

  const handlePress = () => {
    if (disabled) return;
    if (immediateFeedback) {
      // Immediate visual feedback
      onPress();
    } else {
      onPress();
    }
  };

  return (
    <View
      className={`absolute inset-0 justify-center items-center bg-black/20 pointer-events-box-none ${className}`}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={immediateFeedback ? 0.7 : 0.9}
        disabled={disabled}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        style={{
          transform: [{ scale: disabled ? 0.95 : 1 }],
          opacity: disabled ? 0.6 : 1,
        }}
      >
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
