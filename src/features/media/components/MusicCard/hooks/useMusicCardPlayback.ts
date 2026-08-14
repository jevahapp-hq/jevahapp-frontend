/**
 * Feed audio card is a view of the app-wide playback session.
 * It never creates its own expo-av Sound.
 */
import { useCallback, useState } from "react";
import { useGlobalAudioPlayerStore } from "../../../../../../app/store/useGlobalAudioPlayerStore";
import {
  mapMediaItemToTrack,
  resolveMediaAudioUrl,
} from "../../../../../shared/audio/mapToAudioTrack";
import { playOrToggleTrack } from "../../../../../shared/audio/playOrToggleTrack";
import type { MediaItem } from "../../../../../shared/types";

export function useMusicCardPlayback(audio: MediaItem, index: number) {
  const [attemptedPlay, setAttemptedPlay] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const audioUrl = resolveMediaAudioUrl(audio);
  const audioId = String(audio._id || `music-${index}`);

  const currentTrackId = useGlobalAudioPlayerStore((s) => s.currentTrack?.id);
  const isPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const progress = useGlobalAudioPlayerStore((s) => s.progress);
  const position = useGlobalAudioPlayerStore((s) => s.position);
  const duration = useGlobalAudioPlayerStore((s) => s.duration);
  const isMuted = useGlobalAudioPlayerStore((s) => s.isMuted);
  const isLoading = useGlobalAudioPlayerStore((s) => s.isLoading);

  const isCurrent = currentTrackId === audioId;

  const handlePlayPress = useCallback(async () => {
    const track = mapMediaItemToTrack(audio, "feed");
    if (!track) return;
    setAttemptedPlay(true);
    await playOrToggleTrack(track);
  }, [audio]);

  const seekBySeconds = useCallback(
    async (deltaSec: number) => {
      if (!isCurrent) return;
      const store = useGlobalAudioPlayerStore.getState();
      const dur = store.duration || 0;
      if (dur <= 0) return;
      const nextMs = Math.max(
        0,
        Math.min((store.position || 0) + deltaSec * 1000, dur)
      );
      await store.seek(nextMs);
    },
    [isCurrent]
  );

  const onSeekToPercent = useCallback(
    async (pct: number) => {
      const clamped = Math.max(0, Math.min(pct, 1));
      const store = useGlobalAudioPlayerStore.getState();
      if (!isCurrent) {
        const track = mapMediaItemToTrack(audio, "feed");
        if (!track) return;
        await playOrToggleTrack(track);
      }
      await useGlobalAudioPlayerStore.getState().seekToProgress(clamped);
    },
    [audio, isCurrent]
  );

  const toggleMute = useCallback(async () => {
    if (!isCurrent) return;
    await useGlobalAudioPlayerStore.getState().toggleMute();
  }, [isCurrent]);

  return {
    audioUrl,
    audioId,
    attemptedPlay,
    showOverlay,
    setShowOverlay,
    isCurrent,
    isPlaying: isCurrent && isPlaying,
    isLoading: isCurrent && isLoading,
    progress: isCurrent ? progress : 0,
    position: isCurrent ? position : 0,
    duration: isCurrent ? duration : Number(audio.duration) * 1000 || 0,
    isMuted: isCurrent ? isMuted : false,
    hasDuration: isCurrent ? duration > 0 : Number(audio.duration) > 0,
    handlePlayPress,
    seekBySeconds,
    onSeekToPercent,
    toggleMute,
  };
}
