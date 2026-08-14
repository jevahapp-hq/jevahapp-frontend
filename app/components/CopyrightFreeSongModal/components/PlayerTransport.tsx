import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export interface PlayerTransportProps {
  isPlaying: boolean;
  isShuffled: boolean;
  repeatMode: "none" | "all" | "one";
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onRepeatCycle: () => void;
  onToggleShuffle: () => void;
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
  return (
    <BlurView
      intensity={20}
      tint="dark"
      style={{
        padding: 24,
        borderRadius: 32,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <TouchableOpacity
          onPress={() => onSkip(-15)}
          activeOpacity={0.6}
          style={styles.controlSecondary}
        >
          <Ionicons name="play-skip-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onTogglePlay} activeOpacity={0.8} style={styles.playButton}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={42}
            color="#000"
            style={{ marginLeft: isPlaying ? 0 : 4 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSkip(15)}
          activeOpacity={0.6}
          style={styles.controlSecondary}
        >
          <Ionicons name="play-skip-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
        }}
      >
        <TouchableOpacity
          onPress={onToggleShuffle}
          style={[
            styles.miniControl,
            isShuffled ? styles.miniControlActive : undefined,
          ]}
        >
          <Ionicons
            name="shuffle"
            size={20}
            color={isShuffled ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRepeatCycle}
          style={[
            styles.miniControl,
            repeatMode !== "none" ? styles.miniControlActive : undefined,
          ]}
        >
          <Ionicons
            name="repeat"
            size={20}
            color={repeatMode !== "none" ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)"}
          />
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  controlSecondary: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  playButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  miniControl: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  miniControlActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
});
