/**
 * Root-level copyright-free player (TikTok / IG pattern).
 * In-tree overlay — no native Modal window on first tap.
 */
import { useCallback, useEffect } from "react";
import { useCopyrightFreeOverlayStore } from "../store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import CopyrightFreeSongModal from "./CopyrightFreeSongModal";
import { playCopyrightFreeSong } from "./CopyrightFreeSongs/hooks/useCopyrightFreeSongsPlayback";

const formatTime = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function CopyrightFreeSongOverlayHost() {
  const visible = useCopyrightFreeOverlayStore((s) => s.visible);
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

  const handlePlay = useCallback(
    (next: any) => {
      void playCopyrightFreeSong(next, songs);
    },
    [songs]
  );

  const handleClose = useCallback(() => {
    useCopyrightFreeOverlayStore.getState().close();
  }, []);

  const handleSeek = useCallback(
    async (progressValue: number) => {
      const store = useGlobalAudioPlayerStore.getState();
      const songId = song?.id || song?._id;
      const isSame = !!songId && store.currentTrack?.id === songId;
      if (!isSame) {
        await playCopyrightFreeSong(song, songs);
      }
      await useGlobalAudioPlayerStore.getState().seekToProgress(progressValue);
    },
    [song, songs]
  );

  useEffect(() => {
    if (!visible || !currentTrack) return;
    const match = songs.find(
      (s) => s.id === currentTrack.id || s._id === currentTrack.id
    );
    if (match && (song?.id || song?._id) !== currentTrack.id) {
      useCopyrightFreeOverlayStore.getState().setSong(match);
    }
  }, [visible, currentTrack?.id, songs, song?.id, song?._id]);

  if (!song) return null;

  const songId = song.id || song._id;
  const isCurrent = !!songId && currentTrack?.id === songId;

  return (
    <CopyrightFreeSongModal
      presentation="overlay"
      visible={visible}
      song={song}
      variant={initialAction === "options" ? "options" : "player"}
      initialAction={initialAction}
      onClose={handleClose}
      onPlay={handlePlay}
      isPlaying={isCurrent && isPlaying}
      audioProgress={isCurrent ? Math.max(0, Math.min(1, progress || 0)) : 0}
      audioDuration={
        isCurrent ? duration : (song?.duration ?? 0) * 1000 || 0
      }
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
      formatTime={formatTime}
    />
  );
}
