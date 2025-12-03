import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlobalAudioInstanceManager from "../utils/globalAudioInstanceManager";
import { useCurrentPlayingAudioStore } from "../store/useCurrentPlayingAudioStore";
import { Audio } from "expo-av";
import { UI_CONFIG } from "../../src/shared/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MINI_PLAYER_HEIGHT = 64;
const BOTTOM_NAV_HEIGHT = 80; // Height of bottom nav

export default function MiniAudioPlayer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const { currentAudio, clearCurrentAudio } = useCurrentPlayingAudioStore();
  const audioManager = GlobalAudioInstanceManager.getInstance();
  const mediaItem = currentAudio.mediaItem;
  const audioId = currentAudio.audioId;
  
  // Check global manager for currently playing audio
  const globalPlayingId = audioManager.getCurrentlyPlayingId();
  const effectiveAudioId = audioId || globalPlayingId;
  const shouldShow = (mediaItem && audioId) || globalPlayingId;

  // Debug logging
  useEffect(() => {
    console.log("🎵 MiniAudioPlayer - Current audio:", {
      hasMediaItem: !!mediaItem,
      hasAudioId: !!audioId,
      audioId: audioId,
      globalPlayingId: globalPlayingId,
      effectiveAudioId: effectiveAudioId,
      title: mediaItem?.title,
    });
  }, [mediaItem, audioId, globalPlayingId, effectiveAudioId]);

  // Update playback state based on global audio manager
  useEffect(() => {
    if (!audioId || !mediaItem) {
      setIsPlaying(false);
      return;
    }

    const checkPlaybackStatus = async () => {
      const sound = audioManager.getAudioInstance(effectiveAudioId || audioId);
      if (!sound) {
        setIsPlaying(false);
        return;
      }

      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying || false);
          if (status.durationMillis && typeof status.durationMillis === "number") {
            setDuration(status.durationMillis);
          }
          if (status.positionMillis && typeof status.positionMillis === "number") {
            setPosition(status.positionMillis);
            if (status.durationMillis && status.durationMillis > 0) {
              setProgress(status.positionMillis / status.durationMillis);
            }
          }
        }
      } catch (error) {
        console.warn("⚠️ Error checking playback status:", error);
      }
    };

    checkPlaybackStatus();
    
    // Set up status updates
    const sound = audioManager.getAudioInstance(effectiveAudioId || audioId);
    if (sound) {
      const statusUpdateInterval = setInterval(async () => {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying || false);
            if (status.durationMillis && typeof status.durationMillis === "number") {
              setDuration(status.durationMillis);
            }
            if (status.positionMillis && typeof status.positionMillis === "number") {
              setPosition(status.positionMillis);
              if (status.durationMillis && status.durationMillis > 0) {
                setProgress(status.positionMillis / status.durationMillis);
              }
            }
            
            // If playback finished, clear current audio
            if (status.didJustFinish) {
              clearCurrentAudio();
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }, 500); // Update every 500ms

      return () => clearInterval(statusUpdateInterval);
    }
  }, [audioId, mediaItem, audioManager, clearCurrentAudio]);

  // Subscribe to global audio manager changes
  useEffect(() => {
    const unsubscribe = audioManager.subscribe((playingId) => {
      const currentId = effectiveAudioId || audioId;
      if (playingId && playingId === currentId) {
        setIsPlaying(true);
      } else if (playingId && playingId !== currentId) {
        // Different audio is playing
        setIsPlaying(false);
      } else if (!playingId) {
        // No audio playing
        setIsPlaying(false);
      }
    });

    return unsubscribe;
  }, [audioId, effectiveAudioId, audioManager]);

  // Don't render if no audio is loaded
  if (!shouldShow) {
    return null;
  }

  const handleTogglePlayPause = async () => {
    if (!effectiveAudioId) {
      console.warn("⚠️ Cannot toggle: no effective audio ID");
      return;
    }
    
    try {
      // Get current playback state
      const playbackState = await audioManager.getPlaybackState(effectiveAudioId);
      
      if (!playbackState.isLoaded) {
        console.warn("⚠️ Cannot toggle: audio not loaded");
        return;
      }

      if (playbackState.isPlaying) {
        // Currently playing, pause it
        console.log("⏸️ Pausing audio...");
        await audioManager.pauseAudio(effectiveAudioId);
        
        // Wait a moment for pause to complete, then check state
        await new Promise(resolve => setTimeout(resolve, 100));
        const newState = await audioManager.getPlaybackState(effectiveAudioId);
        setIsPlaying(newState.isPlaying);
        console.log(`✅ Paused. Is playing: ${newState.isPlaying}`);
      } else {
        // Currently paused or stopped, resume/play it
        console.log("▶️ Resuming/playing audio...");
        await audioManager.resumeAudio(effectiveAudioId);
        
        // Wait a moment for resume to complete, then check state
        await new Promise(resolve => setTimeout(resolve, 100));
        const newState = await audioManager.getPlaybackState(effectiveAudioId);
        setIsPlaying(newState.isPlaying);
        console.log(`✅ Resumed. Is playing: ${newState.isPlaying}`);
      }
    } catch (error) {
      console.error("❌ Error toggling play/pause:", error);
      // Try to get current state anyway
      try {
        const state = await audioManager.getPlaybackState(effectiveAudioId);
        setIsPlaying(state.isPlaying);
      } catch (stateError) {
        console.error("❌ Could not get playback state:", stateError);
      }
    }
  };

  const handleStop = async () => {
    if (!effectiveAudioId) return;
    await audioManager.stopAudio(effectiveAudioId);
    await audioManager.unregisterAudio(effectiveAudioId);
    clearCurrentAudio();
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get thumbnail/image URL
  const thumbnailUrl = mediaItem.imageUrl || mediaItem.thumbnailUrl;
  const imageSource = thumbnailUrl
    ? typeof thumbnailUrl === "string"
      ? { uri: thumbnailUrl }
      : thumbnailUrl
    : null;

  // Get title and artist
  const title = mediaItem.title || "Unknown Title";
  const artist =
    (mediaItem.speaker || mediaItem.uploadedBy || "") || "Unknown Artist";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          // Float slightly above bottom nav like the copyright-free mini
          bottom: BOTTOM_NAV_HEIGHT + insets.bottom + 8,
        },
      ]}
    >
      {/* Blur glass background */}
      <BlurView
        intensity={95}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      
      {/* Glassmorphism overlay (cleaner, more minimal than copyright-free mini) */}
      <View style={styles.glassOverlay} />
      
      {/* Top progress accent */}
      {duration > 0 && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Thumbnail */}
        <TouchableOpacity
          onPress={() => {
            // Navigate to audio details or full player (can later be wired to a dedicated modal)
            router.push(`/categories/HomeScreen`);
          }}
          style={styles.thumbnailContainer}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
              <Ionicons name="musical-notes" size={24} color="#666" />
            </View>
          )}
          {/* Play indicator overlay */}
          {isPlaying && (
            <View style={styles.playIndicator}>
              <View style={styles.playIndicatorDot} />
            </View>
          )}
        </TouchableOpacity>

        {/* Track Info */}
        <TouchableOpacity
          onPress={() => {
            router.push(`/categories/HomeScreen`);
          }}
          style={styles.trackInfo}
        >
          <Text style={styles.trackTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {artist}
          </Text>
        </TouchableOpacity>

        {/* Controls – styled to echo the copyright-free mini */}
        <View style={styles.controls}>
          {/* Play/Pause Button – Jevah green, circular */}
          <TouchableOpacity
            onPress={handleTogglePlayPause}
            style={styles.playButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Stop Button – subtle glass button */}
          <TouchableOpacity
            onPress={handleStop}
            style={styles.controlButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="stop"
              size={18}
              color={UI_CONFIG.COLORS.TEXT_PRIMARY}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    height: MINI_PLAYER_HEIGHT,
    zIndex: 20, // Under big modals/FAB, similar to FloatingAudioPlayer
    overflow: "hidden",
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: UI_CONFIG.COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 24,
  },
  progressBarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  progressBar: {
    height: "100%",
    backgroundColor: UI_CONFIG.COLORS.SECONDARY || "#FEA74E",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: UI_CONFIG.SPACING.MD || 16,
    paddingVertical: UI_CONFIG.SPACING.SM || 8,
    height: "100%",
  },
  thumbnailContainer: {
    marginRight: UI_CONFIG.SPACING.MD || 12,
    position: "relative",
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  placeholderThumbnail: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  playIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.COLORS.SECONDARY || "#FEA74E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  playIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  trackInfo: {
    flex: 1,
    marginRight: UI_CONFIG.SPACING.SM || 8,
  },
  trackTitle: {
    fontSize: UI_CONFIG.TYPOGRAPHY?.FONT_SIZES?.SM || 14,
    fontFamily: "Rubik-SemiBold",
    color: UI_CONFIG.COLORS?.TEXT_PRIMARY || "#000",
    fontWeight: "600",
  },
  trackArtist: {
    fontSize: UI_CONFIG.TYPOGRAPHY?.FONT_SIZES?.XS || 12,
    fontFamily: "Rubik",
    color: UI_CONFIG.COLORS?.TEXT_SECONDARY || "#666",
    marginTop: 2,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI_CONFIG.SPACING.XS || 8,
  },
  controlButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY, // Jevah green to match brand
    justifyContent: "center",
    alignItems: "center",
    shadowColor: UI_CONFIG.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
});

