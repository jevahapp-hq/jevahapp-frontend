import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { usePathname, useRouter, useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UI_CONFIG } from "../../../src/shared/constants";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useGlobalAudioPlayerStore } from "../../store/useGlobalAudioPlayerStore";
import { getBottomNavHeight } from "../../utils/responsiveOptimized";
import CopyrightFreeSongModal from "../CopyrightFreeSongModal";
import { useFloatingPlayerDrag } from "./useFloatingPlayerDrag";
import { useLoadPlayerPosition } from "./useLoadPlayerPosition";
import { usePlayerVisibility } from "./usePlayerVisibility";
import { styles } from "./styles";

export default function FloatingAudioPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { user, loading: userLoading } = useUserProfile();
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [playerPosition, setPlayerPosition] = useState({ x: 16, y: 0 });

  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    progress,
    togglePlayPause,
    seekToProgress,
    toggleMute,
    isMuted,
    stop,
    next,
    previous,
    clear,
  } = useGlobalAudioPlayerStore();

  const shouldShowPlayer = usePlayerVisibility({
    pathname,
    segments,
    currentTrack,
    user,
    userLoading,
  });

  const { translateX, translateYDrag, panResponder } = useFloatingPlayerDrag({
    playerPosition,
    setPlayerPosition,
    getBottomNavHeight,
    insets,
    onClear: clear,
  });

  useLoadPlayerPosition({ setPlayerPosition, translateX, translateYDrag });

  const handleCloseMini = React.useCallback(() => {
    clear();
  }, [clear]);

  // Fade-in and slide-up animation when track appears
  useEffect(() => {
    const bibleRouteSegments = ['bible', 'biblescreen', 'bibleonboarding', 'reader'];
    const inBibleRoute = segments.some(seg =>
      bibleRouteSegments.includes(seg.toLowerCase())
    );
    if (inBibleRoute && currentTrack) {
      stop();
      return;
    }

    if (currentTrack && shouldShowPlayer) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentTrack, shouldShowPlayer, segments, stop]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!shouldShowPlayer || !currentTrack) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            left: 0,
            bottom: 0,
            opacity: fadeAnim,
            transform: [
              { translateX },
              { translateY: Animated.multiply(Animated.add(translateYDrag, slideAnim), -1) },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <BlurView intensity={95} tint="light" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
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
            onPress={() => setShowFullPlayer(true)}
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

          <TouchableOpacity
            onPress={() => setShowFullPlayer(true)}
            style={styles.trackInfo}
          >
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </TouchableOpacity>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={previous}
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
              onPress={togglePlayPause}
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
              onPress={next}
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
              onPress={handleCloseMini}
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

      <CopyrightFreeSongModal
        visible={showFullPlayer}
        song={currentTrack}
        onClose={() => setShowFullPlayer(false)}
        onPlay={togglePlayPause}
        isPlaying={isPlaying}
        audioProgress={progress}
        audioDuration={duration}
        audioPosition={position}
        isMuted={isMuted}
        onTogglePlay={togglePlayPause}
        onToggleMute={toggleMute}
        onSeek={seekToProgress}
        formatTime={formatTime}
      />
    </>
  );
}
