import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/** Hero wash used by the playlist sheet and the music player. */
export function PlayerBackground({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient colors={["#1A3D38", "#0F1C1A", "#07110F"]} style={style}>
      {children}
    </LinearGradient>
  );
}
