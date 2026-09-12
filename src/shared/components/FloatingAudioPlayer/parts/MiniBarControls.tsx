import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import {
  floatingMiniBarStyles as styles,
  ON_SURFACE,
} from "../floatingMiniBarStyles";

/** Generous target: these buttons sit close together in a 64px-tall bar. */
const HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

type Props = {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
};

/**
 * Previous (green) / play / next / dismiss.
 * Close is a red X so it is obvious and must stop playback.
 */
export const MiniBarControls = React.memo(function MiniBarControls({
  isPlaying,
  isLoading,
  onTogglePlayPause,
  onPrevious,
  onNext,
  onClose,
}: Props) {
  return (
    <View style={styles.controls}>
      <Pressable
        onPress={onPrevious}
        style={styles.playButton}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Previous track"
      >
        <Ionicons name="play-skip-back" size={18} color="#FFFFFF" />
      </Pressable>

      <Pressable
        onPress={onTogglePlayPause}
        style={styles.ghostButton}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
        accessibilityState={{ busy: isLoading }}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={19}
          color={ON_SURFACE}
        />
      </Pressable>

      <Pressable
        onPress={onNext}
        style={styles.ghostButton}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Next track"
      >
        <Ionicons name="play-skip-forward" size={19} color={ON_SURFACE} />
      </Pressable>

      <Pressable
        onPress={onClose}
        hitSlop={HIT_SLOP}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close player"
      >
        <Ionicons name="close-circle" size={18} color="#EF4444" />
      </Pressable>
    </View>
  );
});
