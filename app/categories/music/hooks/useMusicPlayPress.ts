import { useCallback } from "react";
import { Alert } from "react-native";
import { musicCatalogApi } from "../../../services/music-catalog";
import {
  isTrackPlayable,
  isTrackProcessing,
} from "../../../services/music-catalog/trackTypes";
import { useGlobalAudioPlayerStore } from "../../../store/useGlobalAudioPlayerStore";

/**
 * Handle play/pause for a song
 */
export function useMusicPlayPress(songs: any[]) {
  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    setTrack,
    togglePlayPause,
  } = useGlobalAudioPlayerStore();

  const handlePlayPress = useCallback(
    async (song: any) => {
      if (song?.lane === "artist" || song?.contentType === "artist-music") {
        if (!isTrackPlayable(song) || isTrackProcessing(song)) {
          Alert.alert(
            "Processing…",
            "This track is still encoding. Try again in a moment."
          );
          return;
        }
      }
      if (!song?.audioUrl) {
        return;
      }
      if (currentTrack?.id === song.id && globalIsPlaying) {
        await togglePlayPause();
      } else {
        const songIndex = songs.findIndex((s) => s.id === song.id);

        if (songIndex !== -1) {
          const mappedQueue = songs
            .filter((s) => !!s.audioUrl && isTrackPlayable(s))
            .map((s) => ({
              id: s.id,
              title: s.title,
              artist: s.artist,
              audioUrl: s.audioUrl,
              thumbnailUrl: s.thumbnailUrl,
              duration: s.duration,
              category: s.category,
              description: s.description,
            }));

          const queueIndex = mappedQueue.findIndex((s) => s.id === song.id);
          useGlobalAudioPlayerStore.setState({
            queue: mappedQueue,
            currentIndex: Math.max(0, queueIndex),
          });
        }

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

        if (song?.lane === "artist" || song?.contentType === "artist-music") {
          void musicCatalogApi.recordPlay(song.id);
        }
      }
    },
    [currentTrack, globalIsPlaying, setTrack, togglePlayPause, songs]
  );

  return handlePlayPress;
}
