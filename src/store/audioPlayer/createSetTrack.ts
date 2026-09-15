import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioStatus,
} from "expo-audio";
import { releaseAudioPlayer } from "../../shared/audio/releaseAudioPlayer";
import {
  getAudioPlaybackClock,
  getLastAudioProgressCommitTs,
  resetAudioPlaybackClock,
  writeAudioPlaybackClock,
} from "./audioProgressStore";
import {
  audioLoadErrorMessage,
  isUnavailableAudioError,
} from "./audioLoadError";
import { normalizeAudioSource } from "./normalizeAudioSource";
import { decidePlaybackTick } from "./playbackStatusTick";
import {
  resolveAudioDurationMs,
  trackDurationToMs,
} from "./resolveAudioDurationMs";
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

      if (currentTrack && currentTrack.id !== track.id && soundInstance) {
        try {
          if (soundInstance.playing) {
            soundInstance.pause();
          }
          detachStatusSubscription(get, set);
          releaseAudioPlayer(soundInstance);
        } catch (error) {
          console.warn("Error stopping previous track:", error);
        }
      }

      if (currentTrack?.id === track.id && soundInstance) {
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

      if (soundInstance) {
        try {
          detachStatusSubscription(get, set);
          releaseAudioPlayer(soundInstance);
        } catch (error) {
          console.warn("Error unloading previous audio:", error);
        }
      }

      if (get().__loadGeneration !== loadGeneration) return;

      // `setTrack` is the only entry point that builds an engine, so it is the
      // one place a session legitimately begins.
      const seededDuration = trackDurationToMs(track.duration);
      resetAudioPlaybackClock(track.id, seededDuration);
      set({
        currentTrack: track,
        isPlaying: false,
        isLoading: true,
        isSessionActive: true,
        loadError: null,
        position: 0,
        progress: 0,
        duration: seededDuration,
        soundInstance: null,
        __loadGeneration: loadGeneration,
        __lastStatusUpdateTs: 0,
      });

      try {
        // First sermon of the session waits for audio mode; later switches play immediately.
        if (!audioModeReady) {
          await ensureAudioSession();
        } else {
          void ensureAudioSession();
        }

        try {
          const videoStore =
            require("../useGlobalVideoStore").useGlobalVideoStore.getState();
          videoStore.pauseAllVideosImperatively?.();
        } catch {
          // no-op
        }

        const source = normalizeAudioSource(track.audioUrl);
        // 250ms is enough for a progress bar; faster native ticks only
        // starve the JS thread that play/pause has to run on.
        const player = createAudioPlayer(source, { updateInterval: 250 });
        player.muted = get().isMuted;
        player.loop = false;

        const subscription = player.addListener(
          "playbackStatusUpdate",
          (status: AudioStatus) => {
            if (!status.isLoaded) return;

            const prev = get();
            // An unloaded player can emit one last callback. It must never
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

            const playerDurationMs = (status.duration || 0) * 1000;
            const newDuration = resolveAudioDurationMs({
              playerDurationMs,
              knownMs: prev.duration,
              trackDurationSec: prev.currentTrack?.duration,
            });

            if (status.didJustFinish) {
              const finishedPosition =
                newDuration ||
                (status.currentTime || 0) * 1000 ||
                prev.duration;
              const finishedProgress = finishedPosition > 0 ? 1 : 0;
              const finishedDuration = newDuration || prev.duration;
              writeAudioPlaybackClock({
                trackId: track.id,
                position: finishedPosition,
                progress: finishedProgress,
                duration: finishedDuration,
              });
              set({
                isPlaying: false,
                progress: finishedProgress,
                position: finishedPosition,
                duration: finishedDuration,
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

            const newPosition = (status.currentTime || 0) * 1000;
            const newProgress =
              newDuration > 0
                ? Math.max(0, Math.min(1, newPosition / newDuration))
                : 0;
            const clock = getAudioPlaybackClock();
            const now = Date.now();
            const tick = decidePlaybackTick({
              now,
              lastCommitTs: getLastAudioProgressCommitTs(),
              prevPosition: clock.position,
              nextPosition: newPosition,
              prevProgress: clock.progress,
              nextProgress: newProgress,
              prevPlaying: prev.isPlaying,
              nextPlaying: status.playing,
              prevDuration: clock.duration || prev.duration,
              nextDuration: newDuration,
            });

            if (
              !tick.commitPosition &&
              !tick.playingChanged &&
              !tick.durationChanged
            ) {
              return;
            }

            if (tick.commitPosition) {
              writeAudioPlaybackClock(
                {
                  trackId: track.id,
                  position: newPosition,
                  progress: newProgress,
                  duration: newDuration || clock.duration,
                },
                now
              );
            }

            const sessionUpdates: Record<string, unknown> = {};
            if (tick.playingChanged) {
              sessionUpdates.isPlaying = status.playing;
            }
            if (tick.durationChanged) {
              sessionUpdates.duration = newDuration;
              if (!tick.commitPosition) {
                writeAudioPlaybackClock({
                  trackId: track.id,
                  duration: newDuration,
                });
              }
            }
            if (Object.keys(sessionUpdates).length > 0) {
              sessionUpdates.__lastStatusUpdateTs = now;
              set(sessionUpdates as any);
            }
          }
        );

        if (
          get().__loadGeneration !== loadGeneration ||
          get().currentTrack?.id !== track.id
        ) {
          // A newer request won while this remote source was loading.
          try {
            subscription.remove();
          } catch {
            // ignore
          }
          releaseAudioPlayer(player);
          return;
        }

        const loadedDuration = resolveAudioDurationMs({
          playerDurationMs: (player.duration || 0) * 1000,
          knownMs: trackDurationToMs(track.duration),
          trackDurationSec: track.duration,
        });
        writeAudioPlaybackClock({
          trackId: track.id,
          duration: loadedDuration,
        });
        set({
          soundInstance: player,
          __statusSubscription: subscription,
          isLoading: false,
          loadError: null,
          duration: loadedDuration,
          isPlaying: shouldPlayImmediately,
        });

        if (shouldPlayImmediately) {
          player.play();
        }
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
