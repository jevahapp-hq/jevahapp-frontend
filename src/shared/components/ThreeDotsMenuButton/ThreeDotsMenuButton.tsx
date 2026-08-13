/**
 * Content actions ⋮ — large hit target, single press (no onPressIn double-fire).
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";

export interface ThreeDotsMenuButtonProps {
  onPress: () => void;
  size?: number;
  color?: string;
  hitSlop?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const ThreeDotsMenuButton: React.FC<ThreeDotsMenuButtonProps> = ({
  onPress,
  size = 20,
  color = "#6B7280",
  hitSlop = 12,
  style,
  accessibilityLabel = "Content actions",
}) => {
  const lastPressAt = useRef(0);

  const handlePress = () => {
    const now = Date.now();
    // Guard against accidental double delivery on some Android firmwares
    if (now - lastPressAt.current < 350) return;
    lastPressAt.current = now;
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && styles.pressed,
      ]}
      android_ripple={{
        color: "rgba(0, 0, 0, 0.08)",
        borderless: true,
        radius: 22,
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="ellipsis-vertical" size={size} color={color} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },
});

export default ThreeDotsMenuButton;
