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
      const { default: SecureStore } = await import("expo-secure-store");
      await SecureStore.deleteItemAsync("jwt");
    } catch {
      // continue
    }
  })().finally(() => {
    clearing = null;
  });

  return clearing;
}

/**
 * Fire once per "session death" until auth is restored / overlay dismissed.
 * Clears tokens + cached user immediately, then shows session-expired UX.
 */
export function notifySessionExpired(): void {
  if (notified) return;
  notified = true;

  // Do not wait — identity must drop even if overlay is slow
  void clearLocalSessionState();

  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // no-op
    }
  });
}

/**
 * True when a 401/402 body means the account/session is dead on this API
 * (stale prod token on local Mongo, deleted user, invalid refresh, etc.).
 */
export function isHardAuthFailureMessage(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("user not found") ||
    m.includes("invalid refresh") ||
    m.includes("invalid token") ||
    m.includes("jwt expired") ||
    m.includes("token expired") ||
    m.includes("session expired") ||
    m.includes("unauthorized") ||
    m.includes("authentication failed")
  );
}

export function resetSessionExpiredGate(): void {
  notified = false;
}

export function subscribeSessionExpired(
  listener: SessionExpiredListener
): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
