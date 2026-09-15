export type PendingSignup = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

let pending: PendingSignup | null = null;

function firstParam(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (value == null) return "";
  return String(value);
}

export function normalizeAuthEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function normalizeVerificationCode(code: string): string {
  return String(code || "").trim();
}

/** Keep the emailed code as-is. Full OTP autofill always fills boxes 0–5. */
export function fillVerificationBoxes(
  current: string[],
  text: string,
  index: number
): string[] {
  const sanitized = String(text || "").replace(/[^A-Za-z0-9]/g, "");
  if (sanitized.length >= 6) {
    return sanitized.slice(0, 6).split("");
  }
  if (sanitized.length > 1) {
    const next = current.slice();
    let writeIndex = index;
    for (let i = 0; i < sanitized.length && writeIndex < 6; i += 1) {
      next[writeIndex] = sanitized[i];
      writeIndex += 1;
    }
    return next;
  }
  const next = current.slice();
  if (index >= 0 && index < 6) {
    next[index] = sanitized.slice(-1);
  }
  return next;
}

export function shouldLoginAfterVerifyFailure(
  status: number,
  message?: string
): boolean {
  const m = String(message || "").toLowerCase();
  return (
    status === 429 ||
    m.includes("too many") ||
    m.includes("already verified") ||
    m.includes("already been verified")
  );
}

export function setPendingSignup(data: PendingSignup) {
  pending = {
    email: normalizeAuthEmail(data.email),
    password: data.password,
    firstName: String(data.firstName || "").trim(),
    lastName: String(data.lastName || "").trim(),
  };
}

export function getPendingSignup(): PendingSignup | null {
  return pending;
}

export function clearPendingSignup() {
  pending = null;
}

export function resolveSignupCredentials(params: Record<string, unknown>) {
  const stored = getPendingSignup();
  const email =
    stored?.email || normalizeAuthEmail(firstParam(params.emailAddress));
  const password = stored?.password || firstParam(params.password);
  const firstName = stored?.firstName || firstParam(params.firstName);
  const lastName = stored?.lastName || firstParam(params.lastName);
  return { email, password, firstName, lastName };
}
