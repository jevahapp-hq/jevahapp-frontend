/**
 * Derived seek display values for the song modal player.
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
  const durationMs = audioDuration || (song?.duration ? song.duration * 1000 : 0);
  const rawProgress = isSeeking ? seekProgress : audioProgress;
  const displayProgress = Number.isFinite(rawProgress)
    ? Math.max(0, Math.min(1, rawProgress))
    : 0;
  const displayPositionMs = isSeeking
    ? displayProgress * durationMs
    : Math.max(0, Math.min(audioPosition || 0, durationMs || audioPosition || 0));

  return { durationMs, displayProgress, displayPositionMs };
}
