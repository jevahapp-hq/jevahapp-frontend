/**
 * Full player. Native Modal so nothing in the app tree can eat the chevron
 * or swipe. Unmount on minimize — audio keeps playing on the mini bar.
 */
import { useCallback, useEffect } from "react";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import CopyrightFreeSongModal from "@/components/CopyrightFreeSongModal";
import { playCopyrightFreeSong } from "./CopyrightFreeSongs/hooks/useCopyrightFreeSongsPlayback";

function formatClock(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function CopyrightFreeSongOverlayHost() {
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

  const overlaySongId = song?.id || song?._id;
  const isCurrent = !!overlaySongId && currentTrack?.id === overlaySongId;
  const isFull = surface === "full";

  const handlePlay = useCallback(
    (next: any) => {
      void playCopyrightFreeSong(next, songs);
    },
    [songs]
  );

  const handleMinimize = useCallback(() => {
    useCopyrightFreeOverlayStore.getState().minimize();
  }, []);

  const handleSeek = useCallback(
    (progressValue: number) => {
      const store = useGlobalAudioPlayerStore.getState();
      const id = song?.id || song?._id;
      const isSame = !!id && store.currentTrack?.id === id;
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
    if (match && (song?.id || song?._id) !== currentTrack.id) {
      useCopyrightFreeOverlayStore.getState().setSong(match);
    }
  }, [isFull, currentTrack?.id, songs, song?.id, song?._id]);

  if (!song || !isFull) return null;

  return (
    <CopyrightFreeSongModal
      presentation="modal"
      visible
      song={song}
      variant={initialAction === "options" ? "options" : "player"}
      initialAction={initialAction}
      onClose={handleMinimize}
      onPlay={handlePlay}
      isPlaying={isCurrent && isPlaying}
      audioProgress={isCurrent ? Math.max(0, Math.min(1, progress || 0)) : 0}
      audioDuration={isCurrent ? duration : (song?.duration ?? 0) * 1000 || 0}
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
  );
}
