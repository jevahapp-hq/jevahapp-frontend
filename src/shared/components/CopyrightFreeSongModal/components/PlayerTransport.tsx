import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface PlayerTransportProps {
  isPlaying: boolean;
  isShuffled: boolean;
  repeatMode: "none" | "all" | "one";
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onRepeatCycle: () => void;
  onToggleShuffle: () => void;
}

function RepeatIcon({ mode }: { mode: "none" | "all" | "one" }) {
  const active = mode !== "none";
  const color = active ? "#5EEAD4" : "rgba(255, 255, 255, 0.55)";
  if (mode === "one") {
    return <MaterialIcons name="repeat-one" size={22} color={color} />;
  }
  return <Ionicons name="repeat" size={20} color={color} />;
}

export function PlayerTransport({
  isPlaying,
  isShuffled,
  repeatMode,
  onTogglePlay,
  onSkip,
  onRepeatCycle,
  onToggleShuffle,
}: PlayerTransportProps) {
  const content = (
    <View style={styles.cardContent}>
      <View style={styles.controlsRow}>
        <TouchableOpacity
          onPress={onToggleShuffle}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[
            styles.miniControl,
            isShuffled ? styles.miniControlActive : undefined,
          ]}
        >
          <Ionicons
            name="shuffle"
            size={20}
            color={isShuffled ? "#5EEAD4" : "rgba(255, 255, 255, 0.55)"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSkip(-15)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.controlSecondary}
        >
          <Ionicons name="play-skip-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onTogglePlay}
          activeOpacity={0.85}
          style={styles.playButton}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={38}
            color="#05070C"
            style={{ marginLeft: isPlaying ? 0 : 3 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSkip(15)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.controlSecondary}
        >
          <Ionicons name="play-skip-forward" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRepeatCycle}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={
            repeatMode === "none"
              ? "Repeat off. Tap for repeat all."
              : repeatMode === "all"
                ? "Repeat all. Tap for repeat one."
                : "Repeat one. Tap to turn off."
          }
          style={[
            styles.miniControl,
            repeatMode !== "none" ? styles.miniControlActive : undefined,
          ]}
        >
          <RepeatIcon mode={repeatMode} />
          {repeatMode === "all" ? (
            <Text style={styles.repeatHint}>ALL</Text>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/**
       * BlurView as a sibling, not a parent. On Android it swallows taps when
       * it wraps TouchableOpacity children — the whole transport looked dead.
       */}
      {Platform.OS !== "web" ? (
        <BlurView
          intensity={30}
          tint="dark"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.webFallback]} />
      )}
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.16)",
    marginBottom: 20,
    overflow: "hidden",
  },
  webFallback: {
    backgroundColor: "rgba(18, 24, 38, 0.75)",
  },
  cardContent: {
    width: "100%",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlSecondary: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#5EEAD4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 16,
  },
  miniControl: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  miniControlActive: {
    backgroundColor: "rgba(94, 234, 212, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(94, 234, 212, 0.5)",
  },
  repeatHint: {
    position: "absolute",
    bottom: 2,
    fontSize: 7,
    fontFamily: "PlusJakartaSans-Bold",
    color: "#5EEAD4",
    letterSpacing: 0.4,
  },
});
