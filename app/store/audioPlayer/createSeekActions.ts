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
      const { currentTrack, __virtualTrackControls, duration, seek } = get();
      // ✅ If this is a virtual track, use the external player's seek controls
      if (currentTrack?.isVirtual && __virtualTrackControls) {
        // Check if virtual controls have seek method
        if (__virtualTrackControls.seekToProgress) {
          await __virtualTrackControls.seekToProgress(progress);
          return;
        }
      }
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
