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

/** Convenience presets for common auth copy */
export const authToast = {
  wrongPassword(detail?: string) {
    showAuthToast({
      variant: "error",
      title: "Wrong password",
      message: detail || "Check your email and password, then try again.",
    });
  },
  loginFailed(detail?: string) {
    showAuthToast({
      variant: "error",
      title: "Couldn’t sign in",
      message: detail || "Invalid email or password.",
    });
  },
  sessionExpired() {
    showAuthToast({
      variant: "warning",
      title: "Session expired",
      message: "For your security, please sign in again.",
      durationMs: 3800,
    });
  },
  resetCodeSent(email?: string) {
    showAuthToast({
      variant: "success",
      title: "Reset code sent",
      message: email
        ? `We sent a code to ${email}. Check your inbox.`
        : "Check your email for the reset code.",
      durationMs: 3600,
    });
  },
  passwordResetSuccess() {
    showAuthToast({
      variant: "success",
      title: "Password updated",
      message: "You can sign in with your new password.",
      durationMs: 3200,
    });
  },
  resetFailed(detail?: string) {
    showAuthToast({
      variant: "error",
      title: "Reset failed",
      message: detail || "Please try again or request a new code.",
    });
  },
  validation(title: string, message: string) {
    showAuthToast({ variant: "info", title, message, durationMs: 2800 });
  },
  error(title: string, message?: string) {
    showAuthToast({ variant: "error", title, message });
  },
  success(title: string, message?: string) {
    showAuthToast({ variant: "success", title, message });
  },
};
