/**
 * Full-screen now playing. Native Modal is required so this sits above
 * Android's native screen window — an in-tree overlay is painted behind
 * the Music tab, which made taps look like they only started audio.
 */
import { useCallback, useEffect } from "react";
import {
  BackHandler,
  Modal,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { stopAndDismissNowPlaying } from "@/shared/audio/stopNowPlaying";
import { setFullscreenBackExit } from "@/features/media/video-feed/fullscreenBackSession";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import CopyrightFreeSongModal from "@/components/CopyrightFreeSongModal";
import { playCopyrightFreeSong } from "./CopyrightFreeSongs/hooks/useCopyrightFreeSongsPlayback";

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

export default function CopyrightFreeSongOverlayHost() {
  const insets = useSafeAreaInsets();
  const surface = useCopyrightFreeOverlayStore((s) => s.surface);
  const song = useCopyrightFreeOverlayStore((s) => s.song);
  const songs = useCopyrightFreeOverlayStore((s) => s.songs);
  const initialAction = useCopyrightFreeOverlayStore((s) => s.initialAction);

  const currentTrack = useGlobalAudioPlayerStore((s) => s.currentTrack);
  const isPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const isMuted = useGlobalAudioPlayerStore((s) => s.isMuted);
  const togglePlayPause = useGlobalAudioPlayerStore((s) => s.togglePlayPause);

  const isCurrent = sameTrack(song, currentTrack);
  const isFull = surface === "full" && !!song;

  const handlePlay = useCallback(
    (next: any) => {
      void playCopyrightFreeSong(next, songs);
    },
    [songs]
  );

  const handleStopAndDismiss = useCallback(() => {
    stopAndDismissNowPlaying();
  }, []);

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
    if (sameTrack(song, currentTrack)) return;
    const match = songs.find(
      (s) => s.id === currentTrack.id || s._id === currentTrack.id
    );
    useCopyrightFreeOverlayStore.getState().setSong(match ?? currentTrack);
  }, [isFull, currentTrack?.id, songs, song?.id, song?._id]);

  useEffect(() => {
    if (!isFull) return;
    useGlobalVideoStore.getState().pauseAllVideosImperatively();
    setFullscreenBackExit(handleStopAndDismiss);
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleStopAndDismiss();
      return true;
    });
    return () => {
      setFullscreenBackExit(null);
      sub.remove();
    };
  }, [isFull, handleStopAndDismiss]);

  const top =
    (insets.top || StatusBar.currentHeight || 12) + 4 + 4;

  return (
    <Modal
      visible={isFull}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleStopAndDismiss}
      statusBarTranslucent
      hardwareAccelerated
      supportedOrientations={["portrait"]}
    >
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        {song ? (
          <CopyrightFreeSongModal
            presentation="inline"
            visible
            song={song}
            variant={initialAction === "options" ? "options" : "player"}
            initialAction={initialAction}
            onClose={handleStopAndDismiss}
            onPlay={handlePlay}
            isPlaying={isCurrent && isPlaying}
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
        ) : null}
        <View
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
          collapsable={false}
        >
          <View
            collapsable={false}
            accessibilityRole="button"
            accessibilityLabel="Close player"
            onStartShouldSetResponder={() => true}
            onResponderGrant={handleStopAndDismiss}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#07110F",
  },
});
