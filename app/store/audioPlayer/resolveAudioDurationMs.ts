/**
 * Resolve audio duration in milliseconds without wiping a known good value.
 * expo-av often reports durationMillis === 0 for remote MP3s until metadata loads
 * (or forever for some CDN responses) — never regress a seeded BE duration.
 */

/** Track.duration from API is conventionally seconds. */
export function trackDurationToMs(durationSec: number | undefined | null): number {
  const sec = Number(durationSec) || 0;
  if (sec <= 0) return 0;
  // Heuristic: values > 10000 are already ms (rare legacy)
  if (sec > 10000) return Math.round(sec);
  return Math.round(sec * 1000);
}

/**
 * Prefer player-reported duration when > 0; else keep known/fallback.
 * Never returns a lower value than `knownMs` when player reports 0.
 */
export function resolveAudioDurationMs(params: {
  playerDurationMs?: number | null;
  knownMs?: number | null;
  trackDurationSec?: number | null;
}): number {
  const player = Number(params.playerDurationMs) || 0;
  if (player > 0) return Math.round(player);

  const known = Number(params.knownMs) || 0;
  if (known > 0) return Math.round(known);

  return trackDurationToMs(params.trackDurationSec);
}

export function clampSeekPositionMs(
  positionMs: number,
  durationMs: number
): number {
  if (durationMs > 0) {
    return Math.max(0, Math.min(positionMs, Math.max(0, durationMs - 50)));
  }
  return Math.max(0, positionMs);
}
