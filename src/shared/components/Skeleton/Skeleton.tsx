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
    // Shimmer animation - light moving across (more obvious)
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerTranslateX, {
          toValue: 600, // Move further to the right for more visible sweep
          duration: 1200, // Slightly faster for more noticeable effect
          useNativeDriver: true,
        }),
        Animated.timing(shimmerTranslateX, {
          toValue: -300, // Start further left for wider sweep
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle pulse animation for base (reduced to make shimmer more prominent)
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.65,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 1200,
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
  // More visible shimmer - brighter and more opaque
  const shimmerColor = dark ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.7)";

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
      {/* Shimmer effect - light shining across (more obvious) */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "60%", // Wider shimmer beam for more visibility
          height: "100%",
          backgroundColor: shimmerColor,
          transform: [
            {
              translateX: shimmerTranslateX,
            },
            {
              skewX: "25deg", // More angled for sharper light reflection
            },
          ],
          opacity: 0.9, // Much more visible
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
