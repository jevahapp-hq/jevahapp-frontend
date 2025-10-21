import React from "react";
import { Text, View } from "react-native";

interface VideoTitleProps {
  title: string;
  position?: "overlay" | "below";
  maxLines?: number;
  showShadow?: boolean;
  className?: string;
}

export const VideoTitle: React.FC<VideoTitleProps> = ({
  title,
  position = "overlay",
  maxLines = 2,
  showShadow = true,
  className = "",
}) => {
  const baseStyles = "text-white font-semibold text-sm";
  const shadowStyles = showShadow
    ? {
        textShadowColor: "rgba(0, 0, 0, 0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }
    : {};

  if (position === "overlay") {
    return (
      <View
        className={`absolute bottom-8 left-3 right-3 px-4 py-2 rounded-md ${className}`}
      >
        <Text
          className={baseStyles}
          numberOfLines={maxLines}
          style={shadowStyles}
        >
          {title}
        </Text>
      </View>
    );
  }

  return (
    <View className={`px-3 py-2 ${className}`}>
      <Text
        className={`${baseStyles} text-[#344054]`}
        numberOfLines={maxLines}
        style={showShadow ? {} : shadowStyles}
      >
        {title}
      </Text>
    </View>
  );
};

export default VideoTitle;
