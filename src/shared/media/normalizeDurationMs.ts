/**
 * Coerce a media `duration` field to milliseconds.
 *
 * The backend is inconsistent: `duration` arrives as a number of seconds, a
 * numeric string, occasionally already in milliseconds, and sometimes as
 * `"mm:ss"` / `"hh:mm:ss"`. Call sites were doing `video.duration * 1000`,
 * which yields `NaN` for every non-numeric form and silently inflates a value
 * that was already in ms.
 */

/** Longer than this in "seconds" is certainly already milliseconds. */
const SECONDS_CEILING = 24 * 60 * 60;
const MAX_MS = 24 * 60 * 60 * 1000;
/** Below this we treat the value as noise rather than a real duration. */
const MIN_MS = 500;

function fromClock(value: string): number {
  const parts = value.split(":").map((p) => Number(p.trim()));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return 0;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return 0;
}

export function normalizeDurationMs(raw: unknown): number {
  if (raw == null) return 0;

  let n: number;
  if (typeof raw === "number") {
    n = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    if (trimmed.includes(":")) {
      const ms = fromClock(trimmed);
      return ms >= MIN_MS ? Math.min(ms, MAX_MS) : 0;
    }
    n = Number(trimmed);
  } else {
    return 0;
  }

  if (!Number.isFinite(n) || n <= 0) return 0;

  // A plain number is seconds unless it's implausibly large for seconds.
  const ms = n > SECONDS_CEILING ? n : n * 1000;
  return ms >= MIN_MS ? Math.min(ms, MAX_MS) : 0;
}
