import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import { UI_CONFIG } from "../../../../src/shared/constants";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function PlayerBackground({
  imageSource,
}: {
  imageSource: { uri: string } | null;
}) {
  if (!imageSource) return null;

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, overflow: "hidden" }}>
      <Image
        source={imageSource}
        style={{
          position: "absolute",
          top: -SCREEN_HEIGHT * 0.2,
          left: -100,
          right: -100,
          bottom: -100,
          width: "150%",
          height: "150%",
          opacity: 0.6,
        }}
        resizeMode="cover"
        blurRadius={80}
      />
      <View
        style={{
          position: "absolute",
          top: 100,
          right: -50,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: UI_CONFIG.COLORS.PRIMARY,
          opacity: 0.2,
          filter: "blur(60px)",
        } as any}
      />
      <View
        style={{
          position: "absolute",
          bottom: 150,
          left: -50,
          width: 250,
          height: 250,
          borderRadius: 125,
          backgroundColor: "#FEA74E",
          opacity: 0.15,
          filter: "blur(50px)",
        } as any}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)", "#000000"]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
