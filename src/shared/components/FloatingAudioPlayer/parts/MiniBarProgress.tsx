import React from "react";
import { View } from "react-native";
import { useAudioProgressStore } from "@/store/audioPlayer/audioProgressStore";
import { floatingMiniBarStyles as styles } from "../floatingMiniBarStyles";

/**
 * Hairline progress line along the bottom edge.
 * Subscribes to the playback clock so play/pause chrome does not re-render
 * on every tick.
 */
export const MiniBarProgress = React.memo(function MiniBarProgress() {
  const progress = useAudioProgressStore((s) => s.progress);
  const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  return (
    <View style={styles.progressTrack} pointerEvents="none">
      <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
});
