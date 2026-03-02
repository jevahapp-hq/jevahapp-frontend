import React, { useEffect, useRef } from "react";
import { Animated, Platform, Text, View } from "react-native";

interface DynamicActionPopupProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  // Rendered within the popup for dynamic server content
  children?: React.ReactNode;
  // Positioning relative to parent (the parent should be position: 'relative')
  offsetX?: number; // horizontal offset from right edge
  offsetY?: number; // vertical offset from top edge
  onHideAuto?: boolean;
  durationMs?: number;
}

// A lightweight, glassy animated popup inspired by our Reels overlay styling
export default function DynamicActionPopup({
  visible,
  title,
  subtitle,
  children,
  offsetX = 0,
  offsetY = -8,
  onHideAuto = false,
  durationMs = 1400,
}: DynamicActionPopupProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  useEffect(() => {
    if (!visible || !onHideAuto) return;
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }, durationMs);
    return () => clearTimeout(t);
  }, [visible, onHideAuto, durationMs, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        right: offsetX,
        top: offsetY,
        opacity,
        transform: [{ scale }],
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.3)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 8,
          ...(Platform.OS === "ios" &&
            {
              // backdropFilter not supported in RN, but we keep same visual tone
            }),
        }}
      >
        {!!title && (
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#FFFFFF",
              marginBottom: subtitle ? 2 : 0,
            }}
          >
            {title}
          </Text>
        )}
        {!!subtitle && (
          <Text style={{ fontSize: 11, color: "#F3F4F6" }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {children}
      </View>
    </Animated.View>
  );
}
