/**
 * Thrown when the backend rejects an interaction with HTTP 429.
 * Callers should roll back optimistic UI and enforce a short cooldown —
 * never fall back to local storage for authenticated content.
 */
export class RateLimitError extends Error {
  readonly status = 429;
  readonly retryAfterMs: number;

  constructor(
    message = "Too many requests. Please wait a moment before liking again.",
    retryAfterMs = 3000
  ) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = Math.max(1000, retryAfterMs);
  }
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return (
    error instanceof RateLimitError ||
    (error instanceof Error &&
      (error.name === "RateLimitError" ||
        /too many requests/i.test(error.message)))
  );
}

/** Parse Retry-After header (seconds or HTTP-date) into milliseconds. */
export function parseRetryAfterMs(
  header: string | null,
  fallbackMs = 3000
): number {
  if (!header) return fallbackMs;
  const asSeconds = Number(header);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.max(1000, Math.round(asSeconds * 1000));
  }
  const asDate = Date.parse(header);
  if (Number.isFinite(asDate)) {
    return Math.max(1000, asDate - Date.now());
  }
  return fallbackMs;
}
