import { useAuth } from "@clerk/clerk-expo";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter, useSegments } from "expo-router";
import React, { useEffect, useRef, useMemo } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserProfile } from "../hooks/useUserProfile";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import { UI_CONFIG } from "../../src/shared/constants";
import { getBottomNavHeight } from "../utils/responsive";
import CopyrightFreeSongModal from "./CopyrightFreeSongModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MINI_PLAYER_HEIGHT = 64;

export default function FloatingAudioPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { user, loading: userLoading } = useUserProfile();
  const [showFullPlayer, setShowFullPlayer] = React.useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const panY = useRef(0);

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
    if (pathname === '/' || pathname === '/index' || segments.length === 0 || (segments.length === 1 && segments[0] === 'index')) {
      return false;
    }
    
    // If on auth route, never show
    if (isAuthRoute) {
      return false;
    }
    
    // If there's a current track, ALWAYS show the player (even if auth is still loading)
    // This allows the player to appear immediately when a song starts playing
    if (currentTrack) {
      console.log("🎵 FloatingAudioPlayer: Showing because currentTrack exists:", currentTrack.title);
      return true;
    }
    
    // If no track, only show if fully authenticated (but this shouldn't happen since we return null if no track)
    // This is just for safety - the component will return null anyway if no track
    return false;
  }, [isSignedIn, clerkLoaded, user, userLoading, pathname, segments, currentTrack]);

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
  } = useGlobalAudioPlayerStore();

  // Debug: Log when track changes
  useEffect(() => {
    console.log("🎵 FloatingAudioPlayer Debug:", {
      hasCurrentTrack: !!currentTrack,
      currentTrackTitle: currentTrack?.title,
      shouldShowPlayer,
      isSignedIn,
      clerkLoaded,
      hasUser: !!user,
      userLoading,
      pathname,
      segments,
    });
  }, [currentTrack, shouldShowPlayer, isSignedIn, clerkLoaded, user, userLoading, pathname, segments]);

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
            stop();
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
    console.log("🎵 FloatingAudioPlayer: Not showing - shouldShowPlayer is false");
    return null;
  }

  // Don't render if no track is loaded
  if (!currentTrack) {
    console.log("🎵 FloatingAudioPlayer: Not showing - no currentTrack");
    return null;
  }

  console.log("🎵 FloatingAudioPlayer: Rendering with track:", currentTrack.title);

  return (
    <>
      {/* Floating Mini Player - Bottom Position just above Upload / Live bar */}
      <Animated.View
        style={[
          styles.container,
          {
            bottom: getBottomNavHeight() + 8, // 8px gap above bottom nav
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <BlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        
        {/* Glassmorphism Background Overlay */}
        <View style={styles.glassOverlay} />
        
        {/* Content */}
        <View style={styles.content}>
          {/* Thumbnail */}
          <TouchableOpacity
            onPress={() => setShowFullPlayer(true)}
            style={styles.thumbnailContainer}
          >
            <Image
              source={currentTrack.thumbnailUrl}
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

            {/* Play/Pause Button */}
            <TouchableOpacity
              onPress={togglePlayPause}
              style={styles.playButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={18}
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
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    zIndex: 9999, // High z-index to appear above bottom nav and other content
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.3)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    height: "100%",
  },
  thumbnailContainer: {
    marginRight: UI_CONFIG.SPACING.MD,
    position: "relative",
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  playIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.COLORS.SECONDARY,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  playIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  trackInfo: {
    flex: 1,
    marginRight: UI_CONFIG.SPACING.SM,
  },
  trackTitle: {
    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
    fontFamily: "Rubik-SemiBold",
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    textShadowColor: "rgba(255, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  trackArtist: {
    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
    fontFamily: "Rubik",
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: 2,
    textShadowColor: "rgba(255, 255, 255, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: UI_CONFIG.SPACING.XS,
  },
  controlButton: {
    padding: 6,
    borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: UI_CONFIG.COLORS.SECONDARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: UI_CONFIG.COLORS.SECONDARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});

