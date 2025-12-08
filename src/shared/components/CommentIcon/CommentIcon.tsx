import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, ViewStyle } from "react-native";
import { UI_CONFIG } from "../../constants";
import { CommentIconProps } from "../../types/comment.types";
import { triggerHapticFeedback } from "../../utils";
import {
    getResponsiveFontSize,
    getResponsiveSize,
    getResponsiveSpacing,
    getTouchTargetSize,
} from "../../utils/responsive";
import { AnimatedButton } from "../AnimatedButton";

// Re-export types for convenience
export type { CommentIconProps } from "../../types/comment.types";

export const CommentIcon: React.FC<CommentIconProps> = ({
  comments,
  size = 24,
  color = UI_CONFIG.COLORS.TEXT_SECONDARY,
  showCount = false,
  count,
  layout = "horizontal",
  contentId,
  onPress,
  style,
  useAnimatedButton = true,
}) => {
  const handlePress = () => {
    triggerHapticFeedback();
    if (onPress) {
      onPress();
    }
    // Note: If contentId is provided but no onPress, the parent component
    // should handle opening the comment modal. The app/components/CommentIcon.tsx
    // wrapper handles this case for backward compatibility.
  };

  const isVertical = layout === "vertical";
  const iconSize =
    size ||
    (isVertical ? getResponsiveSize(28, 32, 36) : getResponsiveSize(24, 26, 28));
  const padding = isVertical
    ? getResponsiveSpacing(8, 10, 12)
    : getResponsiveSpacing(6, 8, 10);

  const containerStyle: ViewStyle = {
    flexDirection: isVertical ? "column" : "row",
    alignItems: "center",
    justifyContent: "center",
    padding,
    minWidth: getTouchTargetSize(),
    minHeight: getTouchTargetSize(),
  };

  const textStyle = {
    marginLeft: isVertical ? 0 : getResponsiveSpacing(4, 6, 8),
    marginTop: isVertical ? getResponsiveSpacing(2, 4, 5) : 0,
    fontSize: isVertical
      ? getResponsiveFontSize(9, 10, 11)
      : getResponsiveFontSize(10, 11, 12),
    color,
    fontFamily: "Rubik-SemiBold",
    textAlign: "center" as const,
    textShadowColor:
      isVertical && color.toLowerCase() === "#ffffff"
        ? "rgba(0, 0, 0, 0.5)"
        : "transparent",
    textShadowOffset:
      isVertical && color.toLowerCase() === "#ffffff"
        ? { width: 0, height: 1 }
        : { width: 0, height: 0 },
    textShadowRadius:
      isVertical && color.toLowerCase() === "#ffffff" ? 2 : 0,
  };

  const ButtonComponent = useAnimatedButton ? AnimatedButton : TouchableOpacity;
  const buttonProps = useAnimatedButton
    ? {}
    : { activeOpacity: 0.7 };

  return (
    <ButtonComponent
      onPress={handlePress}
      hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
      style={[containerStyle, style]}
      accessibilityRole="button"
      accessibilityLabel="Open comments"
      {...buttonProps}
    >
      <Ionicons name="chatbubble-outline" size={iconSize} color={color} />
      {showCount && (
        <Text style={textStyle} pointerEvents="none">
          {count !== undefined ? count : comments.length}
        </Text>
      )}
    </ButtonComponent>
  );
};

export default CommentIcon;
