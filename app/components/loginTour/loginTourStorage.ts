import { appMmkv } from "../../../src/shared/cache/mmkvStorage";

const DEVICE_PENDING = "login-tour-pending-v2";
const BIND_SEEN = "login-tour-bind-seen-v2";
const SEEN_PREFIX = "login-tour-v2:";
const LEGACY_SEEN_PREFIX = "login-tour-v1:";
const USER_PENDING_PREFIX = "login-tour-pending-v2:";
/** Last-chance only — signup pending is the source of truth. */
const NEW_ACCOUNT_MS = 3 * 24 * 60 * 60 * 1000;

function userPendingKey(userId: string): string {
  return `${USER_PENDING_PREFIX}${userId}`;
}

function seenKey(userId: string): string {
  return `${SEEN_PREFIX}${userId}`;
}

function legacySeenKey(userId: string): string {
  return `${LEGACY_SEEN_PREFIX}${userId}`;
}

export function markLoginTourPending(userId?: string | null): void {
  try {
    const id = String(userId || "").trim();
    if (id) {
      appMmkv.set(userPendingKey(id), "1");
      return;
    }
    appMmkv.set(DEVICE_PENDING, "1");
  } catch {
    // no-op
  }
}

export function claimLoginTourPending(userId?: string | null): void {
  const id = String(userId || "").trim();
  if (!id) return;
  try {
    if (appMmkv.getString(DEVICE_PENDING) === "1") {
      appMmkv.set(userPendingKey(id), "1");
      appMmkv.remove(DEVICE_PENDING);
    }
  } catch {
    // no-op
  }
}

export function hasSeenLoginTour(userId?: string | null): boolean {
  const id = String(userId || "").trim();
  if (!id) return false;
  try {
    return (
      appMmkv.getString(seenKey(id)) === "1" ||
      appMmkv.getString(legacySeenKey(id)) === "1"
    );
  } catch {
    return false;
  }
}

/** Skip before profile id landed — stamp seen onto the next hydrated user. */
export function markLoginTourBindSeen(): void {
  try {
    appMmkv.set(BIND_SEEN, "1");
    appMmkv.remove(DEVICE_PENDING);
  } catch {
    // no-op
  }
}

export function consumeLoginTourBindSeen(userId?: string | null): boolean {
  const id = String(userId || "").trim();
  try {
    if (appMmkv.getString(BIND_SEEN) !== "1") return false;
    if (id) {
      appMmkv.set(seenKey(id), "1");
      appMmkv.remove(userPendingKey(id));
    }
    appMmkv.remove(BIND_SEEN);
    appMmkv.remove(DEVICE_PENDING);
    return true;
  } catch {
    return false;
  }
}

export function markLoginTourSeen(userId?: string | null): void {
  try {
    const id = String(userId || "").trim();
    if (id) {
      appMmkv.set(seenKey(id), "1");
      appMmkv.remove(userPendingKey(id));
      appMmkv.remove(DEVICE_PENDING);
      appMmkv.remove(BIND_SEEN);
      return;
    }
    markLoginTourBindSeen();
  } catch {
    // no-op
  }
}

export function isNewAccount(createdAt?: string | null): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < NEW_ACCOUNT_MS;
}

function isUserPending(userId: string): boolean {
  try {
    return appMmkv.getString(userPendingKey(userId)) === "1";
  } catch {
    return false;
  }
}

function isDevicePending(): boolean {
  try {
    return appMmkv.getString(DEVICE_PENDING) === "1";
  } catch {
    return false;
  }
}

export function shouldShowLoginTour(user: {
  _id?: string;
  id?: string;
  createdAt?: string;
} | null): boolean {
  const userId = String(user?._id || user?.id || "").trim();
  if (userId && hasSeenLoginTour(userId)) return false;
  if (userId && isUserPending(userId)) return true;
  if (isDevicePending()) return true;
  if (!userId) return false;
  return isNewAccount(user?.createdAt);
}
