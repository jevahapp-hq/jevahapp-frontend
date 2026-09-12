import {
  clampSeekPositionMs,
  resolveAudioDurationMs,
} from "./resolveAudioDurationMs";
import { writeAudioPlaybackClock } from "./audioProgressStore";
import type {
  AudioPlayerGet,
  AudioPlayerSet,
  GlobalAudioPlayerState,
} from "./types";

export function createSeekActions(
  get: AudioPlayerGet,
  set: AudioPlayerSet
): Pick<GlobalAudioPlayerState, "seek" | "seekToProgress"> {
  return {
    seek: async (position: number) => {
      const { soundInstance, duration, currentTrack } = get();
      const effectiveDuration = resolveAudioDurationMs({
        playerDurationMs: duration,
        trackDurationSec: currentTrack?.duration,
      });
      if (!soundInstance || effectiveDuration <= 0) return;

      const clampedPosition = clampSeekPositionMs(position, effectiveDuration);
      const progress = clampedPosition / effectiveDuration;
      // Paint the knob immediately — native seek on remote files is slow.
      writeAudioPlaybackClock({
        trackId: currentTrack?.id ?? null,
        position: clampedPosition,
        progress,
        duration: effectiveDuration,
      });
      set({
        position: clampedPosition,
        progress,
        duration: effectiveDuration,
        __ignoreStatusUntil: Date.now() + 450,
      });
      void soundInstance.seekTo(clampedPosition / 1000).catch((error) => {
        if (__DEV__) {
          console.warn("Audio seek failed:", (error as Error)?.message || error);
        }
      });
    },

    seekToProgress: async (progress: number) => {
      const { duration, seek, currentTrack } = get();
      const effectiveDuration = resolveAudioDurationMs({
        playerDurationMs: duration,
        trackDurationSec: currentTrack?.duration,
      });
      if (effectiveDuration > 0) {
        const clamped = Math.max(0, Math.min(progress, 1));
        await seek(clamped * effectiveDuration);
      }
    },
  };
}
