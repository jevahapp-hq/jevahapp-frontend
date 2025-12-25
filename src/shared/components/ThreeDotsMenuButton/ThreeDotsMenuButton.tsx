import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

interface ThreeDotsMenuButtonProps {
  onPress: () => void;
  size?: number;
  color?: string;
  hitSlop?: number;
  className?: string;
  style?: any;
}

export const ThreeDotsMenuButton: React.FC<ThreeDotsMenuButtonProps> = ({
  onPress,
  size = 18,
  color = "#9CA3AF",
  hitSlop = 15,
  className = "",
  style,
}) => {
  const [pressed, setPressed] = useState(false);

  const handlePressIn = () => {
    setPressed(true);
    // Call onPress immediately for better responsiveness
    onPress();
  };

  const handlePressOut = () => {
    setPressed(false);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      style={[
        styles.button,
        style,
        pressed && styles.pressed,
        className ? { className } : {},
      ]}
      android_ripple={{
        color: "rgba(0, 0, 0, 0.1)",
        borderless: true,
        radius: 20,
      }}
    >
      <Ionicons 
        name="ellipsis-vertical" 
        size={size} 
        color={color}
        style={pressed && { opacity: 0.7 }}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    marginLeft: 8,
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});

export default ThreeDotsMenuButton;
