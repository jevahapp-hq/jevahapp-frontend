/**
 * IG / TikTok–style session policy
 *
 * Rules:
 * 1. Guest (no Bearer) → never hit auth endpoints; never "logout".
 * 2. Outage (5xx / 429 / network / infra 401 masquerading as Mongo) → keep session,
 *    soft-fail UI, retry later.
 * 3. Hard session death → only after refresh fails with a real auth reject
 *    (expired / revoked / user gone). Then wipe local identity once.
 */

export type SessionDecision =
  | "guest"
  | "keep_session"
  | "end_session";

export type AuthFailureContext = "request" | "refresh" | "socket";

/** HTTP statuses that mean outage / throttle — never end the session. */
export function isOutageStatus(status: number): boolean {
  return (
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status >= 500
  );
}

export function isGuestNoTokenError(
  message: string | undefined | null
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("no token provided") ||
    m.includes("token not provided") ||
    m.includes("missing authorization") ||
    m.includes("missing auth") ||
    (m.includes("authorization header") && m.includes("required"))
  );
}

/**
 * Infra / Mongo-not-ready messages wrongly returned as 401 by some backends.
 * Compat shim until API returns 503 for these.
 */
export function isTransientBackendAuthError(
  message: string | undefined | null
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("buffercommands") ||
    m.includes("before initial connection is complete") ||
    m.includes("await mongoose.connect") ||
    m.includes("mongoose.connect") ||
    (m.includes("mongodb") && m.includes("connection")) ||
    m.includes("initial connection is complete") ||
    m.includes("server selection timed out") ||
    m.includes("econnrefused") ||
    m.includes("enotfound") ||
    m.includes("network error") ||
    m.includes("temporarily unavailable") ||
    m.includes("service unavailable") ||
    m.includes("fetch_error") ||
    m.includes("failed to retrieve")
  );
}

export function isHardAuthFailureMessage(
  message: string | undefined | null
): boolean {
  if (!message) return false;
  if (isTransientBackendAuthError(message)) return false;
  if (isGuestNoTokenError(message)) return false;
  const m = message.toLowerCase();
  return (
    m.includes("user not found") ||
    m.includes("invalid refresh") ||
    m.includes("jwt expired") ||
    m.includes("token expired") ||
    m.includes("session expired") ||
    m.includes("authentication failed") ||
    (m.includes("refresh token") && m.includes("invalid")) ||
    (m.includes("invalid token") &&
      !m.includes("findone") &&
      !m.includes("buffer")) ||
    (m.includes("unauthorized") &&
      !m.includes("findone") &&
      !isGuestNoTokenError(m))
  );
}

export function authFailureTextFromBody(body: unknown): string {
  if (body == null) return "";
  if (typeof body === "string") return body;
  try {
    const o = body as Record<string, unknown>;
    const parts = [o.message, o.detail, o.error, o.code]
      .filter((x) => typeof x === "string" && x.trim())
      .map((x) => String(x));
    if (parts.length) return parts.join(" | ");
    return JSON.stringify(body);
  } catch {
    return String(body);
  }
}

/**
 * Classify an HTTP auth-related failure the way IG/TikTok would.
 *
 * - No bearer → guest
 * - 5xx / 429 / network → keep
 * - 401/402 + transient infra text → keep (BE should use 503)
 * - 401/402 + hard auth (or empty body on refresh) → end session
 */
export function classifySessionFailure(opts: {
  status: number;
  bodyOrMessage?: unknown;
  hadBearerToken: boolean;
  context?: AuthFailureContext;
}): SessionDecision {
  const { status, bodyOrMessage, hadBearerToken, context = "request" } = opts;

  if (!hadBearerToken) {
    return "guest";
  }

  if (isOutageStatus(status)) {
    return "keep_session";
  }

  // Non-auth HTTP (404 etc.) never ends session
  if (status !== 401 && status !== 402) {
    return "keep_session";
  }

  const text = authFailureTextFromBody(bodyOrMessage);

  if (isGuestNoTokenError(text)) {
    return "guest";
  }

  if (isTransientBackendAuthError(text)) {
    if (__DEV__) {
      console.warn(
        "⚠️ Session keep: infra/Mongo 401 (should be 503 on API) —",
        context
      );
    }
    return "keep_session";
  }

  // Refresh with empty body + 401 → classic expired JWT (IG hard logout)
  if (context === "refresh" && !text.trim()) {
    return "end_session";
  }

  if (isHardAuthFailureMessage(text)) {
    return "end_session";
  }

  // Ambiguous 401 with a token: keep session on request probes;
  // on refresh, prefer ending only if we know it's hard — else keep (safer UX)
  if (context === "refresh") {
    // Unknown refresh 401 with some body that isn't hard → keep (outage-shaped)
    if (text.trim() && !isHardAuthFailureMessage(text)) {
      return "keep_session";
    }
    // Empty already handled; leftover unknown → end (refresh is the source of truth)
    return "end_session";
  }

  // Socket / request ambiguous 401 → keep; next authenticated call + refresh decides
  return "keep_session";
}

/** @deprecated Prefer classifySessionFailure — kept for call-site compatibility */
export function shouldForceLogoutOnAuthFailure(
  status: number,
  bodyOrMessage: unknown
): boolean {
  return (
    classifySessionFailure({
      status,
      bodyOrMessage,
      hadBearerToken: true,
      context: "refresh",
    }) === "end_session"
  );
}

/** Soft-log helper for expected guest / outage failures (no ERROR stacks). */
export function logSoftAuthFailure(
  label: string,
  decision: SessionDecision,
  detail?: string
): void {
  if (!__DEV__) return;
  if (decision === "guest") {
    console.warn(`⚠️ ${label} (guest — skip auth)`);
  } else if (decision === "keep_session") {
    console.warn(`⚠️ ${label} (outage — keeping session)`, detail || "");
  }
}
