import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import { Audio } from "expo-av";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import GlobalAudioInstanceManager from "../utils/globalAudioInstanceManager";
import { useCurrentPlayingAudioStore } from "./useCurrentPlayingAudioStore";

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

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: any; // Can be require() or URL string
  thumbnailUrl: any;
  duration: number;
  category?: string;
  description?: string;
}

interface GlobalAudioPlayerState {
  // Current track
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;
  
  // Playback state
  position: number; // in milliseconds
  duration: number; // in milliseconds
  progress: number; // 0-1
  
  // Audio instance
  soundInstance: Audio.Sound | null;
  
  // Queue (for future playlist support)
  queue: AudioTrack[];
  currentIndex: number;
  
  // Actions
  setTrack: (track: AudioTrack, shouldPlayImmediately?: boolean) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seek: (position: number) => Promise<void>; // position in milliseconds
  seekToProgress: (progress: number) => Promise<void>; // progress 0-1
  setMuted: (muted: boolean) => Promise<void>;
  toggleMute: () => Promise<void>;
  stop: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  playAtIndex: (index: number) => Promise<void>;
  clear: () => Promise<void>;
  
  // Internal state setters
  setPlaying: (playing: boolean) => void;
  setLoading: (loading: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setProgressValue: (progress: number) => void;

  // Internal (non-persisted) guards for professional update management
  __isAdvancing?: boolean;
  __completionTimeout?: boolean;
  __completionTimeoutId?: any;
  __lastStatusUpdateTs?: number;
}

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

      // Professional audio store: Internal guards for update management
      __isAdvancing: false,
      __completionTimeout: false,
      __completionTimeoutId: null,
      __lastStatusUpdateTs: 0,
      __isAdvancing: false,

      setTrack: async (track: AudioTrack, shouldPlayImmediately: boolean = false) => {
        const { stop, soundInstance, currentTrack } = get();

        // If the same track is already loaded, just return (caller can call play() separately)
        if (currentTrack?.id === track.id && soundInstance) {
          try {
            const status = await soundInstance.getStatusAsync();
            if (status.isLoaded) {
              // Track is already loaded, just update state if needed
              if (shouldPlayImmediately && !status.isPlaying) {
                await soundInstance.playAsync();
                set({ isPlaying: true });
              }
              return;
            }
          } catch (error) {
            // If status check fails, continue with loading
            console.warn("Error checking existing track status:", error);
          }
        }

        // Ensure any legacy/audio-manager based playback is stopped
        // so we never have two different audio systems playing at once.
        try {
          await GlobalAudioInstanceManager.getInstance().stopAllAudio();
        } catch (error) {
          console.warn("Error stopping legacy audio manager before global track:", error);
        }

        // Clear MiniAudioPlayer's current audio state, if any
        try {
          useCurrentPlayingAudioStore.getState().clearCurrentAudio();
        } catch (error) {
          // no-op
        }
        
        // Stop current track if playing
        if (soundInstance) {
          try {
            await soundInstance.unloadAsync();
          } catch (error) {
            console.warn("Error unloading previous audio:", error);
          }
        }

        set({
          currentTrack: track,
          isPlaying: false,
          isLoading: true,
          position: 0,
          progress: 0,
          soundInstance: null,
        });

        try {
          // Configure audio mode for background playback
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true, // Enable background playback
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });

          // Normalize audio source for expo-av (support require(), string URLs, and { uri } objects)
          let source: any = track.audioUrl;
          if (!source) {
            throw new Error("Missing audio source for track");
          }

          // If we received a plain string from backend, wrap in { uri }
          if (typeof source === "string") {
            source = { uri: source };
          } else if (typeof source === "number") {
            // Convert require() number module to Asset
            source = Asset.fromModule(source);
          } else if (typeof source === "object" && !("uri" in source)) {
            // If it's some other object (e.g. { localUri }), try to map to { uri }
            if ((source as any).localUri) {
              source = { uri: (source as any).localUri };
            }
          }

