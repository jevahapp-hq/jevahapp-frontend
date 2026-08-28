import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";
import {
  floatingMiniBarStyles as styles,
  ON_SURFACE,
  ON_SURFACE_MUTED,
} from "../floatingMiniBarStyles";

/** Generous target: these buttons sit close together in a 64px-tall bar. */
const HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

type Props = {
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onClose: () => void;
};

/**
 * Play / next / dismiss only.
 *
 * `previous` was dropped from the mini bar deliberately: four adjacent targets
 * in a compact bar invited mis-taps, and skip-back is available in the full
 * player. This matches how Spotify and YouTube Music scope their mini bars.
 */
export const MiniBarControls = React.memo(function MiniBarControls({
  isPlaying,
  isLoading,
  onTogglePlayPause,
  onNext,
  onClose,
}: Props) {
  return (
    <View style={styles.controls}>
      <Pressable
        onPress={onTogglePlayPause}
        style={styles.playButton}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
        accessibilityState={{ busy: isLoading }}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={18}
          color="#FFFFFF"
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
        style={styles.closeButton}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Close player"
      >
        <Ionicons name="close" size={15} color={ON_SURFACE_MUTED} />
      </Pressable>
    </View>
  );
});
