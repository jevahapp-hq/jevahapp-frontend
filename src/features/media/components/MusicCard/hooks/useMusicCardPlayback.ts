/**
 * Music playback + global floating-player sync for MusicCard.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdvancedAudioPlayer } from "../../../../../../app/hooks/useAdvancedAudioPlayer";
import { useGlobalMediaStore } from "../../../../../../app/store/useGlobalMediaStore";
import {
  useGlobalAudioPlayerStore,
  type AudioTrack,
} from "../../../../../../app/store/useGlobalAudioPlayerStore";
import type { MediaItem } from "../../../../../shared/types";
import {
  getUserDisplayNameFromContent,
  isValidUri,
} from "../../../../../shared/utils";

function resolveMusicUrl(audio: MediaItem): string {
  const candidates = [
    audio.fileUrl,
    (audio as any).audioUrl,
    (audio as any).playbackUrl,
    (audio as any).mediaUrl,
  ];
  for (const raw of candidates) {
    if (typeof raw === "string" && isValidUri(raw)) return raw.trim();
  }
  return "";
}

export function useMusicCardPlayback(audio: MediaItem, index: number) {
  const [attemptedPlay, setAttemptedPlay] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const audioUrl = resolveMusicUrl(audio);
  const audioKey = `music-${audio._id || index}`;
  const audioId = audio._id || `music-${index}`;
  const globallyAllowed = useGlobalMediaStore(
    (s) => !!s.playingAudio[audioKey]
  );

  const [playerState, controls] = useAdvancedAudioPlayer(
    isValidUri(audioUrl) ? audioUrl : null,
    {
      audioKey,
      autoPlay: false,
      loop: false,
      fallbackDurationSec: Number(audio.duration) || undefined,
    }
  );

  const globalIsPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const globalProgress = useGlobalAudioPlayerStore((s) => s.progress);
  const globalIsMuted = useGlobalAudioPlayerStore((s) => s.isMuted);
  const currentTrackId = useGlobalAudioPlayerStore((s) => s.currentTrack?.id);
  const currentTrackVirtual = useGlobalAudioPlayerStore(
    (s) => !!s.currentTrack?.isVirtual
  );
  const isCurrentTrack = currentTrackId === audioId;
  const isVirtualTrack = isCurrentTrack && currentTrackVirtual;
  const isPlayingFromGlobal = isVirtualTrack
    ? globalIsPlaying
    : playerState.isPlaying;

  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  useEffect(() => {
    if (!isVirtualTrack) return;
    const store = useGlobalAudioPlayerStore.getState();
    if (store.isPlaying !== playerState.isPlaying) {
      store.setPlaying(playerState.isPlaying);
    }
  }, [isVirtualTrack, playerState.isPlaying]);

  useEffect(() => {
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id !== audioId || !store.currentTrack?.isVirtual) {
      return;
    }
    if (playerState.duration <= 0) return;
    const positionMs = playerState.position || 0;
    const durationMs = playerState.duration || 0;
    const progress = durationMs > 0 ? positionMs / durationMs : 0;
    if (Math.abs(store.position - positionMs) > 500) {
      store.setPosition(positionMs);
    }
    if (Math.abs(store.progress - progress) > 0.01) {
      store.setProgressValue(progress);
    }
    if (store.duration !== durationMs) {
      store.setDuration(durationMs);
    }
  }, [playerState.position, playerState.duration, playerState.progress, audioId]);

  useEffect(() => {
    if (!globallyAllowed && playerState.isPlaying) {
      void controlsRef.current.pause();
    }
  }, [globallyAllowed, playerState.isPlaying]);

  const handlePlayPress = useCallback(
    async (_onPlay?: (uri: string, id: string) => void) => {
      if (!audioUrl || !isValidUri(audioUrl)) return;
      if (playerState.isLoading) return;

      const store = useGlobalAudioPlayerStore.getState();
      const hasVirtualControls =
        store.currentTrack?.id === audioId &&
        store.currentTrack?.isVirtual &&
        store.__virtualTrackControls;

      if (hasVirtualControls) {
        await store.togglePlayPause();
        return;
      }

      setAttemptedPlay(true);
      try {
        const wasPlaying = playerState.isPlaying;
        await controls.togglePlay();

        setTimeout(async () => {
          try {
            const g = useGlobalAudioPlayerStore.getState();
            const thumbnailSource = audio?.imageUrl || audio?.thumbnailUrl;
            const thumbnailUri =
              typeof thumbnailSource === "string"
                ? thumbnailSource
                : (thumbnailSource as any)?.uri;

            if (!wasPlaying) {
              const track: AudioTrack = {
                id: audioId,
                title: audio.title || "Unknown Title",
                artist:
                  getUserDisplayNameFromContent(audio) || "Unknown Artist",
                audioUrl,
                thumbnailUrl: thumbnailUri || "",
                duration:
                  playerState.duration > 0
                    ? playerState.duration / 1000
                    : Number(audio.duration) || 0,
                category:
                  audio.category?.[0] || audio.contentType || "music",
                description: audio.description || "",
                isVirtual: true,
              };
              await g.setTrack(track, false);
              g.setPlaying(true);
              g.setVirtualTrackControls({
                togglePlayPause: async () => {
                  await controls.togglePlay();
                },
                pause: async () => {
                  await controls.pause();
                },
                play: async () => {
                  await controls.play();
                },
                seekToProgress: async (progress: number) => {
                  await controls.seekTo(progress);
                },
              });
              if (playerState.duration > 0) {
                g.setDuration(playerState.duration);
                g.setPosition(playerState.position || 0);
                g.setProgressValue(playerState.progress || 0);
              }
            } else if (g.currentTrack?.id === audioId) {
              g.setPlaying(false);
            }
          } catch (err) {
            console.warn("MusicCard: Failed to sync with global audio:", err);
          }
        }, 100);
      } catch (err) {
        console.warn("MusicCard play toggle failed:", err);
      }
    },
    [
      audioUrl,
      controls,
      audio,
      audioId,
      playerState.isLoading,
      playerState.isPlaying,
      playerState.duration,
      playerState.position,
      playerState.progress,
    ]
  );

  const seekBySeconds = useCallback(
    async (deltaSec: number) => {
      const dur =
        playerState.duration ||
        (Number(audio.duration) > 0 ? Number(audio.duration) * 1000 : 0);
      if (dur <= 0) return;
      const nextMs = Math.max(
        0,
        Math.min((playerState.position || 0) + deltaSec * 1000, dur)
      );
      await controls.seekTo(nextMs / dur);
    },
    [playerState.duration, playerState.position, controls, audio.duration]
  );

  const onSeekToPercent = useCallback(
    async (pct: number) => {
      await controls.seekTo(Math.max(0, Math.min(pct, 1)));
    },
    [controls]
  );

  return {
    audioUrl,
    audioId,
    playerState,
    controls,
    isCurrentTrack,
    isVirtualTrack,
    isPlayingFromGlobal,
    globalProgress,
    globalIsMuted,
    attemptedPlay,
    showOverlay,
    setShowOverlay,
    handlePlayPress,
    seekBySeconds,
    onSeekToPercent,
  };
}