          const { sound } = await Audio.Sound.createAsync(
            source,
            {
              shouldPlay: shouldPlayImmediately, // Start playing immediately if requested
              isMuted: get().isMuted,
              progressUpdateIntervalMillis: 300, // Update every 300ms to prevent excessive callbacks
            },
            (status) => {
              if (status.isLoaded) {
                const newPosition = status.positionMillis || 0;
                const newDuration = status.durationMillis || 0;
                const newProgress =
                  newDuration > 0 ? newPosition / newDuration : 0;

                // Professional audio store implementation: Batch and throttle updates
                // to prevent React's maximum update depth exceeded errors
                const prev = get();
                const now = Date.now();
                const lastTs = (prev as any).__lastStatusUpdateTs || 0;

                // More conservative update logic to prevent cascading renders
                const timeSinceLastUpdate = now - lastTs;
                const positionChangedSignificantly = Math.abs(prev.position - newPosition) > 1000; // 1 second threshold
                const playingChanged = prev.isPlaying !== status.isPlaying;
                const durationChanged = prev.duration !== newDuration;

                // Throttle position updates: only update if enough time passed OR significant change
                const shouldUpdatePosition = 
                  timeSinceLastUpdate > 300 || // Update every ~300ms max (~3 updates/sec)
                  positionChangedSignificantly; // Or if position jumped significantly

                // Always update critical state changes immediately
                const shouldUpdateCritical = playingChanged || durationChanged;

                // Only update if we need to (prevents infinite loops)
                if (shouldUpdatePosition || shouldUpdateCritical) {
                  // Build updates object conditionally - only include what actually changed
                  const updates: any = {};

                  // Only update position/progress if throttling allows and values actually changed
                  if (shouldUpdatePosition && (
                    Math.abs(prev.position - newPosition) > 50 || // At least 50ms difference
                    Math.abs(prev.progress - newProgress) > 0.001 // Or progress changed meaningfully
                  )) {
                    updates.position = newPosition;
                    updates.progress = newProgress;
                  }

                  // Always update critical state if it changed
                  if (playingChanged) {
                    updates.isPlaying = status.isPlaying;
                  }
                  
                  if (durationChanged) {
                    updates.duration = newDuration;
                  }

                  // Always update timestamp when we're making any update
                  if (Object.keys(updates).length > 0) {
                    updates.__lastStatusUpdateTs = now;
                    set(updates);
                  }
                }

                // Handle playback completion with proper debouncing
                if (status.didJustFinish) {
                  // Professional guard: Use a timeout to debounce multiple didJustFinish calls
                  const st: any = get();
                  if (!st.__isAdvancing && !st.__completionTimeout) {
                    set({ __isAdvancing: true, __completionTimeout: true } as any);

                    // Clear any existing timeout and set new one
                    if (st.__completionTimeoutId) {
                      clearTimeout(st.__completionTimeoutId);
                    }

                    const timeoutId = setTimeout(async () => {
                      try {
                        await get().next();
                      } finally {
                        // Reset guards
                        set({
                          __isAdvancing: false,
                          __completionTimeout: false,
                          __completionTimeoutId: null
                        } as any);
                      }
                    }, 100); // Small delay to debounce

                    set({ __completionTimeoutId: timeoutId } as any);
                  }
                }
              }
            }
          );

