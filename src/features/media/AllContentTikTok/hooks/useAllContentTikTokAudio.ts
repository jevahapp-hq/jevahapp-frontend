/**
 * Feed audio is the app-wide playback session.
 * This hook only reports the current feed track and pauses it when asked.
 * Do not subscribe to progress here — that would re-render the whole feed
 * several times a second. MusicCard reads the playback clock locally.
 */
import { useCallback } from "react";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { pausePlaybackSession } from "../../../../shared/audio/playOrToggleTrack";

export function useAllContentTikTokAudio() {
  const currentTrack = useGlobalAudioPlayerStore((s) => s.currentTrack);
  const isPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);

  const isFeedSession = currentTrack?.source === "feed";
  const playingAudioId = isFeedSession && isPlaying ? currentTrack?.id ?? null : null;

  const pauseAllAudio = useCallback(async () => {
    const track = useGlobalAudioPlayerStore.getState().currentTrack;
    if (track?.source === "feed") {
      await pausePlaybackSession();
    }
  }, []);

  const playAudio = useCallback(async (_uri: string, _id: string) => {
    // MusicCard commands the session directly. Kept for call-site compatibility.
  }, []);

  return {
    isLoadingAudio: false,
    soundMap: {},
    playingAudioId,
    pausedAudioMap: {},
    playAudio,
    pauseAllAudio,
  };
}
