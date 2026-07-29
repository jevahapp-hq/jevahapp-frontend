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

/**
 * Backend accepted the request transport-wise but failed the operation
 * (5xx / LIKE_OPERATION_FAILED). Do not offline-queue — roll back UI.
 */
export class LikeServerError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(
    message = "Failed to toggle like",
    status = 500,
    code?: string
  ) {
    super(message);
    this.name = "LikeServerError";
    this.status = status;
    this.code = code;
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

export function isLikeServerError(error: unknown): error is LikeServerError {
  return (
    error instanceof LikeServerError ||
    (error instanceof Error && error.name === "LikeServerError")
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

/** Comment create / edit / delete API errors (backend codes). */
export class CommentApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "CommentApiError";
    this.status = status;
    this.code = code;
  }
}

export function isCommentApiError(error: unknown): error is CommentApiError {
  return (
    error instanceof CommentApiError ||
    (error instanceof Error && error.name === "CommentApiError")
  );
}

export function messageForCommentErrorCode(
  code: string | undefined,
  status: number,
  fallback?: string
): string {
  switch (code) {
    case "COMMENT_CONTENT_REQUIRED":
      return "Add text or a photo to save this comment.";
    case "COMMENT_FORBIDDEN":
      return "You can only edit or delete your own comments.";
    case "COMMENT_EDIT_WINDOW_EXPIRED":
      return "Edit window expired (comments can be edited within 24 hours).";
    case "COMMENT_NOT_FOUND":
      return "This comment is no longer available.";
    case "UPLOAD_FAILED":
      return "Couldn't upload the photo. Try again.";
    case "INVALID_IMAGE_URL":
      return "That photo link isn't valid.";
    case "COMMENT_IMAGE_UNSUPPORTED":
      return "Photos need a server update. You can still send text comments.";
    default:
      return (
        fallback ||
        (status === 403
          ? "You can't do that on this comment."
          : status === 404
            ? "This comment is no longer available."
            : "Something went wrong. Please try again.")
      );
  }
}
