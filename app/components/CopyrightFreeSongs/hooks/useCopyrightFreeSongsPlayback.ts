/**
 * useCopyrightFreeSongsPlayback - Global audio player wiring, play, queue, card/modal handlers
 */
import { useCallback, useEffect } from "react";
import { prefetchAudioUrl } from "../../../../src/shared/utils/audioPrefetch";
import { devLog } from "../../../../src/shared/utils/logger";
import { useCopyrightFreeOverlayStore } from "../../../store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "../../../store/useGlobalAudioPlayerStore";

function mapSongToTrack(song: any) {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    audioUrl: song.audioUrl,
    thumbnailUrl: song.thumbnailUrl,
    duration: song.duration,
    category: song.category,
    description: song.description,
  };
}

/** Fire-and-forget play — never block the overlay paint on audio teardown. */
export async function playCopyrightFreeSong(song: any, songs: any[]) {
  if (!song) return;

  try {
    const audioManagerModule = require("../../../utils/globalAudioInstanceManager");
    const audioManager = audioManagerModule.default.getInstance();
    void audioManager.stopAllAudio().catch(() => {});
  } catch {
    // manager not available
  }

  try {
    const state = useGlobalAudioPlayerStore.getState();
    const currentQueue = state.queue || [];
    const songIndex = songs.findIndex((s) => s.id === song.id);

    if (songIndex !== -1) {
      const queueNeedsUpdate =
        currentQueue.length !== songs.length ||
        currentQueue.some((track, idx) => track.id !== songs[idx]?.id);

      if (queueNeedsUpdate) {
        const mappedQueue = songs.map(mapSongToTrack);
        useGlobalAudioPlayerStore.setState({
          queue: mappedQueue,
          originalQueue: mappedQueue,
          currentIndex: songIndex,
          isShuffled: false,
        });
      } else {
        useGlobalAudioPlayerStore.setState({ currentIndex: songIndex });
      }
    }
  } catch (e) {
    if (__DEV__) {
      console.warn("⚠️ Failed to set global audio queue from copyright songs:", e);
    }
  }

  const state = useGlobalAudioPlayerStore.getState();
  if (state.currentTrack?.id === song.id && state.isPlaying) {
    await state.togglePlayPause();
    return;
  }

  await state.setTrack(mapSongToTrack(song), true);
  const next = useGlobalAudioPlayerStore.getState();
  if (!next.isPlaying && next.soundInstance) {
    await next.play();
  }
}

export function useCopyrightFreeSongsPlayback({
  songs,
}: {
  songs: any[];
}) {
  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    isLoading: globalIsLoading,
  } = useGlobalAudioPlayerStore();

  useEffect(() => {
    useCopyrightFreeOverlayStore.getState().setQueue(songs);
    if (songs[0]) {
      useCopyrightFreeOverlayStore.getState().warm(songs[0]);
      prefetchAudioUrl(songs[0]?.audioUrl || songs[0]?.fileUrl);
    }
  }, [songs]);

  useEffect(() => {
    const overlay = useCopyrightFreeOverlayStore.getState();
    if (!overlay.visible || !currentTrack || songs.length === 0) return;
    const fullSongData = songs.find((s) => s.id === currentTrack.id);
    if (fullSongData && overlay.song?.id !== currentTrack.id) {
      overlay.setSong(fullSongData);
    }
  }, [currentTrack?.id, songs]);

  const handlePlayIconPress = useCallback(
    async (song: any) => {
      if (__DEV__) devLog.log("🎵 Play button pressed for:", song.title);
      if (globalIsLoading) return;
      await playCopyrightFreeSong(song, songs);
    },
    [globalIsLoading, songs]
  );

  const handleCardPress = useCallback((song: any) => {
    useCopyrightFreeOverlayStore.getState().open(song);
  }, []);

  return {
    handlePlayIconPress,
    handleCardPress,
    currentTrack,
    globalIsPlaying,
  };
}
