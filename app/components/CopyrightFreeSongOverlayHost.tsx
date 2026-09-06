/**
 * Full player is a root overlay, not a native Android Modal window.
 * Minimize synchronously unmounts it; audio keeps playing on the mini bar.
 *
 * Chevron taps use a last-child 64px hit target (box-none elsewhere) because
 * Android elevation on album art / pan responders steal Pressable taps.
 */
import { useCallback, useEffect, useMemo } from "react";
import {
  BackHandler,
  Dimensions,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { trackDurationToMs } from "@/store/audioPlayer/resolveAudioDurationMs";
import CopyrightFreeSongModal from "@/components/CopyrightFreeSongModal";
import { playCopyrightFreeSong } from "./CopyrightFreeSongs/hooks/useCopyrightFreeSongsPlayback";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SWIPE_DISMISS_DISTANCE = 64;
const SWIPE_DISMISS_VELOCITY = 550;
const OFFSCREEN_Y = SCREEN_HEIGHT * 1.5;

function formatClock(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function sameTrack(song: any, track: { id?: string } | null): boolean {
  if (!song || !track?.id) return false;
  return track.id === song.id || track.id === song._id;
}

function minimizePlayer() {
  useCopyrightFreeOverlayStore.getState().minimize();
}

export default function CopyrightFreeSongOverlayHost() {
  const insets = useSafeAreaInsets();
  const surface = useCopyrightFreeOverlayStore((s) => s.surface);
  const song = useCopyrightFreeOverlayStore((s) => s.song);
  const songs = useCopyrightFreeOverlayStore((s) => s.songs);
  const initialAction = useCopyrightFreeOverlayStore((s) => s.initialAction);

  const currentTrack = useGlobalAudioPlayerStore((s) => s.currentTrack);
  const isPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const progress = useGlobalAudioPlayerStore((s) => s.progress);
  const duration = useGlobalAudioPlayerStore((s) => s.duration);
  const position = useGlobalAudioPlayerStore((s) => s.position);
  const isMuted = useGlobalAudioPlayerStore((s) => s.isMuted);
  const togglePlayPause = useGlobalAudioPlayerStore((s) => s.togglePlayPause);
  const translateY = useSharedValue(0);

  const isCurrent = sameTrack(song, currentTrack);
  const isFull = surface === "full";
  const engineDuration =
    isCurrent && duration > 0 ? duration : trackDurationToMs(song?.duration);
  const engineProgress =
    isCurrent && engineDuration > 0
      ? Math.max(0, Math.min(1, position / engineDuration))
      : isCurrent
        ? Math.max(0, Math.min(1, progress || 0))
        : 0;

  const handlePlay = useCallback(
    (next: any) => {
      void playCopyrightFreeSong(next, songs);
    },
    [songs]
  );

  const handleMinimize = useCallback(() => {
    // Move the surface out of sight before React runs socket/player cleanup.
    translateY.value = OFFSCREEN_Y;
    minimizePlayer();
  }, [translateY]);

  const finishSwipeDismiss = useCallback(() => {
    minimizePlayer();
  }, []);

  const dismissGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((event) => {
          translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const shouldDismiss =
            event.translationY > SWIPE_DISMISS_DISTANCE ||
            event.velocityY > SWIPE_DISMISS_VELOCITY;
          if (shouldDismiss) {
            // Never wait for an animation completion callback. Move fully out
            // of the viewport on the UI thread and switch to mini immediately.
            translateY.value = OFFSCREEN_Y;
            runOnJS(finishSwipeDismiss)();
            return;
          }
          translateY.value = withSpring(0, {
            damping: 20,
            stiffness: 280,
          });
        }),
    [finishSwipeDismiss, translateY]
  );

  const surfaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSeek = useCallback(
    (progressValue: number) => {
      const store = useGlobalAudioPlayerStore.getState();
      const isSame = sameTrack(song, store.currentTrack);
      if (!isSame) {
        void playCopyrightFreeSong(song, songs).then(() => {
          void useGlobalAudioPlayerStore.getState().seekToProgress(progressValue);
        });
        return;
      }
      void store.seekToProgress(progressValue);
    },
    [song, songs]
  );

  useEffect(() => {
    if (!isFull || !currentTrack) return;
    const match = songs.find(
      (s) => s.id === currentTrack.id || s._id === currentTrack.id
    );
    if (match && !sameTrack(song, currentTrack)) {
      useCopyrightFreeOverlayStore.getState().setSong(match);
    }
  }, [isFull, currentTrack?.id, songs, song?.id, song?._id]);

  useEffect(() => {
    if (!isFull) return;
    translateY.value = 0;
    // A hidden feed video must not keep producing timeUpdate renders behind
    // the full audio player. Besides wasting work, that can delay JS taps.
    useGlobalVideoStore.getState().pauseAllVideosImperatively();
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      minimizePlayer();
      return true;
    });
    return () => sub.remove();
  }, [isFull, translateY]);

  if (!song || !isFull) return null;

  const top =
    (insets.top || StatusBar.currentHeight || 12) + 4 + 4;

  return (
    <GestureDetector gesture={dismissGesture}>
      <Animated.View
        accessibilityViewIsModal
        collapsable={false}
        style={[styles.root, surfaceStyle]}
      >
        <StatusBar barStyle="light-content" />
        <CopyrightFreeSongModal
          presentation="inline"
          visible
          song={song}
          variant={initialAction === "options" ? "options" : "player"}
          initialAction={initialAction}
          onClose={handleMinimize}
          onPlay={handlePlay}
          isPlaying={isCurrent && isPlaying}
          audioProgress={engineProgress}
          audioDuration={engineDuration}
          audioPosition={isCurrent ? position : 0}
          isMuted={isCurrent ? isMuted : false}
          onTogglePlay={() => {
            if (isCurrent) {
              void togglePlayPause();
            } else {
              void playCopyrightFreeSong(song, songs);
            }
          }}
          onToggleMute={() => {
            if (isCurrent) {
              void useGlobalAudioPlayerStore.getState().toggleMute();
            }
          }}
          onSeek={(progressValue) => {
            void handleSeek(progressValue);
          }}
          formatTime={formatClock}
        />
        <View
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
          collapsable={false}
        >
          <View
            collapsable={false}
            accessibilityRole="button"
            accessibilityLabel="Minimize player"
            onStartShouldSetResponder={() => true}
            onResponderGrant={handleMinimize}
            style={{
              position: "absolute",
              top,
              left: 16,
              width: 64,
              height: 64,
              zIndex: 2,
            }}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0A0D14",
    zIndex: 100000,
    elevation: 100,
  },
});
