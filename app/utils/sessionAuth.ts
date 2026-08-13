/**
 * Single session model for Jevah.
 *
 * Source of truth: backend JWT (via TokenUtils).
 * Clerk is OAuth-only — exchange Clerk JWT → backend JWT at login, then never
 * use Clerk as the API/boot session gate.
 *
 * Sync MMKV hint (`session-present`) lets Home mount on the auth For You key
 * before async AsyncStorage/SecureStore token resolve (Lite instant paint).
 */
import { appMmkv } from "../../src/shared/cache/mmkvStorage";
import TokenUtils from "./tokenUtils";

const SESSION_PRESENT_KEY = "session-present";

/** Sync: last known "logged in" for feed query key (no await). */
export function hasBackendSessionSync(): boolean {
  try {
    return appMmkv.getString(SESSION_PRESENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBackendSessionPresent(): void {
  try {
    appMmkv.set(SESSION_PRESENT_KEY, "1");
  } catch {
    // no-op
  }
}

export function clearBackendSessionPresent(): void {
  try {
    appMmkv.remove(SESSION_PRESENT_KEY);
  } catch {
    // no-op
  }
}

/** True when a backend session JWT exists in any storage slot. */
export async function hasBackendSession(): Promise<boolean> {
  const token = await TokenUtils.getAuthToken();
  if (token) markBackendSessionPresent();
  else clearBackendSessionPresent();
  return !!token;
}

/** Canonical bearer for API / socket / feed auth. */
export async function getSessionToken(): Promise<string | null> {
  return TokenUtils.getAuthToken();
}

/** Persist backend JWT to all slots (AsyncStorage + SecureStore). */
export async function storeSessionToken(token: string): Promise<void> {
  await TokenUtils.storeAuthToken(token);
  markBackendSessionPresent();
}

/**
 * Full local sign-out wipe (tokens + user blob).
 * Callers that also have Clerk should `signOut()` Clerk after this.
 */
export async function clearBackendSession(): Promise<void> {
  try {
    const { flushFeedEvents, resetFeedSession } = await import(
      "../../src/shared/feed/feedRanker"
    );
    await flushFeedEvents();
    resetFeedSession();
  } catch {
    // continue
  }
  clearBackendSessionPresent();
  const { clearLocalSessionState } = await import("./sessionExpired");
  await clearLocalSessionState();
}

export { TokenUtils };
