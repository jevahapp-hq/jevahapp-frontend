/**
 * Library audio is the app-wide playback session.
 * Video tiles are posters — tap opens Reels, they do not mount a player.
 */
import { useCallback, useRef, useState } from "react";
import { useGlobalAudioPlayerStore } from "../../../../store/useGlobalAudioPlayerStore";
import { playOrToggleTrack } from "../../../../../src/shared/audio/playOrToggleTrack";

export function useAllLibraryPlayback() {
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Record<string, any>>({});

  const currentTrackId = useGlobalAudioPlayerStore((s) => s.currentTrack?.id);
  const currentSource = useGlobalAudioPlayerStore((s) => s.currentTrack?.source);
  const isPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const progress = useGlobalAudioPlayerStore((s) => s.progress);
  const duration = useGlobalAudioPlayerStore((s) => s.duration);
  const position = useGlobalAudioPlayerStore((s) => s.position);
  const isMuted = useGlobalAudioPlayerStore((s) => s.isMuted);

  const playingAudio =
    currentSource === "library" && isPlaying ? currentTrackId : null;

  const togglePlay = useCallback(
    (
      _itemId: string,
      _setShowOverlay: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    ) => {
      // Video tiles navigate to Reels from AllLibrary; no local decoder.
    },
    []
  );

  const seekVideo = useCallback(async (_itemId: string, _progressValue: number) => {
    // no local video player
  }, []);

  const toggleAudioPlay = useCallback(
    async (itemId: string, fileUrl: string, title?: string) => {
      if (!itemId || !fileUrl) return;
      await playOrToggleTrack({
        id: itemId,
        title: title || "Library",
        artist: "",
        audioUrl: fileUrl,
        thumbnailUrl: "",
        duration: 0,
        source: "library",
      });
    },
    []
  );

  const toggleAudioMute = useCallback(async () => {
    const track = useGlobalAudioPlayerStore.getState().currentTrack;
    if (track?.source !== "library") return;
    await useGlobalAudioPlayerStore.getState().toggleMute();
  }, []);

  const seekAudio = useCallback(async (itemId: string, progressValue: number) => {
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id !== itemId) return;
    await store.seekToProgress(Math.max(0, Math.min(1, progressValue)));
  }, []);

  return {
    playingVideos,
    setPlayingVideos,
    playingAudio,
    videoRefs,
    audioRefs: { current: {} as Record<string, any> },
    audioProgress:
      playingAudio && currentTrackId ? { [currentTrackId]: progress } : {},
    audioDuration:
      playingAudio && currentTrackId ? { [currentTrackId]: duration } : {},
    audioPosition:
      playingAudio && currentTrackId ? { [currentTrackId]: position } : {},
    audioMuted:
      playingAudio && currentTrackId ? { [currentTrackId]: isMuted } : {},
    togglePlay,
    seekVideo,
    toggleAudioPlay,
    toggleAudioMute,
    seekAudio,
  };
}
