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
 * WARNING: Never call `useGlobalAudioPlayerStore()` without a selector.
 * Subscribe only to identity/transport fields (`currentTrack`, `isPlaying`,
 * `isLoading`, `isMuted`, …). Playback position lives on
 * `useAudioProgressStore` — a full-store subscription (or a `progress` /
 * `position` selector here) re-renders the Music page on every audio tick
 * and makes play/pause feel stuck.
 * Imperative `getState()` is fine outside render.
 */

export const useGlobalAudioPlayerStore = create<GlobalAudioPlayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      isMuted: false,
      loadError: null,
      isSessionActive: false,
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
      __loadGeneration: 0,
      __ignoreStatusUntil: 0,
      __failedTrackIds: {},
      __statusSubscription: null,

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
        // Persist a *resume point*, not a session. `soundInstance` and
        // `isSessionActive` are intentionally excluded: rehydrated data must
        // never be able to summon a Now Playing bar with no engine behind it.
        // Convert audioUrl and thumbnailUrl to strings if they're require() objects
        const persistTrack = (track: typeof state.currentTrack) =>
          track
            ? {
                id: track.id,
                title: track.title,
                artist: track.artist,
                duration: track.duration,
                category: track.category,
                description: track.description,
                source: track.source,
                audioUrl:
                  typeof track.audioUrl === "string"
                    ? track.audioUrl
                    : track.audioUrl?.uri || "",
                thumbnailUrl:
                  typeof track.thumbnailUrl === "string"
                    ? track.thumbnailUrl
                    : track.thumbnailUrl?.uri || "",
              }
            : null;

        const persistedTrack = persistTrack(state.currentTrack);

        return {
          currentTrack: persistedTrack,
          isMuted: state.isMuted,
          queue: state.queue.map((track) => persistTrack(track)!),
          originalQueue: state.originalQueue.map((track) => persistTrack(track)!),
          currentIndex: state.currentIndex,
          repeatMode: state.repeatMode,
          isShuffled: state.isShuffled,
        };
      },
    }
  )
);
