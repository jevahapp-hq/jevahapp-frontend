/**
 * Session-expired gate + local wipe.
 * Classification lives in authSessionPolicy (IG / TikTok rules).
 */

import {
  authFailureTextFromBody,
  classifySessionFailure,
  isGuestNoTokenError,
  isHardAuthFailureMessage,
  isOutageStatus,
  isTransientBackendAuthError,
  logSoftAuthFailure,
  shouldForceLogoutOnAuthFailure,
  type SessionDecision,
} from "./authSessionPolicy";

export {
  authFailureTextFromBody,
  classifySessionFailure,
  isGuestNoTokenError,
  isHardAuthFailureMessage,
  isOutageStatus,
  isTransientBackendAuthError,
  logSoftAuthFailure,
  shouldForceLogoutOnAuthFailure,
};
export type { SessionDecision };

type SessionExpiredListener = () => void;

let listeners: SessionExpiredListener[] = [];
let notified = false;
let clearing: Promise<void> | null = null;

const SESSION_STORAGE_KEYS = [
  "user",
  "userToken",
  "token",
  "refreshToken",
  "refresh_token",
] as const;

/**
 * Wipe local identity so the UI cannot keep looking "logged in"
 * after the API rejected the session (IG / TikTok style).
 */
export async function clearLocalSessionState(): Promise<void> {
  if (clearing) return clearing;

  clearing = (async () => {
    try {
      const TokenUtils = (await import("./tokenUtils")).default;
      await TokenUtils.clearAuthTokens();
    } catch {
      // continue
    }

    try {
      const { TokenManager } = await import("./api/TokenManager");
      await TokenManager.clearToken();
    } catch {
      // continue
    }

    try {
      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default;
      await AsyncStorage.multiRemove([...SESSION_STORAGE_KEYS]);
    } catch {
      // continue
    }

    try {
      const { clearBackendSessionPresent } = await import("./sessionAuth");
      clearBackendSessionPresent();
    } catch {
      // continue
    }

    try {
      const SecureStore = await import("expo-secure-store");
      if (typeof SecureStore.deleteItemAsync === "function") {
        await SecureStore.deleteItemAsync("jwt");
      }
    } catch {
      // continue
    }
  })().finally(() => {
    clearing = null;
  });

  return clearing;
}

/**
 * Fire once per hard session death until auth is restored / overlay dismissed.
 * Clears tokens + cached user immediately, then shows session-expired UX.
 */
export function notifySessionExpired(): void {
  if (notified) return;
  notified = true;

  void clearLocalSessionState();

  try {
    const { authToast } = require("../components/auth/authToastBus");
    authToast.sessionExpired();
  } catch {
    // optional UI
  }

  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // no-op
    }
  });
}

/**
 * End session only when policy says so (refresh proved identity is dead).
 */
export function endSessionIfNeeded(
  status: number,
  bodyOrMessage: unknown,
  context: "request" | "refresh" | "socket" = "refresh"
): boolean {
  const decision = classifySessionFailure({
    status,
    bodyOrMessage,
    hadBearerToken: true,
    context,
  });
  if (decision !== "end_session") {
    logSoftAuthFailure("Session not ended", decision, String(status));
    return false;
  }
  notifySessionExpired();
  return true;
}

export function resetSessionExpiredGate(): void {
  notified = false;
}

export function subscribeSessionExpired(
  listener: SessionExpiredListener
): () => void {
  listeners.push(listener);
  // Deferred overlay can mount after refresh already ended the session
  // (especially slow in __DEV__). Replay so login redirect still runs.
  if (notified) {
    try {
      listener();
    } catch {
      // no-op
    }
  }
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
