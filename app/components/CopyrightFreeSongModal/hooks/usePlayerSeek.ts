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
  const displayProgress = isSeeking ? seekProgress : audioProgress;
  const displayPositionMs = isSeeking ? seekProgress * durationMs : audioPosition;

  return { durationMs, displayProgress, displayPositionMs };
}
