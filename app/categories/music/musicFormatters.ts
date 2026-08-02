export function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Format player position/duration from milliseconds. */
export function formatTimeMs(milliseconds: number): string {
  if (!milliseconds || !Number.isFinite(milliseconds)) return "0:00";
  const totalSeconds = Math.floor(milliseconds / 1000);
  return formatDuration(totalSeconds);
}
