/**
 * Last playhead per playback URL so a feed card can pause off-screen
 * and resume from the same second instead of jumping back to 0.
 */
import { fixOverEncodedMediaUrl } from "../../../shared/utils/videoUrlManager";

const playheads = new Map<string, number>();
const MAX = 80;

function playheadKey(url: string | null | undefined): string | null {
  if (!url) return null;
  return fixOverEncodedMediaUrl(url);
}

export function savePlayhead(url: string | null | undefined, seconds: number): void {
  const key = playheadKey(url);
  if (!key || !(seconds > 0.15) || !Number.isFinite(seconds)) return;
  playheads.set(key, seconds);
  if (playheads.size > MAX) {
    const oldest = playheads.keys().next().value;
    if (oldest) playheads.delete(oldest);
  }
}

export function getPlayhead(url: string | null | undefined): number {
  const key = playheadKey(url);
  if (!key) return 0;
  return playheads.get(key) ?? 0;
}

export function clearPlayhead(url: string | null | undefined): void {
  const key = playheadKey(url);
  if (!key) return;
  playheads.delete(key);
}
