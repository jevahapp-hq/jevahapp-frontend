import { trackDurationToMs } from "@/store/audioPlayer/resolveAudioDurationMs";

/**
 * Derived seek display values for the song modal player.
 * Always prefer position/duration from the playing engine so the bar
 * cannot drift from a stale 0–1 progress field or a seconds/ms mix-up.
 */
export function usePlayerSeek({
  song,
  isSeeking,
  seekProgress,
  audioProgress,
  audioDuration,
  audioPosition,
}: {
  song: any;
  isSeeking: boolean;
  seekProgress: number;
  audioProgress: number;
  audioDuration: number;
  audioPosition: number;
}) {
  const durationMs =
    audioDuration > 0
      ? audioDuration
      : trackDurationToMs(song?.duration);

  if (isSeeking) {
    const displayProgress = Math.max(0, Math.min(1, seekProgress || 0));
    return {
      durationMs,
      displayProgress,
      displayPositionMs: displayProgress * durationMs,
    };
  }

  const fromFields =
    durationMs > 0 && audioPosition > 0
      ? audioPosition / durationMs
      : audioProgress;
  const displayProgress = Number.isFinite(fromFields)
    ? Math.max(0, Math.min(1, fromFields))
    : 0;
  const displayPositionMs =
    durationMs > 0
      ? Math.max(0, Math.min(audioPosition || displayProgress * durationMs, durationMs))
      : Math.max(0, audioPosition || 0);

  return { durationMs, displayProgress, displayPositionMs };
}
