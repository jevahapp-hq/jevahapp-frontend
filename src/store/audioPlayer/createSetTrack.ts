import { Audio } from "expo-av";
import {
  audioLoadErrorMessage,
  isUnavailableAudioError,
} from "./audioLoadError";
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

      if (currentTrack?.id === track.id && soundInstance) {
        try {
          const status = await soundInstance.getStatusAsync();
          if (status.isLoaded) {
            if (shouldPlayImmediately && !status.isPlaying) {
              await soundInstance.playAsync();
              set({ isPlaying: true, isSessionActive: true });
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

      if (soundInstance) {
        try {
          await soundInstance.unloadAsync();
        } catch (error) {
          console.warn("Error unloading previous audio:", error);
        }
      }

      if (get().__loadGeneration !== loadGeneration) return;

      // `setTrack` is the only entry point that builds an engine, so it is the
      // one place a session legitimately begins.
      set({
        currentTrack: track,
        isPlaying: false,
        isLoading: true,
        isSessionActive: true,
        loadError: null,
        position: 0,
        progress: 0,
        duration: trackDurationToMs(track.duration),
        soundInstance: null,
        __loadGeneration: loadGeneration,
        __lastStatusUpdateTs: 0,
      });

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        try {
          const videoStore =
            require("../useGlobalVideoStore").useGlobalVideoStore.getState();
          videoStore.pauseAllVideosImperatively?.();
        } catch {
          // no-op
        }

        const source = normalizeAudioSource(track.audioUrl);

        const { sound } = await Audio.Sound.createAsync(
          source,
          {
            shouldPlay: shouldPlayImmediately,
            isMuted: get().isMuted,
            progressUpdateIntervalMillis: 250,
            isLooping: false,
          },
          (status) => {
            if (!status.isLoaded) return;

            const prev = get();
            // An unloaded sound can emit one last callback. It must never
            // overwrite the position/duration of the track that replaced it.
            if (
              prev.__loadGeneration !== loadGeneration ||
              prev.currentTrack?.id !== track.id
            ) {
              return;
            }
            if (
              !status.didJustFinish &&
              (prev.__ignoreStatusUntil || 0) > Date.now()
            ) {
              return;
            }
            const newDuration = resolveAudioDurationMs({
              playerDurationMs: status.durationMillis,
              knownMs: prev.duration,
              trackDurationSec: prev.currentTrack?.duration,
            });

            if (status.didJustFinish) {
              const finishedPosition =
                newDuration || status.positionMillis || prev.duration;
              set({
                isPlaying: false,
                progress: finishedPosition > 0 ? 1 : 0,
                position: finishedPosition,
                duration: newDuration || prev.duration,
              });
              const st: any = get();
              if (st.__isAdvancing || st.__completionTimeout) return;
              set({
                __isAdvancing: true,
                __completionTimeout: true,
              } as any);
              if (st.__completionTimeoutId) {
                clearTimeout(st.__completionTimeoutId);
              }
              const timeoutId = setTimeout(async () => {
                try {
                  await get().next();
                } finally {
                  set({
                    __isAdvancing: false,
                    __completionTimeout: false,
                    __completionTimeoutId: null,
                  } as any);
                }
              }, 100);
              set({ __completionTimeoutId: timeoutId } as any);
              return;
            }

            const newPosition = status.positionMillis || 0;
            const newProgress =
              newDuration > 0
                ? Math.max(0, Math.min(1, newPosition / newDuration))
                : 0;
            const now = Date.now();
            const lastTs = (prev as any).__lastStatusUpdateTs || 0;
            const timeSinceLastUpdate = now - lastTs;
            const positionChangedSignificantly =
              Math.abs(prev.position - newPosition) > 400;
            const playingChanged = prev.isPlaying !== status.isPlaying;
            const durationChanged =
              newDuration > 0 && prev.duration !== newDuration;
            const shouldUpdatePosition =
              timeSinceLastUpdate > 250 || positionChangedSignificantly;

            if (!shouldUpdatePosition && !playingChanged && !durationChanged) {
              return;
            }

            const updates: Record<string, unknown> = {};
            if (
              shouldUpdatePosition &&
              (Math.abs(prev.position - newPosition) > 150 ||
                Math.abs(prev.progress - newProgress) > 0.005)
            ) {
              updates.position = newPosition;
              updates.progress = newProgress;
            }
            if (playingChanged) {
              updates.isPlaying = status.isPlaying;
            }
            if (durationChanged) {
              updates.duration = newDuration;
            }
            if (Object.keys(updates).length > 0) {
              updates.__lastStatusUpdateTs = now;
              set(updates as any);
            }
          }
        );

        if (
          get().__loadGeneration !== loadGeneration ||
          get().currentTrack?.id !== track.id
        ) {
          // A newer request won while this remote source was loading.
          void sound.unloadAsync().catch(() => {});
          return;
        }

        set({
          soundInstance: sound,
          isLoading: false,
          loadError: null,
          duration: resolveAudioDurationMs({
            playerDurationMs: 0,
            knownMs: trackDurationToMs(track.duration),
            trackDurationSec: track.duration,
          }),
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

        const failed = { ...(get().__failedTrackIds || {}), [track.id]: true as const };
        set({
          isLoading: false,
          isPlaying: false,
          soundInstance: null,
          loadError: message,
          __failedTrackIds: failed,
        });

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
