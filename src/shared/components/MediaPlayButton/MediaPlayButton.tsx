import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface MediaPlayButtonProps {
  isPlaying: boolean;
  onPress: () => void;
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  backgroundColor?: string;
  iconColor?: string;
  showOverlay?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  small: { container: 8, icon: 24, hitSlop: 12 },
  medium: { container: 16, icon: 40, hitSlop: 20 },
  large: { container: 24, icon: 56, hitSlop: 24 },
};

export const MediaPlayButton: React.FC<MediaPlayButtonProps> = ({
  isPlaying,
  onPress,
  size = "medium",
  disabled = false,
  backgroundColor = "rgba(255, 255, 255, 0.7)",
  iconColor = "#FEA74E",
  showOverlay = true,
  className = "",
}) => {
  if (!showOverlay) return null;

  const config = SIZE_CONFIG[size];

  const handlePress = (e: any) => {
    // Stop event propagation to prevent parent touch handlers
    e?.stopPropagation?.();
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          // Dim the underlying video slightly while the overlay is visible
          backgroundColor: isPlaying
            ? "rgba(0, 0, 0, 0.35)"
            : "transparent",
        },
        { pointerEvents: "box-none" as any },
        className ? { className } : {},
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={disabled}
        hitSlop={{
          top: config.hitSlop,
          bottom: config.hitSlop,
          left: config.hitSlop,
          right: config.hitSlop,
        }}
        style={[
          styles.button,
          {
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor,
              padding: config.container,
              borderRadius: 999,
            },
          ]}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={config.icon}
            color={iconColor}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    // Container for touchable area
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default MediaPlayButton;
