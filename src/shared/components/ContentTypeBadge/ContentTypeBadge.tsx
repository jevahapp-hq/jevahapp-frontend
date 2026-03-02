import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";

interface ContentTypeBadgeProps {
  contentType: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size?: "small" | "medium" | "large";
  backgroundColor?: string;
  iconColor?: string;
  className?: string;
}

export const ContentTypeBadge: React.FC<ContentTypeBadgeProps> = ({
  contentType,
  position = "top-left",
  size = "medium",
  backgroundColor = "bg-black/50",
  iconColor = "#FFFFFF",
  className = "",
}) => {
  const getContentTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "video":
      case "videos":
        return "play";
      case "audio":
      case "music":
        return "musical-notes";
      case "sermon":
        return "person";
      case "image":
      case "ebook":
      case "books":
        return "book";
      case "live":
        return "radio";
      default:
        return "document";
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case "small":
        return { container: "px-1 py-0.5", icon: 12 };
      case "medium":
        return { container: "px-2 py-1", icon: 16 };
      case "large":
        return { container: "px-3 py-2", icon: 20 };
      default:
        return { container: "px-2 py-1", icon: 16 };
    }
  };

  const getPositionClass = () => {
    switch (position) {
      case "top-left":
        return "absolute top-4 left-4";
      case "top-right":
        return "absolute top-4 right-4";
      case "bottom-left":
        return "absolute bottom-4 left-4";
      case "bottom-right":
        return "absolute bottom-4 right-4";
      default:
        return "absolute top-4 left-4";
    }
  };

  const { container, icon } = getSizeConfig();

  return (
    <View className={`${getPositionClass()} ${className}`}>
      <View
        className={`${backgroundColor} ${container} rounded-full flex-row items-center`}
      >
        <Ionicons
          name={getContentTypeIcon(contentType) as any}
          size={icon}
          color={iconColor}
        />
      </View>
    </View>
  );
};

export default ContentTypeBadge;
