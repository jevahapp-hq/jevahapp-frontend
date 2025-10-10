import { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { UI_CONFIG } from "../../constants";

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  dark?: boolean; // for dark backgrounds
  // Card-like presets to avoid misalignment
  variant?: "card" | "thumbnail" | "text" | "avatar" | "none";
};

export default function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
  dark = false,
  variant = "none",
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const baseColor = dark
    ? UI_CONFIG.COLORS.SKELETON_DARK_BASE
    : UI_CONFIG.COLORS.SKELETON_BASE;
  const highlight = dark
    ? UI_CONFIG.COLORS.SKELETON_DARK_HIGHLIGHT
    : UI_CONFIG.COLORS.SKELETON_HIGHLIGHT;

  // Apply variant presets for perfect alignment with cards
  // - card: matches typical media cards (rounded corners, fixed height)
  // - thumbnail: for small image tiles
  // - text: small height bars
  // - avatar: circle
  let presetStyle: Partial<ViewStyle> = {};
  if (variant === "card") {
    presetStyle = {
      width: "100%",
      height: 400, // matches typical card heights used across the app
      borderRadius: UI_CONFIG.BORDER_RADIUS.XL,
      backgroundColor: baseColor,
    };
  } else if (variant === "thumbnail") {
    presetStyle = {
      width: "100%",
      height: 232, // matches mini card heights
      borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
      backgroundColor: baseColor,
    };
  } else if (variant === "text") {
    presetStyle = {
      height: 14,
      borderRadius: UI_CONFIG.BORDER_RADIUS.SM,
      backgroundColor: baseColor,
    };
  } else if (variant === "avatar") {
    presetStyle = {
      width: 40,
      height: 40,
      borderRadius: UI_CONFIG.BORDER_RADIUS.FULL,
      backgroundColor: baseColor,
    };
  }

  return (
    <Animated.View
      style={[
        // preset first to ensure alignment, then allow explicit overrides
        presetStyle,
        {
          width: presetStyle.width ?? width,
          height: presetStyle.height ?? height,
          borderRadius: presetStyle.borderRadius ?? borderRadius,
          backgroundColor: baseColor,
          opacity,
        },
        style,
      ]}
    >
      {/* subtle overlay highlight */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: highlight,
          opacity: 0.18,
          borderRadius,
        }}
      />
    </Animated.View>
  );
}
