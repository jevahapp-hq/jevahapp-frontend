import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface DurationDisplayProps {
  currentMs: number;
  durationMs: number;
  showIcon?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  textColor?: string;
  textSize?: "xs" | "sm" | "base";
  className?: string;
}

export const DurationDisplay: React.FC<DurationDisplayProps> = ({
  currentMs,
  durationMs,
  showIcon = true,
  iconName = "time-outline",
  iconSize = 14,
  iconColor = "#9CA3AF",
  textColor = "#9CA3AF",
  textSize = "xs",
  className = "",
}) => {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getTextSizeClass = () => {
    switch (textSize) {
      case "xs":
        return "text-[10px]";
      case "sm":
        return "text-[12px]";
      case "base":
        return "text-[14px]";
      default:
        return "text-[10px]";
    }
  };

  return (
    <View className={`flex-row items-center ${className}`}>
      {showIcon && (
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
      )}
      <Text
        className={`${getTextSizeClass()} font-rubik ml-1`}
        style={{ color: textColor }}
      >
        {formatTime(currentMs)} / {formatTime(durationMs)}
      </Text>
    </View>
  );
};

export default DurationDisplay;
