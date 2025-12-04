import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

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
  hitSlop = 10,
  className = "",
  style,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      style={[styles.button, style, className ? { className } : {}]}
    >
      <Ionicons name="ellipsis-vertical" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginLeft: 8,
  },
});

export default ThreeDotsMenuButton;
