import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";

export interface PlayerTransportProps {
  isPlaying: boolean;
  repeatMode: "none" | "all" | "one";
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRepeatCycle: () => void;
  onOptionsPress: () => void;
}

export function PlayerTransport({
  isPlaying,
  repeatMode,
  onTogglePlay,
  onPrevious,
  onNext,
  onRepeatCycle,
  onOptionsPress,
}: PlayerTransportProps) {
  const repeatOn = repeatMode !== "none";

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onOptionsPress}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="More options"
        style={styles.sideHit}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onPrevious}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Previous track"
        style={styles.sideHit}
      >
        <Ionicons name="play-skip-back" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onTogglePlay}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
        style={styles.playButton}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={34}
          color="#FFFFFF"
          style={{ marginLeft: isPlaying ? 0 : 3 }}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onNext}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Next track"
        style={styles.sideHit}
      >
        <Ionicons name="play-skip-forward" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onRepeatCycle}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={
          repeatMode === "none"
            ? "Repeat off"
            : repeatMode === "one"
              ? "Repeat one"
              : "Repeat all"
        }
        style={styles.sideHit}
      >
        {repeatMode === "one" ? (
          <MaterialIcons name="repeat-one" size={24} color={UI_CONFIG.COLORS.PRIMARY} />
        ) : (
          <Ionicons
            name="repeat"
            size={22}
            color={repeatOn ? UI_CONFIG.COLORS.PRIMARY : "#FFFFFF"}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 2,
  },
  sideHit: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
});
