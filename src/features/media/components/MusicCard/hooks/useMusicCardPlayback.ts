/**
 * Feed audio card is a view of the app-wide playback session.
 * It never creates its own expo-audio player.
 */
import { useCallback, useState } from "react";
import { getAudioPlaybackClock } from "@/store/audioPlayer/audioProgressStore";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import {
  mapMediaItemToTrack,
  resolveMediaAudioUrl,
} from "../../../../../shared/audio/mapToAudioTrack";
import { playOrToggleTrack } from "../../../../../shared/audio/playOrToggleTrack";
import { resolvePlaybackQueue } from "../../../../../shared/audio/sessionAudioQueue";
import { getUserDisplayNameFromContent } from "../../../../../shared/utils";
import type { MediaItem } from "../../../../../shared/types";

function mediaItemToNowPlaying(audio: MediaItem) {
  const track = mapMediaItemToTrack(audio, "feed");
  if (!track) return null;
  const thumb = audio.imageUrl || audio.thumbnailUrl;
  return {
    ...track,
    _id: track.id,
    fileUrl: track.audioUrl,
    thumbnailUrl:
      typeof thumb === "string" ? thumb : (thumb as any)?.uri || track.thumbnailUrl,
    artist: track.artist || getUserDisplayNameFromContent(audio) || "Unknown Artist",
    contentType: audio.contentType || "music",
    source: "feed" as const,
  };
}

export function useMusicCardPlayback(audio: MediaItem, index: number) {
  const [attemptedPlay, setAttemptedPlay] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const audioUrl = resolveMediaAudioUrl(audio);
  const audioId = String(audio._id || `music-${index}`);

  const currentTrackId = useGlobalAudioPlayerStore((s) => s.currentTrack?.id);
  const isPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const isMuted = useGlobalAudioPlayerStore((s) => s.isMuted);
  const isLoading = useGlobalAudioPlayerStore((s) => s.isLoading);

  const isCurrent = currentTrackId === audioId;

  const handlePlayPress = useCallback(async () => {
    const track = mapMediaItemToTrack(audio, "feed");
    if (!track) return;
    setAttemptedPlay(true);
    const nowPlaying = mediaItemToNowPlaying(audio);
    const queue = resolvePlaybackQueue(track);
    if (nowPlaying) {
      useCopyrightFreeOverlayStore.getState().open(
        {
          ...nowPlaying,
        },
        {
          queue: queue.map((t) => ({
            id: t.id,
            _id: t.id,
            title: t.title,
            artist: t.artist,
            thumbnailUrl: t.thumbnailUrl,
            audioUrl: t.audioUrl,
            duration: t.duration,
            source: t.source,
          })),
        }
      );
    }
    if (currentTrackId === audioId && isPlaying) {
      return;
    }
    await playOrToggleTrack(track, { queue });
  }, [audio, audioId, currentTrackId, isPlaying]);

  const seekBySeconds = useCallback(
    async (deltaSec: number) => {
      if (!isCurrent) return;
      const clock = getAudioPlaybackClock();
      const store = useGlobalAudioPlayerStore.getState();
      const dur = clock.duration || store.duration || 0;
      if (dur <= 0) return;
      const nextMs = Math.max(
        0,
        Math.min((clock.position ?? store.position ?? 0) + deltaSec * 1000, dur)
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
    isMuted: isCurrent ? isMuted : false,
    hasDuration: Number(audio.duration) > 0,
    handlePlayPress,
    seekBySeconds,
    onSeekToPercent,
    toggleMute,
  };
}
