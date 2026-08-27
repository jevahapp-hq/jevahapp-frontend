import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function PlayerBackground({
  imageSource,
}: {
  imageSource: any | null;
}) {
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, overflow: "hidden", backgroundColor: "#0A0D14" }}>
      {imageSource ? (
        <Image
          source={imageSource}
          style={{
            position: "absolute",
            top: -SCREEN_HEIGHT * 0.25,
            left: -120,
            right: -120,
            bottom: -120,
            width: "160%",
            height: "160%",
            opacity: 0.65,
          }}
          resizeMode="cover"
          blurRadius={90}
        />
      ) : null}
      {/* Primary Teal Ambient Glow Orb */}
      <View
        style={{
          position: "absolute",
          top: 60,
          right: -60,
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: UI_CONFIG.COLORS.PRIMARY,
          opacity: 0.28,
        }}
      />
      {/* Secondary Warm Amber Ambient Glow Orb */}
      <View
        style={{
          position: "absolute",
          bottom: 120,
          left: -60,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: "#FEA74E",
          opacity: 0.22,
        }}
      />
      {/* Accent Indigo Mesh */}
      <View
        style={{
          position: "absolute",
          top: SCREEN_HEIGHT * 0.35,
          left: "20%",
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: "#4F46E5",
          opacity: 0.15,
        }}
      />
      {/* Layered vignette gradient */}
      <LinearGradient
        colors={[
          "rgba(10, 13, 20, 0.4)",
          "rgba(10, 13, 20, 0.65)",
          "rgba(5, 7, 12, 0.92)",
          "#05070C",
        ]}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
