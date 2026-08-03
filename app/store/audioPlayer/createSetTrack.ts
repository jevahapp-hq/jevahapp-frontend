import { Audio } from "expo-av";
import GlobalAudioInstanceManager from "../../utils/globalAudioInstanceManager";
import { normalizeAudioSource } from "./normalizeAudioSource";
import {
  resolveAudioDurationMs,
  trackDurationToMs,
} from "./resolveAudioDurationMs";
import type {
  AudioPlayerGet,
  AudioPlayerSet,
  AudioTrack,
  GlobalAudioPlayerState,
} from "./types";

export function createSetTrack(
  get: AudioPlayerGet,
  set: AudioPlayerSet
): Pick<GlobalAudioPlayerState, "setTrack"> {
  return {
    setTrack: async (
      track: AudioTrack,
      shouldPlayImmediately: boolean = false
    ) => {
      const { soundInstance, currentTrack } = get();

      // CRITICAL: Ensure no two copyright-free songs can play at the same time
      // Stop any currently playing track before loading a new one
      if (currentTrack && currentTrack.id !== track.id && soundInstance) {
        try {
          const status = await soundInstance.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await soundInstance.pauseAsync();
            await soundInstance.unloadAsync();
          }
        } catch (error) {
          console.warn("Error stopping previous track:", error);
        }
      }

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
        console.warn(
          "Error stopping legacy audio manager before global track:",
          error
        );
      }

      // Pause any normal songs playing via useAdvancedAudioPlayer
      // by using the global media store to pause all audio
      try {
        const globalMediaStore =
          require("../useGlobalMediaStore").useGlobalMediaStore;
        if (globalMediaStore) {
          const state = globalMediaStore.getState();
          // Pause all audio that's currently playing
          Object.keys(state.playingAudio || {}).forEach((audioKey) => {
            if (state.playingAudio[audioKey]) {
              state.pauseAudio(audioKey);
            }
          });
        }
      } catch (error) {
        // no-op - global media store might not be available
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
        isPlaying: track.isVirtual ? shouldPlayImmediately : false,
        isLoading: track.isVirtual ? false : true,
        position: 0,
        progress: 0,
        duration: trackDurationToMs(track.duration),
        soundInstance: null,
      });

      // If this is a virtual track (played by external player), don't load audio here
      if (track.isVirtual) {
        return;
      }

      try {
        // Configure audio mode for background playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true, // Enable background playback
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const source = normalizeAudioSource(track.audioUrl);

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
              // Professional audio store implementation: Batch and throttle updates
              // to prevent React's maximum update depth exceeded errors
              const prev = get();
              const newDuration = resolveAudioDurationMs({
                playerDurationMs: status.durationMillis,
                knownMs: prev.duration,
                trackDurationSec: prev.currentTrack?.duration,
              });
              const newProgress =
                newDuration > 0 ? newPosition / newDuration : 0;

              const now = Date.now();
              const lastTs = (prev as any).__lastStatusUpdateTs || 0;

              // More conservative update logic to prevent cascading renders
              const timeSinceLastUpdate = now - lastTs;
              const positionChangedSignificantly =
                Math.abs(prev.position - newPosition) > 1000; // 1 second threshold
              const playingChanged = prev.isPlaying !== status.isPlaying;
              const durationChanged =
                newDuration > 0 && prev.duration !== newDuration;

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
                if (
                  shouldUpdatePosition &&
                  (Math.abs(prev.position - newPosition) > 50 || // At least 50ms difference
                    Math.abs(prev.progress - newProgress) > 0.001) // Or progress changed meaningfully
                ) {
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
                  set({
                    __isAdvancing: true,
                    __completionTimeout: true,
                  } as any);

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
                        __completionTimeoutId: null,
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
          duration: resolveAudioDurationMs({
            playerDurationMs: 0,
            knownMs: trackDurationToMs(track.duration),
            trackDurationSec: track.duration,
          }),
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
  };
}
