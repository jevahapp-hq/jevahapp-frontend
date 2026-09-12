/**
 * Last playhead per playback URL so a feed card can pause off-screen
 * and resume from the same second instead of jumping back to 0.
 */
const playheads = new Map<string, number>();
const MAX = 80;

export function savePlayhead(url: string | null | undefined, seconds: number): void {
  if (!url || !(seconds > 0.15) || !Number.isFinite(seconds)) return;
  playheads.set(url, seconds);
  if (playheads.size > MAX) {
    const oldest = playheads.keys().next().value;
    if (oldest) playheads.delete(oldest);
  }
}

export function getPlayhead(url: string | null | undefined): number {
  if (!url) return 0;
  return playheads.get(url) ?? 0;
}

export function clearPlayhead(url: string | null | undefined): void {
  if (!url) return;
  playheads.delete(url);
}
