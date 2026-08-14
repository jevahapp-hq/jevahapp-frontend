import {
  clampSeekPositionMs,
  resolveAudioDurationMs,
} from "./resolveAudioDurationMs";
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
      try {
        await soundInstance.setPositionAsync(clampedPosition);
        const progress = clampedPosition / effectiveDuration;
        set({
          position: clampedPosition,
          progress,
          duration: effectiveDuration,
        });
      } catch (error) {
        console.error("Error seeking audio:", error);
      }
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
