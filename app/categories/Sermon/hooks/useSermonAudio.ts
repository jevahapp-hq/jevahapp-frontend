/**
 * Sermon tab audio is the app-wide playback session.
 * Cards command it; this hook only reports what is current.
 */
import { useCallback } from "react";
import { useGlobalAudioPlayerStore } from "../../../store/useGlobalAudioPlayerStore";
import { playOrToggleTrack } from "../../../../src/shared/audio/playOrToggleTrack";

export function useSermonAudio() {
  const currentTrack = useGlobalAudioPlayerStore((s) => s.currentTrack);
  const isPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const progress = useGlobalAudioPlayerStore((s) => s.progress);
  const isLoading = useGlobalAudioPlayerStore((s) => s.isLoading);
  const isMuted = useGlobalAudioPlayerStore((s) => s.isMuted);

  const isFeedSession = currentTrack?.source === "feed";
  const playingAudioId =
    isFeedSession && isPlaying ? currentTrack?.id ?? null : null;
  const audioProgressMap =
    isFeedSession && currentTrack?.id
      ? { [currentTrack.id]: progress }
      : {};

  const playAudio = useCallback(async (uri: string, id: string, title?: string) => {
    if (!uri || !id) return;
    await playOrToggleTrack({
      id,
      title: title || "Sermon",
      artist: "",
      audioUrl: uri,
      thumbnailUrl: "",
      duration: 0,
      source: "feed",
    });
  }, []);

  return {
    isLoadingAudio: isFeedSession ? isLoading : false,
    soundMap: {},
    playingAudioId,
    audioProgressMap,
    audioDurationMap: {},
    audioMuteMap: playingAudioId
      ? { [playingAudioId]: isMuted }
      : {},
    playAudio,
  };
}
