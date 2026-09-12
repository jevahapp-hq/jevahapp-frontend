import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export function PlayerBackground() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["#1A3D38", "#0F1C1A", "#07110F"]}
      style={styles.fill}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
