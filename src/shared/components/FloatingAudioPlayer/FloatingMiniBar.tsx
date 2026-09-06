import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  getMiniPlayerBottomOffset,
  MINI_PLAYER_SIDE_MARGIN,
} from "../../layout/bottomChromeLayout";
import { floatingMiniBarStyles as styles, ON_SURFACE } from "./floatingMiniBarStyles";
import { MiniBarArtwork } from "./parts/MiniBarArtwork";
import { MiniBarControls } from "./parts/MiniBarControls";
import { MiniBarMeta } from "./parts/MiniBarMeta";
import { MiniBarProgress } from "./parts/MiniBarProgress";

type Track = {
  title: string;
  artist: string;
  thumbnailUrl: string | number;
  releaseTitle?: string;
  release?: { title?: string };
};

type FloatingMiniBarProps = {
  currentTrack: Track;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  handlePan: any;
  surfaceGesture: any;
  overlayCovered: boolean;
  onOpenFullPlayer?: () => void;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onClose: () => void;
};

function resolveSubtitle(track: Track): string {
  const release = track.releaseTitle || track.release?.title;
  if (release) return `Playing from ${release}`;
  return track.artist || "";
}

export function FloatingMiniBar({
  currentTrack,
  isPlaying,
  isLoading,
  progress,
  dragX,
  dragY,
  handlePan,
  surfaceGesture,
  overlayCovered,
  onOpenFullPlayer,
  onTogglePlayPause,
  onNext,
  onClose,
}: FloatingMiniBarProps) {
  const expandable = typeof onOpenFullPlayer === "function";

  const restBottom = getMiniPlayerBottomOffset();
  const dragStyle = useAnimatedStyle(() => ({
    left: MINI_PLAYER_SIDE_MARGIN + dragX.value,
    right: MINI_PLAYER_SIDE_MARGIN - dragX.value,
    bottom: restBottom - dragY.value,
  }));

  return (
    <Animated.View
      pointerEvents={overlayCovered ? "none" : "auto"}
      style={[styles.container, overlayStyles.bar, dragStyle]}
    >
        <GestureDetector gesture={handlePan}>
          <View
            collapsable={false}
            style={styles.dragHandle}
            accessible
            accessibilityLabel="Move player"
            accessibilityHint={
              expandable
                ? "Drag to reposition. Activate to expand."
                : "Drag to reposition."
            }
          >
            <View style={styles.grabber} />
          </View>
        </GestureDetector>

        <View style={styles.content}>
          <GestureDetector gesture={surfaceGesture}>
            <Animated.View
              collapsable={false}
              style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
            >
              <View style={styles.artworkWrap}>
                <MiniBarArtwork thumbnailUrl={currentTrack.thumbnailUrl} />
              </View>
              <View style={styles.meta}>
                <MiniBarMeta
                  title={currentTrack.title}
                  subtitle={resolveSubtitle(currentTrack)}
                />
              </View>
            </Animated.View>
          </GestureDetector>

          {expandable ? (
            <Pressable
              onPress={onOpenFullPlayer}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Expand player"
              style={styles.expandButton}
            >
              <Ionicons name="chevron-up" size={22} color={ON_SURFACE} />
            </Pressable>
          ) : null}

          <MiniBarControls
            isPlaying={isPlaying}
            isLoading={isLoading}
            onTogglePlayPause={onTogglePlayPause}
            onNext={onNext}
            onClose={onClose}
          />
        </View>

        <MiniBarProgress progress={progress} />
    </Animated.View>
  );
}

const overlayStyles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: MINI_PLAYER_SIDE_MARGIN,
    right: MINI_PLAYER_SIDE_MARGIN,
  },
});
