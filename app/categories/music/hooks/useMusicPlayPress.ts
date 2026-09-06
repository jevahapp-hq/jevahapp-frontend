import { useCallback, useRef } from "react";
import { Alert } from "react-native";
import { musicCatalogApi } from "../../../services/music-catalog";
import {
  isTrackPlayable,
  isTrackProcessing,
} from "../../../services/music-catalog/trackTypes";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { enqueueFeedEvent } from "../../../../src/shared/feed/feedRanker";

/**
 * Handle play/pause for a song.
 * Subscribe only to identity/playback flags — never to position/progress,
 * or the Music catalog re-renders on every audio tick.
 */
export function useMusicPlayPress(songs: any[]) {
  const currentTrack = useGlobalAudioPlayerStore((s) => s.currentTrack);
  const globalIsPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const setTrack = useGlobalAudioPlayerStore((s) => s.setTrack);
  const togglePlayPause = useGlobalAudioPlayerStore((s) => s.togglePlayPause);
  const playStartedAt = useRef<number>(0);

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
        const watched = Date.now() - playStartedAt.current;
        if (watched > 0) {
          const position = useGlobalAudioPlayerStore.getState().position;
          enqueueFeedEvent({
            contentId: String(song.id),
            contentType: "music",
            eventType: "watch_time",
            watchMs: watched,
            progressPct: position,
            source: "music_for_you",
          });
        }
      } else {
        if (currentTrack?.id && currentTrack.id !== song.id) {
          const watched = Date.now() - playStartedAt.current;
          if (watched > 0 && watched < 15000) {
            enqueueFeedEvent({
              contentId: String(currentTrack.id),
              contentType: "music",
              eventType: "skip",
              watchMs: watched,
              source: "music_for_you",
            });
          }
        }

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
              source:
                s?.lane === "artist" || s?.contentType === "artist-music"
                  ? ("library" as const)
                  : ("copyright-free" as const),
            }));

          const queueIndex = mappedQueue.findIndex((s) => s.id === song.id);
          useGlobalAudioPlayerStore.setState({
            queue: mappedQueue,
            currentIndex: Math.max(0, queueIndex),
          });
        }

        playStartedAt.current = Date.now();
        enqueueFeedEvent({
          contentId: String(song.id),
          contentType: "music",
          eventType: "impression",
          source: "music_for_you",
        });

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
            source:
              song?.lane === "artist" || song?.contentType === "artist-music"
                ? "library"
                : "copyright-free",
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
