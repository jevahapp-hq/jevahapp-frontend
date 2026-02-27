import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { usePathname, useRouter, useSegments } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UI_CONFIG } from "../../src/shared/constants";
import { useUserProfile } from "../hooks/useUserProfile";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import { getBottomNavHeight } from "../utils/responsiveOptimized";
import CopyrightFreeSongModal from "./CopyrightFreeSongModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MINI_PLAYER_HEIGHT = 72; // Slightly taller for better glassmorphism effect

export default function FloatingAudioPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { user, loading: userLoading } = useUserProfile();
  const [showFullPlayer, setShowFullPlayer] = React.useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const panY = useRef(0);
  const fadeAnim = useRef(new Animated.Value(0)).current; // For fade-in animation
  const slideAnim = useRef(new Animated.Value(100)).current; // For slide-up animation

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

  const handleCloseMini = React.useCallback(() => {
    // For an explicit close tap, immediately clear the global
    // audio player so the mini player disappears in one action.
    clear();
  }, [clear]);

  // Check authentication using Clerk
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();

  // Check if user is authenticated and not on auth/onboarding screens
  // Show player if there's a track, even if auth isn't fully loaded (for better UX)
  const shouldShowPlayer = useMemo(() => {
    // Don't show on auth/onboarding screens - always hide there
    const authRouteSegments = ['auth', 'login', 'signup', 'sign-in', 'sign-up', 'onboarding', 'welcome'];
    const authRoutePaths = ['/auth', '/login', '/signup', '/sign-in', '/sign-up', '/onboarding', '/welcome'];

    // Check if current path is an auth route
    const isAuthRoute =
      authRoutePaths.some(route => pathname?.startsWith(route)) ||
      segments.some(seg => authRouteSegments.includes(seg.toLowerCase()));

    // Don't show on root/index screen (welcome/onboarding)
    if ((pathname as any) === '/' || (pathname as any) === '/index' || (segments as any).length === 0 || ((segments as any).length === 1 && (segments as any)[0] === 'index')) {
      return false;
    }

    // If on auth route, never show
    if (isAuthRoute) {
      return false;
    }

    // Hide entirely on any Bible-related routes (onboarding + reader),
    // so mini player is not visible there at all.
    const bibleRouteSegments = ['bible', 'biblescreen', 'bibleonboarding', 'reader'];
    const inBibleRoute = segments.some(seg =>
      bibleRouteSegments.includes(seg.toLowerCase())
    );
    if (inBibleRoute) {
      return false;
    }

    // Hide on upload screen so it doesn't block the upload form,
    // but keep audio playing in the background.
    if (pathname?.startsWith("/categories/upload")) {
      return false;
    }

    // If there's a current track, ALWAYS show the player (even if auth is still loading)
    // This allows the player to appear immediately when a song starts playing
    if (currentTrack) {
      // console.log("🎵 FloatingAudioPlayer: Showing because currentTrack exists:", currentTrack.title);
      return true;
    }

    // If no track, only show if fully authenticated (but this shouldn't happen since we return null if no track)
    // This is just for safety - the component will return null anyway if no track
    return false;
  }, [isSignedIn, clerkLoaded, user, userLoading, pathname, segments, currentTrack]);

  // Debug: Log when track changes
  useEffect(() => {
    // console.log("🎵 FloatingAudioPlayer Debug:", {
    //   hasCurrentTrack: !!currentTrack,
    //   currentTrackTitle: currentTrack?.title,
    //   shouldShowPlayer,
    //   isSignedIn,
    //   clerkLoaded,
    //   hasUser: !!user,
    //   userLoading,
    //   pathname,
    //   segments,
    // });
  }, [currentTrack, shouldShowPlayer, isSignedIn, clerkLoaded, user, userLoading, pathname, segments]);

  // Fade-in and slide-up animation when track appears
  useEffect(() => {
    // If we're on any Bible route, force-stop audio so nothing plays in background
    const bibleRouteSegments = ['bible', 'biblescreen', 'bibleonboarding', 'reader'];
    const inBibleRoute = segments.some(seg =>
      bibleRouteSegments.includes(seg.toLowerCase())
    );
    if (inBibleRoute && currentTrack) {
      stop();
      return;
    }

    if (currentTrack && shouldShowPlayer) {
      // Animate in
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
      // Animate out
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
  }, [currentTrack, shouldShowPlayer]);

  // Format time helper
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Pan responder for swipe down to dismiss (player sits above bottom nav)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panY.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Only allow downward swipe (to dismiss)
          panY.current = gestureState.dy;
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80) {
          // Dismiss if swiped down more than 80px
          Animated.timing(translateY, {
            toValue: MINI_PLAYER_HEIGHT + 20,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            // Clear global audio so mini player is fully dismissed
            clear();
          });
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
        panY.current = 0;
      },
    })
  ).current;

  // Don't render if user not authenticated or on auth screens
  if (!shouldShowPlayer) {
    // console.log("🎵 FloatingAudioPlayer: Not showing - shouldShowPlayer is false");
    return null;
  }

  // Don't render if no track is loaded
  if (!currentTrack) {
    // console.log("🎵 FloatingAudioPlayer: Not showing - no currentTrack");
    return null;
  }

  // console.log("🎵 FloatingAudioPlayer: Rendering with track:", currentTrack.title);

  return (
    <>
      {/* Floating Mini Player - Centered notification box with curvy edges */}
      <Animated.View
        style={[
          styles.container,
          {
            // Sit comfortably above the bottom nav / plus actions
            bottom: getBottomNavHeight() + 56,
            opacity: fadeAnim,
            transform: [
              {
                translateY: Animated.add(translateY, slideAnim) // Combine swipe gesture with slide-in animation
              },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Enhanced Glassmorphism Background */}
        <BlurView
          intensity={95}
          tint="light"
          style={StyleSheet.absoluteFill}
        />

        {/* Glassmorphism Overlay with app colors */}
        <View style={styles.glassOverlay} />

        {/* Dynamic Glow Effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: isPlaying ? 0.2 : 0.05,
              transform: [{ scale: isPlaying ? 1.8 : 1.2 }]
            }
          ]}
        />

        {/* Subtle gradient accent using app colors */}
        <View style={styles.gradientAccent} />

        {/* Content */}
        <View style={styles.content}>
          {/* Thumbnail */}
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
            {/* Play indicator overlay */}
            {isPlaying && (
              <View style={styles.playIndicator}>
                <View style={styles.playIndicatorDot} />
              </View>
            )}
          </TouchableOpacity>

          {/* Track Info */}
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

          {/* Controls */}
          <View style={styles.controls}>
            {/* Previous Button */}
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

            {/* Play/Pause Button - Jevah Green */}
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

            {/* Next Button */}
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

            {/* Close mini player */}
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

      {/* Full Player Modal */}
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

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16, // More breathing room
    right: 16,
    height: MINI_PLAYER_HEIGHT + 4, // Slightly taller
    zIndex: 100, // Top priority
    overflow: "hidden",
    borderRadius: 32, // More circular edges
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.15)", // Very translucent
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 32,
  },
  glowEffect: {
    position: "absolute",
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    opacity: 0.25,
    filter: "blur(20px)", // Native blur if supported
  },
  gradientAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    opacity: 0.8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: "100%",
  },
  thumbnailContainer: {
    marginRight: 12,
    position: "relative",
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  playIndicator: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: UI_CONFIG.COLORS.SECONDARY,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: UI_CONFIG.COLORS.SECONDARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  playIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#FFFFFF",
  },
  trackInfo: {
    flex: 1,
    marginRight: 8,
  },
  trackTitle: {
    fontSize: 15,
    fontFamily: "Rubik-SemiBold",
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  trackArtist: {
    fontSize: 12,
    fontFamily: "Rubik",
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: 1,
    opacity: 0.8,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeButton: {
    padding: 6,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 16,
    marginLeft: 4,
  },
  controlButton: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI_CONFIG.COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: UI_CONFIG.COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

