import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createQueueActions } from "./audioPlayer/createQueueActions";
import { createSeekActions } from "./audioPlayer/createSeekActions";
import { createSetTrack } from "./audioPlayer/createSetTrack";
import { createStateSetters } from "./audioPlayer/createStateSetters";
import { createTransportActions } from "./audioPlayer/createTransportActions";
import type { AudioTrack, GlobalAudioPlayerState } from "./audioPlayer/types";

export type { AudioTrack };

/**
 * Professional Global Audio Player Store
 *
 * Key Features:
 * - Batched state updates to prevent React's "Maximum update depth exceeded"
 * - Throttled playback callbacks to avoid excessive re-renders
 * - Proper guards against re-entrant operations
 * - Comprehensive error handling
 *
 * WARNING: Components should use the hook `useGlobalAudioPlayerStore()` instead of
 * `useGlobalAudioPlayerStore.getState()` in render functions to avoid cascading updates.
 * Multiple `getState()` calls in render can trigger excessive re-renders.
 */

export const useGlobalAudioPlayerStore = create<GlobalAudioPlayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      isMuted: false,
      position: 0,
      duration: 0,
      progress: 0,
      soundInstance: null,
      queue: [],
      currentIndex: -1,
      originalQueue: [],
      repeatMode: "none",
      isShuffled: false,

      // Professional audio store: Internal guards for update management
      __isAdvancing: false,
      __completionTimeout: false,
      __completionTimeoutId: null,
      __lastStatusUpdateTs: 0,

      ...createSetTrack(get, set),
      ...createTransportActions(get, set),
      ...createSeekActions(get, set),
      ...createQueueActions(get, set),
      ...createStateSetters(get, set),
    }),
    {
      name: "@jevahapp_global_audio_player",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): any => {
        // Only persist minimal state - don't persist soundInstance
        // Convert audioUrl and thumbnailUrl to strings if they're require() objects
        const persistedTrack = state.currentTrack
          ? {
          id: state.currentTrack.id,
          title: state.currentTrack.title,
          artist: state.currentTrack.artist,
          duration: state.currentTrack.duration,
          category: state.currentTrack.category,
          description: state.currentTrack.description,
          // Convert require() objects to strings
              audioUrl:
                typeof state.currentTrack.audioUrl === "string"
            ? state.currentTrack.audioUrl
                  : state.currentTrack.audioUrl?.uri || "",
              thumbnailUrl:
                typeof state.currentTrack.thumbnailUrl === "string"
            ? state.currentTrack.thumbnailUrl
                  : state.currentTrack.thumbnailUrl?.uri || "",
            }
          : null;

        return {
          currentTrack: persistedTrack,
          isMuted: state.isMuted,
          queue: state.queue.map((track) => ({
            id: track.id,
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            category: track.category,
            description: track.description,
            audioUrl:
              typeof track.audioUrl === "string"
              ? track.audioUrl
                : track.audioUrl?.uri || "",
            thumbnailUrl:
              typeof track.thumbnailUrl === "string"
              ? track.thumbnailUrl
                : track.thumbnailUrl?.uri || "",
          })),
          originalQueue: state.originalQueue.map((track) => ({
            id: track.id,
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            category: track.category,
            description: track.description,
            audioUrl:
              typeof track.audioUrl === "string"
              ? track.audioUrl
                : track.audioUrl?.uri || "",
            thumbnailUrl:
              typeof track.thumbnailUrl === "string"
              ? track.thumbnailUrl
                : track.thumbnailUrl?.uri || "",
          })),
          currentIndex: state.currentIndex,
          repeatMode: state.repeatMode,
          isShuffled: state.isShuffled,
        };
      },
    }
  )
);
