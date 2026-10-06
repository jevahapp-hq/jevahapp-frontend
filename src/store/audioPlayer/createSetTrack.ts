import { setAudioModeAsync } from "expo-audio";
import {
  audioLoadErrorMessage,
  isUnavailableAudioError,
} from "./audioLoadError";
import { nativeQueueCanSkip, releaseNativePlaylist, syncNativePlaylist } from "./nativeQueueEngine";
import { resetAudioPlaybackClock, writeAudioPlaybackClock } from "./audioProgressStore";
import { trackDurationToMs } from "./resolveAudioDurationMs";
import { cancelScheduledTrackAdvance } from "./scheduleTrackAdvance";
import { detachStatusSubscription } from "./statusSubscription";
import type {
  AudioPlayerGet,
  AudioPlayerSet,
  AudioTrack,
  GlobalAudioPlayerState,
} from "./types";

let audioModeReady: Promise<void> | null = null;

function ensureAudioSession(): Promise<void> {
  if (!audioModeReady) {
    audioModeReady = setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      audioModeReady = null;
      throw error;
    });
  }
  return audioModeReady;
}

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

      if (
        currentTrack?.id === track.id &&
        soundInstance &&
        nativeQueueCanSkip(get().queue)
      ) {
        try {
          if (soundInstance.isLoaded) {
            if (shouldPlayImmediately) {
              try {
                await soundInstance.seekTo(0);
              } catch (seekError) {
                console.warn("Error restarting current track:", seekError);
              }
              const dur = get().duration;
              resetAudioPlaybackClock(track.id, dur);
              writeAudioPlaybackClock({
                trackId: track.id,
                position: 0,
                progress: 0,
                duration: dur,
              });
              soundInstance.play();
              set({
                isPlaying: true,
                isSessionActive: true,
                position: 0,
                progress: 0,
              });
            }
            return;
          }
        } catch (error) {
          console.warn("Error checking existing track status:", error);
        }
      }

      const loadGeneration = (get().__loadGeneration || 0) + 1;
      // Invalidate the previous engine before its asynchronous teardown. This
      // also makes overlapping setTrack calls deterministic: newest call wins.
      set({ __loadGeneration: loadGeneration });
      cancelScheduledTrackAdvance();

      if (get().__loadGeneration !== loadGeneration) return;

      const queued = get().queue;
      const found = queued.findIndex((item) => item.id === track.id);
      const tracks = found >= 0 ? queued : [track];
      const index = found >= 0 ? found : 0;
      if (found < 0) {
        set({ queue: tracks, currentIndex: 0 });
      }

      const seededDuration = trackDurationToMs(track.duration);
      resetAudioPlaybackClock(track.id, seededDuration);
      set({
        currentTrack: track,
        currentIndex: index,
        isPlaying: false,
        isLoading: true,
        isSessionActive: true,
        loadError: null,
        position: 0,
        progress: 0,
        duration: seededDuration,
        __loadGeneration: loadGeneration,
        __lastStatusUpdateTs: 0,
      });

      try {
        if (!audioModeReady) {
          await ensureAudioSession();
        } else {
          void ensureAudioSession();
        }

        if (get().__loadGeneration !== loadGeneration) return;

        try {
          const videoStore =
            require("../useGlobalVideoStore").useGlobalVideoStore.getState();
          videoStore.pauseAllVideosImperatively?.();
        } catch {
          // no-op
        }

        const engine = syncNativePlaylist({
          get,
          set,
          tracks,
          index,
          play: shouldPlayImmediately,
          generation: loadGeneration,
          muted: get().isMuted,
          repeatMode: get().repeatMode,
        });

        if (
          get().__loadGeneration !== loadGeneration ||
          get().currentTrack?.id !== track.id
        ) {
          return;
        }

        const loadedDuration = trackDurationToMs(track.duration) || get().duration;
        writeAudioPlaybackClock({
          trackId: track.id,
          duration: loadedDuration,
        });
        set({
          soundInstance: engine,
          isLoading: false,
          loadError: null,
          duration: loadedDuration,
          isPlaying: shouldPlayImmediately,
        });
      } catch (error) {
        if (
          get().__loadGeneration !== loadGeneration ||
          get().currentTrack?.id !== track.id
        ) {
          return;
        }
        const message = audioLoadErrorMessage(error, track.title);
        if (__DEV__) {
          console.warn(
            isUnavailableAudioError(error)
              ? `Audio 404: ${track.title}`
              : `Audio load failed: ${track.title}`,
            (error as Error)?.message || error
          );
        }

        detachStatusSubscription(get, set);
        releaseNativePlaylist();
        const failed = {
          ...(get().__failedTrackIds || {}),
          [track.id]: true as const,
        };
        set({
          isLoading: false,
          isPlaying: false,
          soundInstance: null,
          __statusSubscription: null,
          loadError: message,
          __failedTrackIds: failed,
        });
        resetAudioPlaybackClock();

        const { queue, currentIndex } = get();
        for (let i = currentIndex + 1; i < queue.length; i++) {
          const candidate = queue[i];
          if (candidate?.id && !failed[candidate.id]) {
            set({ currentIndex: i });
            await get().setTrack(candidate, true);
            return;
          }
        }
      }
    },
  };
}
