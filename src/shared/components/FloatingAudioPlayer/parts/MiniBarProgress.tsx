import React from "react";
import { View } from "react-native";
import { floatingMiniBarStyles as styles } from "../floatingMiniBarStyles";

type Props = {
  /** 0–1. */
  progress: number;
};

/**
 * Hairline progress line along the bottom edge.
 *
 * Driven by a width percentage rather than an animated transform: the store
 * already throttles position updates to ~80ms, and a `scaleX` transform on a
 * 2px bar anchors from the centre unless an extra wrapper is added.
 */
export const MiniBarProgress = React.memo(function MiniBarProgress({
  progress,
}: Props) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  return (
    <View style={styles.progressTrack} pointerEvents="none">
      <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
});
