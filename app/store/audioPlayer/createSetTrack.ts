import { Audio } from "expo-av";
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
              set({ isPlaying: true });
            }
            return;
          }
        } catch (error) {
          console.warn("Error checking existing track status:", error);
        }
      }

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
        duration: trackDurationToMs(track.duration),
        soundInstance: null,
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
            const newDuration = resolveAudioDurationMs({
              playerDurationMs: status.durationMillis,
              knownMs: prev.duration,
              trackDurationSec: prev.currentTrack?.duration,
            });

            if (status.didJustFinish) {
              set({
                isPlaying: false,
                progress: 0,
                position: 0,
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

            if (!status.isPlaying && !prev.isPlaying) return;

            const newPosition = status.positionMillis || 0;
            const newProgress =
              newDuration > 0
                ? Math.max(0, Math.min(1, newPosition / newDuration))
                : 0;
            const now = Date.now();
            const lastTs = (prev as any).__lastStatusUpdateTs || 0;
            const timeSinceLastUpdate = now - lastTs;
            const positionChangedSignificantly =
              Math.abs(prev.position - newPosition) > 1000;
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
              (Math.abs(prev.position - newPosition) > 50 ||
                Math.abs(prev.progress - newProgress) > 0.001)
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

        set({
          soundInstance: sound,
          isLoading: false,
          duration: resolveAudioDurationMs({
            playerDurationMs: 0,
            knownMs: trackDurationToMs(track.duration),
            trackDurationSec: track.duration,
          }),
          isPlaying: shouldPlayImmediately,
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
