/**
 * Normalize media duration fields to milliseconds.
 * This app's API conventionally stores duration in **seconds**.
 * Values larger than 24h (in seconds) are treated as already-ms.
 */
export function normalizeDurationToMs(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;

  const MAX_MS = 24 * 60 * 60 * 1000;
  // > 86400 cannot be seconds for a single playable clip (24h)
  if (n > 86400) {
    return Math.min(n, MAX_MS);
  }
  return Math.min(n * 1000, MAX_MS);
}
