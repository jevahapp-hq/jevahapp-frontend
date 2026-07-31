/**
 * Session cache for discovered video durations (ms).
 * Once the player/backend reports a length, keep it for that media id
 * so the scrubber doesn't fall back to "--:--" on remount.
 */
const durationByMediaId = new Map<string, number>();

const MIN_MS = 500;
const MAX_MS = 24 * 60 * 60 * 1000;

export function getCachedDurationMs(mediaId?: string | null): number {
  if (!mediaId) return 0;
  return durationByMediaId.get(String(mediaId)) || 0;
}

export function setCachedDurationMs(
  mediaId: string | undefined | null,
  durationMs: number
): void {
  if (!mediaId) return;
  if (!Number.isFinite(durationMs) || durationMs < MIN_MS) return;
  const clamped = Math.min(durationMs, MAX_MS);
  const prev = durationByMediaId.get(String(mediaId)) || 0;
  // Prefer longer confirmed duration (avoid shrinking from a bad provisional)
  if (clamped >= prev) {
    durationByMediaId.set(String(mediaId), clamped);
  }
}
