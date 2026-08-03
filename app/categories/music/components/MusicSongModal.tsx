import CopyrightFreeSongModal from "../../../components/CopyrightFreeSongModal";
import { useGlobalAudioPlayerStore } from "../../../store/useGlobalAudioPlayerStore";
import { formatTimeMs } from "../musicFormatters";

type MusicSongModalProps = {
  visible: boolean;
  selectedSong: any;
  songModalInitialAction: "options" | "playlist" | null;
  currentTrack: any;
  globalIsPlaying: boolean;
  globalProgress: number;
  globalDuration: number;
  globalPosition: number;
  globalIsMuted: boolean;
  onClose: () => void;
  onPlay: (song: any) => Promise<void>;
  onTogglePlayPause: () => Promise<void>;
};

export function MusicSongModal({
  visible,
  selectedSong,
  songModalInitialAction,
  currentTrack,
  globalIsPlaying,
  globalProgress,
  globalDuration,
  globalPosition,
  globalIsMuted,
  onClose,
  onPlay,
  onTogglePlayPause,
}: MusicSongModalProps) {
  if (!selectedSong) return null;

  return (
    <CopyrightFreeSongModal
      visible={visible}
      song={
        songModalInitialAction === "options"
          ? selectedSong
          : (currentTrack ?? selectedSong)
      }
      variant={songModalInitialAction === "options" ? "options" : "player"}
      onClose={onClose}
      onPlay={onPlay}
      isPlaying={
        selectedSong
          ? currentTrack?.id === selectedSong.id && globalIsPlaying
          : false
      }
      audioProgress={
        selectedSong && currentTrack?.id === selectedSong.id
          ? globalProgress
          : 0
      }
      audioDuration={
        selectedSong && currentTrack?.id === selectedSong.id
          ? globalDuration
          : selectedSong?.duration * 1000 || 0
      }
      audioPosition={
        selectedSong && currentTrack?.id === selectedSong.id
          ? globalPosition
          : 0
      }
      isMuted={
        selectedSong && currentTrack?.id === selectedSong.id
          ? globalIsMuted
          : false
      }
      onTogglePlay={async () => {
        if (selectedSong) {
          if (currentTrack?.id === selectedSong.id) {
            await onTogglePlayPause();
          } else {
            await onPlay(selectedSong);
          }
        }
      }}
      onToggleMute={async () => {
        if (selectedSong && currentTrack?.id === selectedSong.id) {
          await useGlobalAudioPlayerStore.getState().toggleMute();
        }
      }}
      onSeek={async (progress) => {
        if (selectedSong && currentTrack?.id === selectedSong.id) {
          await useGlobalAudioPlayerStore.getState().seekToProgress(progress);
        }
      }}
      formatTime={formatTimeMs}
      initialAction={songModalInitialAction}
    />
  );
}
