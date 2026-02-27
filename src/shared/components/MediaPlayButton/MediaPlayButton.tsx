import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { StyleSheet, View, Pressable } from "react-native";

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
  small: { container: 8, icon: 24, hitSlop: 20, minSize: 44 },
  medium: { container: 16, icon: 40, hitSlop: 30, minSize: 60 },
  large: { container: 24, icon: 56, hitSlop: 40, minSize: 80 },
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

  // Single handler: onPress only. Do NOT use onPressIn+onPress - that fires twice per tap
  // and causes "must click twice" bug (first fires play, second fires pause on same tap).
  const handlePress = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();
      if (!disabled && onPress) onPress();
    },
    [disabled, onPress]
  );

  return (
    <View
      style={[
        styles.container,
        {
          // No dimming overlay - keep video bright and visible
          backgroundColor: "transparent",
        },
        { pointerEvents: "box-none" as any },
        className ? { className } : {},
      ]}
    >
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        hitSlop={{
          top: config.hitSlop,
          bottom: config.hitSlop,
          left: config.hitSlop,
          right: config.hitSlop,
        }}
        style={({ pressed }) => [
          styles.button,
          {
            opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
        // Ensure minimum touch target size for better responsiveness
        android_ripple={{
          color: 'rgba(255, 255, 255, 0.3)',
          borderless: true,
          radius: config.minSize / 2,
        }}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor,
              padding: config.container,
              borderRadius: 999,
              minWidth: config.minSize,
              minHeight: config.minSize,
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={config.icon}
            color={iconColor}
          />
        </View>
      </Pressable>
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
