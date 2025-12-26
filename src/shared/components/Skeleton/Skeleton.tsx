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
  borderRadius = 0,
  style,
  dark = false,
  variant = "none",
}: SkeletonProps) {
  // Shimmer animation - light shining across
  const shimmerTranslateX = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Shimmer animation - light moving across
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerTranslateX, {
          toValue: 400, // Move from left to right
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerTranslateX, {
          toValue: -200, // Reset to start
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle pulse animation for base
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();
    pulseAnimation.start();

    return () => {
      shimmerAnimation.stop();
      pulseAnimation.stop();
    };
  }, [shimmerTranslateX, opacity]);

  const baseColor = dark
    ? UI_CONFIG.COLORS.SKELETON_DARK_BASE || "#2A2A2A"
    : UI_CONFIG.COLORS.SKELETON_BASE || "#E5E7EB";
  const highlight = dark
    ? UI_CONFIG.COLORS.SKELETON_DARK_HIGHLIGHT || "#3A3A3A"
    : UI_CONFIG.COLORS.SKELETON_HIGHLIGHT || "#F3F4F6";
  const shimmerColor = dark ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.4)";

  // Apply variant presets for perfect alignment with cards
  // - card: matches typical media cards (no rounded corners for sharp edges)
  // - thumbnail: for small image tiles (no rounded corners)
  // - text: small height bars (no rounded corners)
  // - avatar: circle (keep rounded for profile pics)
  let presetStyle: Partial<ViewStyle> = {};
  if (variant === "card") {
    presetStyle = {
      width: "100%",
      height: 400, // matches typical card heights used across the app
      borderRadius: 0, // Removed border radius for sharp video card edges
      backgroundColor: baseColor,
    };
  } else if (variant === "thumbnail") {
    presetStyle = {
      width: "100%",
      height: 232, // matches mini card heights
      borderRadius: 0, // Removed border radius for sharp thumbnail edges
      backgroundColor: baseColor,
    };
  } else if (variant === "text") {
    presetStyle = {
      height: 14,
      borderRadius: 0, // Removed border radius for sharp text skeleton edges
      backgroundColor: baseColor,
    };
  } else if (variant === "avatar") {
    presetStyle = {
      width: 40,
      height: 40,
      borderRadius: UI_CONFIG.BORDER_RADIUS.FULL || 20, // Keep rounded for avatars
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
          overflow: "hidden", // Critical for shimmer effect
        },
        style,
      ]}
    >
      {/* Shimmer effect - light shining across */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          height: "100%",
          backgroundColor: shimmerColor,
          transform: [
            {
              translateX: shimmerTranslateX,
            },
            {
              skewX: "20deg", // Angled light beam
            },
          ],
          opacity: 0.6,
        }}
      />
      
      {/* Subtle overlay highlight */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: highlight,
          opacity: 0.12,
          borderRadius: presetStyle.borderRadius ?? borderRadius,
        }}
      />
    </Animated.View>
  );
}