          set({
            soundInstance: sound,
            isLoading: false,
            duration: track.duration * 1000, // Convert to milliseconds
            isPlaying: shouldPlayImmediately, // Set playing state if we started immediately
          });
        } catch (error) {
          console.error("Error loading audio track:", error);
          set({
            isLoading: false,
            currentTrack: null,
            soundInstance: null,
          });
        }
      },

      play: async () => {
        const { soundInstance } = get();
        if (soundInstance) {
          try {
            // Check if already playing to avoid unnecessary operations
            const status = await soundInstance.getStatusAsync();
            if (status.isLoaded && status.isPlaying) {
              return; // Already playing, no need to do anything
            }
            
            // Play immediately
            await soundInstance.playAsync();
            set({ isPlaying: true });
          } catch (error) {
            console.error("Error playing audio:", error);
            set({ isPlaying: false });
          }
        }
      },

      pause: async () => {
        const { soundInstance } = get();
        if (soundInstance) {
          try {
            await soundInstance.pauseAsync();
            set({ isPlaying: false });
          } catch (error) {
            console.error("Error pausing audio:", error);
          }
        }
      },

      togglePlayPause: async () => {
        const { isPlaying, play, pause } = get();
        if (isPlaying) {
          await pause();
        } else {
          await play();
        }
      },

      seek: async (position: number) => {
        const { soundInstance, duration } = get();
        if (soundInstance && duration > 0) {
          const clampedPosition = Math.max(0, Math.min(position, duration));
          try {
            await soundInstance.setPositionAsync(clampedPosition);
            const progress = duration > 0 ? clampedPosition / duration : 0;
            set({ position: clampedPosition, progress });
          } catch (error) {
            console.error("Error seeking audio:", error);
          }
        }
      },

      seekToProgress: async (progress: number) => {
        const { duration, seek } = get();
        if (duration > 0) {
          const position = progress * duration;
          await seek(position);
        }
      },

      setMuted: async (muted: boolean) => {
        const { soundInstance } = get();
        if (soundInstance) {
          try {
            await soundInstance.setIsMutedAsync(muted);
            set({ isMuted: muted });
          } catch (error) {
            console.error("Error setting mute:", error);
          }
        } else {
          set({ isMuted: muted });
        }
      },

      toggleMute: async () => {
        const { isMuted, setMuted } = get();
        await setMuted(!isMuted);
      },

      stop: async () => {
        const { soundInstance, pause } = get();
        if (soundInstance) {
          try {
            // Only attempt to pause/reset if the sound is actually loaded.
            const status = await soundInstance.getStatusAsync();
            if (status.isLoaded) {
              if (status.isPlaying) {
                await pause();
              }
              await soundInstance.setPositionAsync(0);
            }
          } catch (error) {
            // Non‑fatal: if sound is already unloaded or not ready, just ignore.
            console.warn("Warning while stopping audio (non-fatal):", error);
          }
        }
        set({ position: 0, progress: 0 });
      },

      next: async () => {
        const { queue, currentIndex, setTrack } = get();
        if (queue.length > 0 && currentIndex < queue.length - 1) {
          const nextIndex = currentIndex + 1;
          const nextTrack = queue[nextIndex];
          set({ currentIndex: nextIndex });
          await setTrack(nextTrack);
          await get().play();
        } else {
          // End of queue - just stop
          await get().stop();
        }
      },

      previous: async () => {
        const { queue, currentIndex, setTrack } = get();
        if (queue.length > 0 && currentIndex > 0) {
          const prevIndex = currentIndex - 1;
          const prevTrack = queue[prevIndex];
          set({ currentIndex: prevIndex });
          await setTrack(prevTrack);
          await get().play();
        } else {
          // Beginning of queue - restart current track
          await get().seek(0);
        }
      },

      playAtIndex: async (index: number) => {
        const { queue, setTrack } = get();
        if (!Array.isArray(queue) || queue.length === 0) return;
        if (!Number.isFinite(index)) return;

        const clampedIndex = Math.max(0, Math.min(index, queue.length - 1));
        const track = queue[clampedIndex];
        if (!track) return;

        set({ currentIndex: clampedIndex });
        await setTrack(track);
        await get().play();
      },

      clear: async () => {
        const { soundInstance, stop } = get();
        await stop();
        if (soundInstance) {
          try {
            await soundInstance.unloadAsync();
          } catch (error) {
            console.warn("Error unloading audio:", error);
          }
        }
        set({
          currentTrack: null,
          soundInstance: null,
          queue: [],
          currentIndex: -1,
          position: 0,
          duration: 0,
          progress: 0,
        });
      },

      // Internal setters
      setPlaying: (playing: boolean) => set({ isPlaying: playing }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setPosition: (position: number) => {
        const { duration } = get();
        const progress = duration > 0 ? position / duration : 0;
        set({ position, progress });
      },
      setDuration: (duration: number) => set({ duration }),
      setProgressValue: (progress: number) => {
        const { duration } = get();
        const position = duration * progress;
        set({ progress, position });
      },
    }),
    {
      name: "@jevahapp_global_audio_player",
      storage: {
        getItem: async (name: string): Promise<string | null> => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value;
          } catch (error) {
            console.warn("Error reading from storage:", error);
            return null;
          }
        },
        setItem: async (name: string, value: string): Promise<void> => {
          try {
            // Zustand persist typically passes a string, but be defensive without spamming warnings
            const toStore =
              typeof value === "string" ? value : JSON.stringify(value);
            await AsyncStorage.setItem(name, toStore);
          } catch (error) {
            console.warn("Error writing to storage:", error);
            // Don't throw - just log the error
          }
        },
        removeItem: async (name: string): Promise<void> => {
          try {
            await AsyncStorage.removeItem(name);
          } catch (error) {
            console.warn("Error removing from storage:", error);
          }
        },
      },
      partialize: (state) => {
        // Only persist minimal state - don't persist soundInstance
        // Convert audioUrl and thumbnailUrl to strings if they're require() objects
        const persistedTrack = state.currentTrack ? {
          id: state.currentTrack.id,
          title: state.currentTrack.title,
          artist: state.currentTrack.artist,
          duration: state.currentTrack.duration,
          category: state.currentTrack.category,
          description: state.currentTrack.description,
          // Convert require() objects to strings
          audioUrl: typeof state.currentTrack.audioUrl === 'string' 
            ? state.currentTrack.audioUrl 
            : (state.currentTrack.audioUrl?.uri || ''),
          thumbnailUrl: typeof state.currentTrack.thumbnailUrl === 'string'
            ? state.currentTrack.thumbnailUrl
            : (state.currentTrack.thumbnailUrl?.uri || ''),
        } : null;

        return {
          currentTrack: persistedTrack,
          isMuted: state.isMuted,
          queue: state.queue.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            category: track.category,
            description: track.description,
            audioUrl: typeof track.audioUrl === 'string' 
              ? track.audioUrl 
              : (track.audioUrl?.uri || ''),
            thumbnailUrl: typeof track.thumbnailUrl === 'string'
              ? track.thumbnailUrl
              : (track.thumbnailUrl?.uri || ''),
          })),
          currentIndex: state.currentIndex,
        };
      },
    }
  )
);

