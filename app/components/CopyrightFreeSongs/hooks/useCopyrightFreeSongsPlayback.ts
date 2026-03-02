/**
 * useCopyrightFreeSongsPlayback - Global audio player wiring, play, queue, card/modal handlers
 */
import { useCallback, useEffect } from "react";
import { devLog } from "../../../../src/shared/utils/logger";
import { useGlobalAudioPlayerStore } from "../../../store/useGlobalAudioPlayerStore";

export function useCopyrightFreeSongsPlayback({
  songs,
  selectedSong,
  setSelectedSong,
  showSongModal,
  setShowSongModal,
}: {
  songs: any[];
  selectedSong: any | null;
  setSelectedSong: (song: any | null) => void;
  showSongModal: boolean;
  setShowSongModal: (v: boolean) => void;
}) {
  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    togglePlayPause,
    setTrack,
    isLoading: globalIsLoading,
  } = useGlobalAudioPlayerStore();

  useEffect(() => {
    if (showSongModal && currentTrack && songs.length > 0) {
      const fullSongData = songs.find((s) => s.id === currentTrack.id);
      if (fullSongData && selectedSong?.id !== currentTrack.id) {
        if (__DEV__) {
          devLog.log("🔄 Auto-advance: Updating modal to show next song:", fullSongData.title);
        }
        setSelectedSong(fullSongData);
      }
    }
  }, [currentTrack?.id, showSongModal, songs, selectedSong?.id, setSelectedSong]);

  const handlePlayIconPress = useCallback(
    async (song: any) => {
      if (__DEV__) devLog.log("🎵 Play button pressed for:", song.title);
      if (globalIsLoading) {
        if (__DEV__) devLog.log("⏳ Global audio player is loading, ignoring tap");
        return;
      }

      try {
        const audioManagerModule = require("../../../utils/globalAudioInstanceManager");
        const audioManager = audioManagerModule.default.getInstance();
        await audioManager.stopAllAudio().catch(() => {});
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
            const mappedQueue = songs.map((s) => ({
              id: s.id,
              title: s.title,
              artist: s.artist,
              audioUrl: s.audioUrl,
              thumbnailUrl: s.thumbnailUrl,
              duration: s.duration,
              category: s.category,
              description: s.description,
            }));

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

      if (currentTrack?.id === song.id && globalIsPlaying) {
        await togglePlayPause();
      } else {
        await setTrack(
          {
            id: song.id,
            title: song.title,
            artist: song.artist,
            audioUrl: song.audioUrl,
            thumbnailUrl: song.thumbnailUrl,
            duration: song.duration,
            category: song.category,
            description: song.description,
          },
          true
        );
        const state = useGlobalAudioPlayerStore.getState();
        if (!state.isPlaying && state.soundInstance) {
          await state.play();
        }
      }
    },
    [
      currentTrack,
      globalIsPlaying,
      setTrack,
      togglePlayPause,
      globalIsLoading,
      songs,
    ]
  );

  const handleCardPress = useCallback((song: any) => {
    setSelectedSong(song);
    setShowSongModal(true);
  }, [setSelectedSong, setShowSongModal]);

  return {
    handlePlayIconPress,
    handleCardPress,
    currentTrack,
    globalIsPlaying,
    togglePlayPause,
    globalProgress: useGlobalAudioPlayerStore((s) => s.progress),
    globalDuration: useGlobalAudioPlayerStore((s) => s.duration),
    globalPosition: useGlobalAudioPlayerStore((s) => s.position),
    globalIsMuted: useGlobalAudioPlayerStore((s) => s.isMuted),
  };
}
