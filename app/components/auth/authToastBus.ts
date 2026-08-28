/**
 * Imperative auth toast bus — call from hooks, screens, or sessionExpired
 * without needing React context at the call site.
 */
export type AuthToastVariant = "error" | "success" | "warning" | "info";

export type AuthToastPayload = {
  title: string;
  message?: string;
  variant?: AuthToastVariant;
  durationMs?: number;
};

type Listener = (payload: AuthToastPayload) => void;

let listener: Listener | null = null;

export function setAuthToastListener(fn: Listener | null): void {
  listener = fn;
}

export function showAuthToast(payload: AuthToastPayload): void {
  try {
    listener?.(payload);
  } catch {
    // never block auth flows
  }
}

/** Strip API / Clerk jargon into something a human can act on. */
export function humanizeAuthError(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const t = String(raw).trim();
  if (!t) return undefined;
  const m = t.toLowerCase();

  if (
    m.includes("password") ||
    m.includes("credentials") ||
    m.includes("incorrect") ||
    m.includes("invalid email or password") ||
    m.includes("invalid_credentials") ||
    m.includes("form_password") ||
    m.includes("identifier")
  ) {
    return undefined; // presets own the copy
  }
  if (m.includes("too many") || m.includes("rate") || m.includes("locked")) {
    return "Too many tries. Wait a moment, then try again.";
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("timeout")) {
    return "Check your connection and try again.";
  }
  if (m.includes("verify") || m.includes("unverified")) {
    return "Confirm your email, then try signing in again.";
  }
  // Don't surface raw stack / status blobs
  if (t.length > 120 || /[{}\[\]]/.test(t) || /http\s?\d{3}/i.test(t)) {
    return undefined;
  }
  return t;
}

/** Convenience presets — short, clear, no jargon */
export const authToast = {
  wrongPassword(_detail?: string) {
    showAuthToast({
      variant: "error",
      title: "That password didn’t match",
      message: "Double-check it, or tap Forgot password to reset.",
      durationMs: 4200,
    });
  },
  loginFailed(detail?: string) {
    const friendly = humanizeAuthError(detail);
    showAuthToast({
      variant: "error",
      title: "Couldn’t sign you in",
      message:
        friendly ||
        "Email or password looks off. Check them and try again.",
      durationMs: 4200,
    });
  },
  sessionExpired() {
    showAuthToast({
      variant: "warning",
      title: "You’re signed out",
      message: "Your session ended. Sign in again to keep going.",
      durationMs: 4000,
    });
  },
  resetCodeSent(email?: string) {
    showAuthToast({
      variant: "success",
      title: "Check your inbox",
      message: email
        ? `We sent a reset code to ${email}.`
        : "We sent a reset code to your email.",
      durationMs: 3800,
    });
  },
  passwordResetSuccess() {
    showAuthToast({
      variant: "success",
      title: "Password updated",
      message: "You’re all set — sign in with your new password.",
      durationMs: 3400,
    });
  },
  resetFailed(detail?: string) {
    showAuthToast({
      variant: "error",
      title: "Couldn’t reset password",
      message:
        humanizeAuthError(detail) ||
        "Try again, or request a fresh code.",
      durationMs: 4000,
    });
  },
  validation(title: string, message: string) {
    showAuthToast({
      variant: "info",
      title,
      message,
      durationMs: 3000,
    });
  },
  error(title: string, message?: string) {
    showAuthToast({
      variant: "error",
      title,
      message: humanizeAuthError(message) || message,
      durationMs: 4000,
    });
  },
  success(title: string, message?: string) {
    showAuthToast({
      variant: "success",
      title,
      message,
      durationMs: 3200,
    });
  },
};
