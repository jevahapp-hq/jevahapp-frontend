import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getBottomNavHeight } from "../../../../app/utils/responsiveOptimized";
import { UI_CONFIG } from "../../constants";
import { floatingMiniBarStyles as styles } from "./floatingMiniBarStyles";

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
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  dragY: Animated.Value;
  panHandlers: object;
  onOpenFullPlayer: () => void;
  onPrevious: () => void;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onClose: () => void;
};

export function FloatingMiniBar({
  currentTrack,
  isPlaying,
  fadeAnim,
  slideAnim,
  dragY,
  panHandlers,
  onOpenFullPlayer,
  onPrevious,
  onTogglePlayPause,
  onNext,
  onClose,
}: FloatingMiniBarProps) {
  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: getBottomNavHeight() + 56,
          opacity: fadeAnim,
          transform: [
            {
              translateY: Animated.add(dragY, slideAnim),
            },
          ],
        },
      ]}
      {...panHandlers}
    >
      <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.glassOverlay} />
      <Animated.View
        style={[
          styles.glowEffect,
          {
            opacity: isPlaying ? 0.2 : 0.05,
            transform: [{ scale: isPlaying ? 1.8 : 1.2 }],
          },
        ]}
      />
      <View style={styles.gradientAccent} />

      <View style={styles.content}>
        <TouchableOpacity
          onPress={onOpenFullPlayer}
          style={styles.thumbnailContainer}
        >
          <Image
            source={
              typeof currentTrack.thumbnailUrl === "string"
                ? { uri: currentTrack.thumbnailUrl }
                : currentTrack.thumbnailUrl
            }
            style={styles.thumbnail}
            resizeMode="cover"
          />
          {isPlaying && (
            <View style={styles.playIndicator}>
              <View style={styles.playIndicatorDot} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onOpenFullPlayer} style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentTrack.releaseTitle || currentTrack.release?.title
              ? `Playing from ${currentTrack.releaseTitle || currentTrack.release?.title}`
              : currentTrack.artist}
          </Text>
          {(currentTrack.releaseTitle || currentTrack.release?.title) &&
          currentTrack.artist ? (
            <Text
              style={[styles.trackArtist, { fontSize: 11, opacity: 0.75 }]}
              numberOfLines={1}
            >
              {currentTrack.artist}
            </Text>
          ) : null}
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={onPrevious}
            style={styles.controlButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="play-skip-back"
              size={20}
              color={UI_CONFIG.COLORS.TEXT_PRIMARY}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onTogglePlayPause}
            style={styles.playButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNext}
            style={styles.controlButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="play-skip-forward"
              size={20}
              color={UI_CONFIG.COLORS.TEXT_PRIMARY}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close"
              size={18}
              color={UI_CONFIG.COLORS.TEXT_SECONDARY}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
