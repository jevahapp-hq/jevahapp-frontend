/**
 * useAllContentTikTokAudio
 * Coordinates which MusicCard/sermon audio is active in AllContentTikTok.
 * Playback itself lives in MusicCard (useAdvancedAudioPlayer); this hook only
 * tracks the active id so scroll viewability can pause out-of-view audio.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAllContentTikTokAudioParams {
  playMedia: (key: string, type: "video" | "audio") => void;
  playingVideos: Record<string, boolean>;
}

export function useAllContentTikTokAudio({
  playMedia: _playMedia,
  playingVideos: _playingVideos,
}: UseAllContentTikTokAudioParams) {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  // Kept for ContentItemRenderer / MusicCard progress props (local player owns progress).
  const [audioProgressMap] = useState<Record<string, number>>({});

  const playingAudioIdRef = useRef<string | null>(null);

  useEffect(() => {
    playingAudioIdRef.current = playingAudioId;
  }, [playingAudioId]);

  const pauseAllAudio = useCallback(async () => {
    setPlayingAudioId(null);
  }, []);

  /**
   * Register the active MusicCard audio id. Does not create a second expo-av
   * Sound — MusicCard already plays via useAdvancedAudioPlayer. Calling
   * playMediaGlobally here would also toggle-off the same key.
   */
  const playAudio = useCallback(async (_uri: string, id: string) => {
    if (!id) return;
    setPlayingAudioId(id);
  }, []);

  return {
    isLoadingAudio: false,
    soundMap: {} as Record<string, never>,
    playingAudioId,
    pausedAudioMap: {} as Record<string, number>,
    audioProgressMap,
    audioDurationMap: {} as Record<string, number>,
    audioMuteMap: {} as Record<string, boolean>,
    playAudio,
    pauseAllAudio,
  };
}
